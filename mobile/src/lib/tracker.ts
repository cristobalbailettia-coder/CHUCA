import { db } from './db'
import { haversine } from './geo'
import type { TrackPoint } from './types'

export interface TrackerConfig {
  /** Intervalo mínimo entre puntos guardados (ms). */
  minIntervalMs: number
  /** Desplazamiento mínimo para guardar un punto antes del intervalo máximo (m). */
  minDistanceM: number
  /** Sin movimiento, se guarda igual cada tanto (ms) para evidenciar presencia. */
  maxIntervalMs: number
  /** Descarta lecturas con precisión peor a este valor (m). */
  maxAccuracyM: number
}

export const DEFAULT_CONFIG: TrackerConfig = {
  minIntervalMs: 10_000,
  minDistanceM: 8,
  maxIntervalMs: 60_000,
  maxAccuracyM: 60,
}

export type TrackerListener = (state: {
  point: TrackPoint | null
  distanceM: number
  count: number
  error?: string
}) => void

/**
 * Rastreo GPS offline: usa watchPosition (no requiere internet) y persiste cada
 * punto aceptado directamente en IndexedDB.
 */
export class GpsTracker {
  private watchId: number | null = null
  private starting = false
  private gen = 0 // se incrementa en cada start()/stop() para descartar llamadas obsoletas
  private wakeLock: WakeLockSentinel | null = null
  private last: TrackPoint | null = null
  private distanceM = 0
  private count = 0
  private patrolId: string | null = null
  private writeChain: Promise<unknown> = Promise.resolve()

  constructor(
    private listener: TrackerListener,
    private config: TrackerConfig = DEFAULT_CONFIG,
  ) {}

  async start(patrolId: string) {
    if (this.watchId !== null || this.starting) return
    if (!('geolocation' in navigator)) {
      this.listener({ point: null, distanceM: 0, count: 0, error: 'Este dispositivo no tiene GPS disponible.' })
      return
    }
    this.starting = true
    this.patrolId = patrolId
    const gen = ++this.gen

    // Reanudar: recuperar el estado de los puntos ya guardados.
    const existing = await db.points.where('patrolId').equals(patrolId).sortBy('timestamp')
    const prevDistance = (await db.patrols.get(patrolId))?.distanceM ?? 0
    if (this.gen !== gen) return // se llamó a stop() mientras tanto
    this.count = existing.length
    this.last = existing.at(-1) ?? null
    this.distanceM = prevDistance
    this.emit()

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onPosition(pos),
      (err) =>
        this.emit(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívelo en el navegador.'
            : 'No se pudo obtener la ubicación. Buscando señal…',
        ),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    )
    this.starting = false
    await this.acquireWakeLock()
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  async stop() {
    const gen = ++this.gen
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId)
    this.watchId = null
    this.starting = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    await this.wakeLock?.release().catch(() => {})
    this.wakeLock = null
    await this.writeChain // garantiza que todos los puntos quedaron escritos
    if (this.gen === gen) this.patrolId = null // si hubo un start() nuevo, no pisarlo
  }

  /** Posición para vincular evidencias: último punto reciente, o una lectura puntual. */
  async currentFix(maxAgeMs = 30_000): Promise<{ lat: number; lng: number } | null> {
    if (this.last && Date.now() - this.last.timestamp < maxAgeMs) return { lat: this.last.lat, lng: this.last.lng }
    const fresh = await new Promise<GeolocationPosition | null>((resolve) =>
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 60_000,
      }),
    )
    if (fresh) return { lat: fresh.coords.latitude, lng: fresh.coords.longitude }
    return this.last ? { lat: this.last.lat, lng: this.last.lng } : null
  }

  private onPosition(pos: GeolocationPosition) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords
    const timestamp = pos.timestamp || Date.now()
    if (!this.patrolId || accuracy > this.config.maxAccuracyM) return

    const prev = this.last
    if (prev) {
      const dt = timestamp - prev.timestamp
      const dist = haversine(prev.lat, prev.lng, lat, lng)
      if (dt < this.config.minIntervalMs) return
      if (dist < this.config.minDistanceM && dt < this.config.maxIntervalMs) return
      // Ruido de GPS: saltos físicamente imposibles (> 50 m/s).
      if (dt > 0 && dist / (dt / 1000) > 50) return
      this.distanceM += dist
    }

    const patrolId = this.patrolId
    const distanceM = this.distanceM
    const point: TrackPoint = { patrolId, lat, lng, accuracy, timestamp }
    this.last = point
    this.count++
    // Escrituras serializadas: ningún punto se pierde si se termina el recorrido enseguida.
    this.writeChain = this.writeChain.then(() =>
      db.transaction('rw', db.points, db.patrols, async () => {
        await db.points.add(point)
        await db.patrols.update(patrolId, { distanceM })
      }),
    )
    this.emit()
  }

  private emit(error?: string) {
    this.listener({ point: this.last, distanceM: this.distanceM, count: this.count, error })
  }

  private async acquireWakeLock() {
    try {
      this.wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      /* no soportado o denegado: se ignora */
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && this.watchId !== null) void this.acquireWakeLock()
  }
}

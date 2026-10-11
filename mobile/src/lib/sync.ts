import { db, newCode } from './db'
import { supabase } from './supabase'
import type { Evidence, Patrol, TrackPoint } from './types'

const iso = (t: number) => new Date(t).toISOString()
const baseMime = (m?: string) => (m ?? 'application/octet-stream').split(';')[0]
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
}

async function must(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p
  if (error) throw new Error(error.message)
}

async function currentUid(patrol: Patrol) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Sin sesión activa: inicie sesión con internet para enviar.')
  if (session.user.id !== patrol.userId) throw new Error('El recorrido pertenece a otro usuario.')
  return session.user.id
}

/** Crea o actualiza la fila del recorrido. Si el código choca con otro (muy raro), genera uno nuevo. */
async function upsertPatrol(patrol: Patrol, uid: string, finished: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = patrol.code ?? newCode()
    if (!patrol.code) {
      patrol.code = code
      await db.patrols.update(patrol.id, { code })
    }
    const { error } = await supabase.from('patrols').upsert({
      id: patrol.id,
      user_id: uid,
      community_id: patrol.communityId,
      started_at: iso(patrol.startedAt),
      ended_at: finished && patrol.endedAt ? iso(patrol.endedAt) : null,
      distance_m: patrol.distanceM,
      code,
      custodian_id: patrol.custodianId ?? null,
    })
    if (!error) return
    if (error.code === '23505' && error.message.includes('code')) {
      patrol.code = undefined // código repetido: se regenera
      await db.patrols.update(patrol.id, { code: undefined })
      continue
    }
    throw new Error(error.message)
  }
  throw new Error('No se pudo asignar un código de recorrido')
}

async function uploadPoints(patrolId: string, points: TrackPoint[]) {
  for (let i = 0; i < points.length; i += 500) {
    const rows = points.slice(i, i + 500).map((p) => ({
      patrol_id: patrolId,
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy,
      ts: iso(p.timestamp),
    }))
    await must(supabase.from('track_points').upsert(rows, { onConflict: 'patrol_id,ts', ignoreDuplicates: true }))
  }
}

const evidenceRow = (e: Evidence, patrolId: string, uid: string, mediaPath: string | null) => ({
  id: e.id,
  patrol_id: patrolId,
  user_id: uid,
  type: e.type,
  category: e.category ?? null,
  text: e.text ?? null,
  lat: e.lat,
  lng: e.lng,
  ts: iso(e.timestamp),
  media_path: mediaPath,
  mime_type: e.blob ? baseMime(e.mimeType ?? e.blob.type) : null,
})

/** Sube un recorrido terminado completo. Es idempotente: se puede repetir sin duplicar datos. */
async function uploadPatrol(patrol: Patrol, points: TrackPoint[], evidences: Evidence[]) {
  const uid = await currentUid(patrol)
  await upsertPatrol(patrol, uid, true)
  await uploadPoints(patrol.id, points)

  const rows = []
  for (const e of evidences) {
    let mediaPath: string | null = null
    if (e.blob) {
      const mime = baseMime(e.mimeType ?? e.blob.type)
      mediaPath = `${uid}/${patrol.id}/${e.id}.${EXT[mime] ?? 'bin'}`
      if (e.syncStatus !== 'synced') {
        await must(supabase.storage.from('evidences').upload(mediaPath, e.blob, { contentType: mime, upsert: true }))
      }
    }
    rows.push(evidenceRow(e, patrol.id, uid, mediaPath))
  }
  if (rows.length) await must(supabase.from('evidences').upsert(rows))

  // Evidencias borradas en el teléfono tras un envío previo.
  const del = supabase.from('evidences').delete().eq('patrol_id', patrol.id)
  await must(rows.length ? del.not('id', 'in', `(${rows.map((r) => r.id).join(',')})`) : del)
}

let liveRunning = false

/**
 * Envío en vivo de un recorrido en curso: crea la fila del recorrido, sube los puntos GPS nuevos y
 * las alertas SOS pendientes. Así el equipo puede ver la ruta y el SOS sin esperar a que termine.
 */
export async function syncLive(patrolId: string) {
  if (liveRunning || !navigator.onLine) return
  liveRunning = true
  try {
    const patrol = await db.patrols.get(patrolId)
    if (!patrol || patrol.status !== 'active') return
    const uid = await currentUid(patrol)
    await upsertPatrol(patrol, uid, false)

    const from = patrol.pointsSynced ?? 0
    const fresh = (await db.points.where('patrolId').equals(patrolId).toArray()).filter((p) => (p.id ?? 0) > from).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    if (fresh.length) {
      await uploadPoints(patrolId, fresh)
      await db.patrols.update(patrolId, { pointsSynced: fresh[fresh.length - 1].id })
    }

    const sos = (await db.evidences.where('patrolId').equals(patrolId).toArray()).filter((e) => e.type === 'sos' && e.syncStatus !== 'synced')
    if (sos.length) {
      await must(supabase.from('evidences').upsert(sos.map((e) => evidenceRow(e, patrolId, uid, null))))
      await Promise.all(sos.map((e) => db.evidences.update(e.id, { syncStatus: 'synced' })))
    }
  } catch (err) {
    console.warn('[sync] envío en vivo pendiente', err)
  } finally {
    liveRunning = false
  }
}

let running = false

/** Envía los recorridos terminados que sigan pendientes. Devuelve cuántos se sincronizaron. */
export async function syncPending(): Promise<number> {
  if (running || !navigator.onLine) return 0
  running = true
  let done = 0
  try {
    const pending = await db.patrols.where('status').equals('finished').and((p) => p.syncStatus !== 'synced').toArray()
    for (const patrol of pending) {
      try {
        const [points, evidences] = await Promise.all([
          db.points.where('patrolId').equals(patrol.id).sortBy('timestamp'),
          db.evidences.where('patrolId').equals(patrol.id).toArray(),
        ])
        await uploadPatrol(patrol, points, evidences)
        await db.transaction('rw', db.patrols, db.evidences, async () => {
          await db.patrols.update(patrol.id, { syncStatus: 'synced' })
          await db.evidences.where('patrolId').equals(patrol.id).modify({ syncStatus: 'synced' })
        })
        done++
        // Gemini resume los audios y textos del recorrido (si no hay clave configurada, no hace nada).
        void supabase.functions.invoke('summarize-report', { body: { patrol_id: patrol.id } }).catch(() => {})
      } catch (err) {
        console.error('[sync] falló el envío del recorrido', patrol.id, err)
        await db.patrols.update(patrol.id, { syncStatus: 'error' })
      }
    }
  } finally {
    running = false
  }
  return done
}

/** Auto-sincroniza al recuperar conexión y cada 30 s. Devuelve la función de limpieza. */
export function startAutoSync() {
  const run = () => void syncPending()
  window.addEventListener('online', run)
  const timer = setInterval(run, 30_000)
  run()
  return () => {
    window.removeEventListener('online', run)
    clearInterval(timer)
  }
}

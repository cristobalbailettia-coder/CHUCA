import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { fmtClock, fmtKm } from '../../lib/format'
import type { Patrol } from '../../lib/types'
import { BottomSheet, Icon, Toast } from './ui'

/** Pantalla 2: durante el recorrido (4 botones grandes + terminar). */
export default function PatrolScreen({
  patrol,
  distanceM,
  gpsOk,
  gpsError,
  online,
  toast,
  openSos,
  onCamera,
  onAudio,
  onNote,
  onSos,
  onMap,
  onFinish,
}: {
  patrol: Patrol
  distanceM: number
  gpsOk: boolean
  gpsError?: string
  online: boolean
  toast?: { text: string; icon?: string; tone?: 'ok' | 'error' }
  openSos: boolean
  onCamera: () => void
  onAudio: () => void
  onNote: () => void
  onSos: () => void
  onMap: () => void
  onFinish: () => void
}) {
  const [now, setNow] = useState(Date.now())
  const [sheet, setSheet] = useState<'sos' | 'finish' | null>(openSos ? 'sos' : null)
  const counts = useLiveQuery(async () => {
    const evs = await db.evidences.where('patrolId').equals(patrol.id).toArray()
    return { photos: evs.filter((e) => e.type === 'photo').length, audios: evs.filter((e) => e.type === 'audio').length, notes: evs.filter((e) => e.type === 'note').length, sos: evs.filter((e) => e.type === 'sos').length, total: evs.length }
  }, [patrol.id])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const c = counts ?? { photos: 0, audios: 0, notes: 0, sos: 0, total: 0 }
  const banner = !online ? 'SIN INTERNET · Todo se guarda en el teléfono' : gpsError ? 'GPS SIN PERMISO · Active la ubicación' : !gpsOk ? 'BUSCANDO SEÑAL GPS…' : ''
  const tile = 'flex h-full min-h-[90px] select-none flex-col items-center justify-center rounded-xl p-space-xs text-center shadow-md transition-transform active:scale-[0.97]'

  return (
    <div className="relative flex h-full flex-col bg-surface text-on-surface">
      <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary shadow-[0_4px_16px_rgba(0,34,24,0.18)]">
        <div className="flex h-14 items-center justify-between gap-space-sm px-margin">
          <div className="flex items-center gap-space-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-secondary-container shadow-sm ring-2 ring-primary-fixed-dim">
              <Icon name="shield_person" size={22} />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary-fixed">CUSTODIO ACTIVO</span>
              <span className="max-w-[190px] truncate text-[13px] font-extrabold tracking-wide text-white">{patrol.custodianName}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-secondary-container/20 bg-primary/40 px-2.5 py-1">
            <Icon name="forest" size={18} className="text-secondary-container" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-fixed">CHUCA</span>
          </div>
        </div>
      </header>

      {banner && (
        <div className="flex h-12 shrink-0 items-center justify-center gap-2 bg-[#D97706] px-margin text-body-sm font-bold text-black">
          <Icon name={online ? 'satellite_alt' : 'cloud_off'} size={22} /> {banner}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col justify-between px-margin pb-safe">
        <div className="flex h-full flex-col justify-between py-space-xs">
          <section className="flex h-14 shrink-0 select-none items-center justify-between gap-space-xs rounded-xl bg-primary p-space-xs px-space-sm text-on-primary shadow-md">
            <div className="flex items-center gap-space-xs">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-secondary" />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-fixed">Tiempo</span>
                <span className="tnum inline-block min-w-[86px] text-[20px] font-extrabold leading-none tracking-tight text-white">{fmtClock(now - patrol.startedAt)}</span>
              </div>
            </div>
            <div className="h-7 w-px bg-primary-container" />
            <div className="flex items-center gap-1 text-secondary-container">
              <Icon name="directions_walk" size={20} />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-fixed">Distancia</span>
                <span className="tnum inline-block min-w-[64px] text-[16px] font-bold leading-none text-secondary-container">{fmtKm(distanceM)}</span>
              </div>
            </div>
            <div className="h-7 w-px bg-primary-container" />
            <button type="button" onClick={onMap} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-secondary-container/30 bg-primary-container/80 px-2 py-1 text-left transition-all hover:bg-primary-container active:scale-[0.96]">
              <Icon name="map" size={20} className="text-secondary-container" />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-fixed">GPS</span>
                <span className="flex items-center text-[9px] font-bold tracking-tight text-secondary-container">Ver Mapa &gt;</span>
              </div>
            </button>
          </section>

          <section className="my-space-xs grid w-full flex-grow grid-cols-2 items-stretch gap-space-sm">
            <button onClick={onCamera} className={`${tile} bg-secondary text-on-secondary`}>
              <div className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest/20">
                <Icon name="photo_camera" size={32} className="text-white" />
              </div>
              <span className="text-[18px] font-extrabold leading-tight tracking-wide text-white">CÁMARA</span>
              <span className="text-[12px] font-medium text-surface-container-low">Tomar Foto</span>
            </button>
            <button onClick={onAudio} className={`${tile} bg-primary-container text-on-primary`}>
              <div className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest/15">
                <Icon name="mic" size={32} className="text-secondary-container" />
              </div>
              <span className="text-[18px] font-extrabold leading-tight tracking-wide text-white">AUDIO</span>
              <span className="text-[12px] font-medium text-primary-fixed">Grabar Voz</span>
            </button>
            <button onClick={onNote} className={`${tile} bg-tertiary-fixed text-on-tertiary-fixed`}>
              <div className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-on-tertiary-fixed/10">
                <Icon name="edit_note" size={32} className="text-on-tertiary-fixed" />
              </div>
              <span className="text-[18px] font-extrabold leading-tight tracking-wide text-on-tertiary-fixed">NOTA</span>
              <span className="text-[12px] font-semibold text-on-tertiary-fixed-variant">Categoría / Nota</span>
            </button>
            <button onClick={() => setSheet('sos')} className={`${tile} bg-gradient-to-r from-error via-error to-on-error-container text-on-error shadow-xl`}>
              <div className="mb-0.5 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-surface-container-lowest/25">
                <Icon name="emergency" size={34} fill className="text-white" />
              </div>
              <span className="text-[18px] font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow">SOS ALERTA</span>
              <span className="text-[12px] font-bold text-error-container">Emergencia Crítica</span>
            </button>
          </section>

          <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-space-sm py-1.5 shadow-sm">
            <div className="flex min-w-0 items-center gap-space-xs">
              <Icon name="inventory_2" size={20} className="text-primary" />
              <span className="shrink-0 text-[13px] font-bold text-on-surface">{c.total} Guardadas:</span>
              <span className="flex items-center gap-1 truncate text-[12px] font-medium text-on-surface-variant">
                <Icon name="image" size={16} className="text-secondary" />
                {c.photos} <Icon name="mic" size={16} className="text-primary-container" />
                {c.audios} <Icon name="edit_note" size={16} className="text-on-tertiary-fixed-variant" />
                {c.notes}
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-secondary-container px-space-xs py-0.5 text-[11px] font-bold text-on-secondary-container">{online ? 'Listas' : 'En el teléfono'}</span>
          </div>

          <div className="pt-space-xs">
            <button onClick={() => setSheet('finish')} className="flex min-h-[56px] w-full select-none items-center justify-center gap-space-sm rounded-xl bg-inverse-surface px-space-md py-space-xs text-inverse-on-surface shadow-lg transition-transform active:scale-[0.98]">
              <Icon name="stop_circle" size={26} className="text-white" />
              <span className="text-[16px] font-extrabold uppercase tracking-wide text-white">TERMINAR RECORRIDO</span>
            </button>
          </div>
        </div>
      </main>

      {toast && <Toast {...toast} />}

      {sheet === 'sos' && (
        <BottomSheet tone="emergency" onClose={() => setSheet(null)}>
          <div className="flex flex-col items-center gap-space-sm text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error-container">
              <Icon name="emergency" size={48} fill className="text-error" />
            </div>
            <h2 className="text-headline-md text-on-surface">¿Enviar alerta SOS?</h2>
            <p className="text-body-md text-on-surface-variant">Se avisará a la central con su ubicación exacta.</p>
          </div>
          <div className="mt-space-md flex flex-col gap-space-sm">
            <button
              onClick={() => {
                setSheet(null)
                onSos()
              }}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-[#991B1B] bg-[#DC2626] text-label-action text-white shadow-lg transition-transform active:translate-y-0.5"
            >
              <Icon name="emergency" size={28} fill /> SÍ, ENVIAR SOS
            </button>
            <button onClick={() => setSheet(null)} className="h-16 w-full rounded-xl bg-surface-container-high text-label-action text-on-surface">
              CANCELAR
            </button>
          </div>
        </BottomSheet>
      )}

      {sheet === 'finish' && (
        <BottomSheet tone="primary" onClose={() => setSheet(null)}>
          <div className="flex flex-col items-center gap-space-sm text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed">
              <Icon name="flag" size={44} fill className="text-primary-container" />
            </div>
            <h2 className="text-headline-md text-on-surface">¿Terminar el recorrido?</h2>
            <p className="text-body-md text-on-surface-variant">Se guardará el reporte con todo lo que registró.</p>
          </div>
          <div className="mt-space-md flex flex-col gap-space-sm">
            <button
              onClick={() => {
                setSheet(null)
                onFinish()
              }}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-label-action text-white shadow-lg active:translate-y-0.5"
            >
              <Icon name="check_circle" size={28} /> SÍ, TERMINAR
            </button>
            <button onClick={() => setSheet(null)} className="h-16 w-full rounded-xl bg-surface-container-high text-label-action text-on-surface">
              SEGUIR PATRULLANDO
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

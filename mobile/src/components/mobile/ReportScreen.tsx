import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import { useOnline } from '../../hooks/useOnline'
import { db } from '../../lib/db'
import { fmtDur, fmtHour, fmtKm1 } from '../../lib/format'
import type { Evidence } from '../../lib/types'
import NoteScreen from './NoteScreen'
import { BottomSheet, Icon } from './ui'

const BARS = [8, 14, 22, 12, 18, 26, 10, 16, 20, 9]

function Thumb({ blob }: { blob?: Blob }) {
  const url = useBlobUrl(blob)
  return url ? <img src={url} alt="Foto" className="h-full w-full object-cover" /> : null
}

function AudioRow({ e, n, canEdit }: { e: Evidence; n: number; canEdit: boolean }) {
  const url = useBlobUrl(e.blob)
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [dur, setDur] = useState<number>()
  return (
    <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
        <Icon name="mic" fill />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold uppercase text-secondary">AUDIO #{String(n).padStart(2, '0')}{dur ? ` (${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, '0')})` : ''}</div>
        <div className="mt-1 flex items-center gap-[3px]">
          {BARS.map((h, i) => (
            <span key={i} className={`w-[3px] rounded-full ${playing ? 'animate-pulse bg-secondary' : i < 6 ? 'bg-primary-container' : 'bg-outline-variant'}`} style={{ height: h }} />
          ))}
        </div>
      </div>
      <button
        disabled={!url}
        onClick={() => (playing ? audio.current?.pause() : void audio.current?.play())}
        className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-surface-container-high px-4 text-body-sm font-bold text-on-surface active:scale-95 disabled:opacity-50"
      >
        <Icon name={playing ? 'pause' : 'play_arrow'} size={22} /> {playing ? 'Pausa' : 'Play'}
      </button>
      {canEdit && <span className="sr-only">editable</span>}
      {url && (
        <audio ref={audio} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={(ev) => Number.isFinite(ev.currentTarget.duration) && setDur(ev.currentTarget.duration)} />
      )}
    </div>
  )
}

/** Pantalla 3: reporte finalizado, con lo recopilado para ver o editar. */
export default function ReportScreen({
  patrolId,
  accuracy,
  community,
  onHome,
  onMap,
}: {
  patrolId: string
  accuracy: number | null
  community: string
  onHome: () => void
  onMap: () => void
}) {
  const online = useOnline()
  const patrol = useLiveQuery(() => db.patrols.get(patrolId), [patrolId])
  const evidences = useLiveQuery(() => db.evidences.where('patrolId').equals(patrolId).sortBy('timestamp'), [patrolId])
  const pointCount = useLiveQuery(() => db.points.where('patrolId').equals(patrolId).count(), [patrolId]) ?? 0
  const [photo, setPhoto] = useState<Evidence>()
  const [editing, setEditing] = useState<Evidence>()
  const [copied, setCopied] = useState(false)
  const photoUrl = useBlobUrl(photo?.blob)
  if (!patrol) return null

  const touch = () => db.patrols.update(patrolId, { syncStatus: 'pending' }) // se reenvía con el cambio
  const synced = patrol.syncStatus === 'synced'
  const c = { photo: 0, audio: 0, note: 0, sos: 0 }

  return (
    <div className="relative flex h-full flex-col bg-surface text-on-surface">
      <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary shadow-[0_4px_16px_rgba(0,34,24,0.18)]">
        <div className="flex h-14 items-center gap-space-sm px-margin">
          <button onClick={onHome} aria-label="Volver al inicio" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary active:scale-95">
            <Icon name="arrow_back" />
          </button>
          <Icon name="shield" fill size={22} className="text-secondary-container" />
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-wide text-primary-fixed">CUSTODIO ACTIVO</div>
            <div className="truncate text-body-md font-extrabold text-white">{patrol.custodianName}</div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-margin pb-space-md pt-space-md">
        <div className="mb-space-md flex items-center gap-space-sm rounded-xl border border-secondary/30 bg-secondary-container/60 p-space-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
            <Icon name="check" size={30} />
          </div>
          <div>
            <div className="text-[12px] font-bold uppercase text-secondary">ÉXITO</div>
            <div className="text-body-lg font-extrabold leading-tight text-on-secondary-container">Reporte finalizado con éxito</div>
          </div>
        </div>

        <section className="mb-space-md rounded-xl bg-surface-container-lowest p-space-sm shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-body-lg font-extrabold">
            <Icon name="route" size={24} className="text-secondary" /> Resumen de Vigilancia
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-container-low p-2">
              <Icon name="timer" size={22} className="text-secondary" />
              <div className="text-[11px] uppercase text-on-surface-variant">TIEMPO</div>
              <div className="tnum text-[18px] font-extrabold">{fmtDur((patrol.endedAt ?? Date.now()) - patrol.startedAt)}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-2">
              <Icon name="straighten" size={22} className="text-secondary" />
              <div className="text-[11px] uppercase text-on-surface-variant">DISTANCIA</div>
              <div className="tnum text-[18px] font-extrabold">{fmtKm1(patrol.distanceM)}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-2">
              <Icon name="location_on" size={22} className="text-secondary" />
              <div className="text-[11px] uppercase text-on-surface-variant">PUNTOS GPS</div>
              <div className="tnum text-[18px] font-extrabold">{pointCount}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold uppercase ${synced ? 'bg-secondary-container text-on-secondary-container' : 'bg-[#fde68a] text-[#92400e]'}`}>
              <Icon name={synced ? 'cloud_done' : online ? 'cloud_sync' : 'cloud_off'} size={18} /> {synced ? 'SINCRONIZADO' : online ? 'ENVIANDO…' : 'MODO OFFLINE'}
            </span>
            {patrol.code && (
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(patrol.code!).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1800)
                  })
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-[13px] font-bold text-on-surface active:scale-95"
              >
                <Icon name="tag" size={18} /> <span className="tnum">{patrol.code}</span> <Icon name={copied ? 'check' : 'content_copy'} size={16} />
              </button>
            )}
          </div>
          <button onClick={onMap} className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface-container text-body-md font-extrabold text-primary-container active:scale-[0.98]">
            <Icon name="map" size={24} /> VER MAPA DEL RECORRIDO
          </button>
        </section>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-body-lg font-extrabold">Evidencias Recopiladas</h2>
          <span className="text-[13px] font-bold uppercase text-on-surface-variant">{evidences?.length ?? 0} ELEMENTOS</span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {evidences?.length === 0 && <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-md text-on-surface-variant">No se registraron evidencias en este recorrido.</p>}
          {evidences?.map((e) => {
            const n = ++c[e.type]
            if (e.type === 'audio') return <AudioRow key={e.id} e={e} n={n} canEdit />
            return (
              <div key={e.id} className="flex items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-sm">
                {e.type === 'photo' ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    <Thumb blob={e.blob} />
                  </div>
                ) : (
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${e.type === 'sos' ? 'bg-error-container text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    <Icon name={e.type === 'sos' ? 'emergency' : 'description'} fill={e.type === 'sos'} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {e.type === 'photo' && (
                    <>
                      <div className="text-body-lg font-extrabold">Foto #{String(n).padStart(2, '0')}</div>
                      <div className="text-body-sm text-on-surface-variant">Tomada a las {fmtHour(e.timestamp)}</div>
                    </>
                  )}
                  {e.type === 'note' && (
                    <>
                      <div className="text-[12px] font-bold uppercase text-on-surface-variant">NOTA ESCRITA{e.category ? ` · ${e.category.toUpperCase()}` : ''}</div>
                      <div className="truncate text-body-md font-bold">{e.text || 'Sin texto'}</div>
                    </>
                  )}
                  {e.type === 'sos' && (
                    <>
                      <div className="text-body-lg font-extrabold text-error">Alerta SOS</div>
                      <div className="text-body-sm text-on-surface-variant">Enviada a las {fmtHour(e.timestamp)}</div>
                    </>
                  )}
                </div>
                {e.type === 'photo' && (
                  <button onClick={() => setPhoto(e)} className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-surface-container-high px-3 text-body-sm font-bold active:scale-95">
                    <Icon name="visibility" size={22} /> Ver
                  </button>
                )}
                {e.type === 'note' && (
                  <button onClick={() => setEditing(e)} aria-label="Editar nota" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-high active:scale-95">
                    <Icon name="edit_note" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <footer className="shrink-0 px-margin pb-safe pt-space-xs">
        <button onClick={onHome} className="mb-2 flex h-16 w-full items-center justify-center gap-space-sm rounded-xl bg-primary-container text-label-action text-white shadow-lg active:translate-y-0.5">
          <Icon name="home" size={28} fill /> VOLVER AL INICIO
        </button>
      </footer>

      {photo && (
        <BottomSheet tone="primary" onClose={() => setPhoto(undefined)}>
          <h3 className="mb-2 text-headline-md">Fotografía</h3>
          {photoUrl && <img src={photoUrl} alt="Foto" className="mb-3 max-h-80 w-full rounded-xl object-cover" />}
          <div className="grid grid-cols-2 gap-space-sm">
            <button
              onClick={async () => {
                if (confirm('¿Borrar esta foto?')) {
                  await db.evidences.delete(photo.id)
                  await touch()
                  setPhoto(undefined)
                }
              }}
              className="h-14 rounded-xl bg-error-container text-body-md font-extrabold text-on-error-container"
            >
              BORRAR
            </button>
            <button onClick={() => setPhoto(undefined)} className="h-14 rounded-xl bg-surface-container-high text-body-md font-extrabold">
              CERRAR
            </button>
          </div>
        </BottomSheet>
      )}

      {editing && (
        <div className="absolute inset-0 z-[70]">
          <NoteScreen
            noteNo={(evidences ?? []).filter((x) => x.type === 'note').findIndex((x) => x.id === editing.id) + 1}
            accuracy={accuracy}
            community={community}
            initial={{ category: editing.category, text: editing.text ?? '' }}
            onCancel={() => setEditing(undefined)}
            onSave={async (v) => {
              await db.evidences.update(editing.id, { category: v.category, text: v.text, syncStatus: 'pending' })
              await touch()
              setEditing(undefined)
            }}
          />
        </div>
      )}
    </div>
  )
}

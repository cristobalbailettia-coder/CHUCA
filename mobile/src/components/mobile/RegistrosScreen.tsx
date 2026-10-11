import { useState } from 'react'
import type { Session } from '../../lib/auth'
import { useRegistros, type Registro } from '../../hooks/useCommunity'
import { fmtDateLong, fmtDur, fmtHour, fmtKm1 } from '../../lib/format'
import { Icon } from './ui'

function Card({ r, onOpen }: { r: Registro; onOpen?: () => void }) {
  const sos = r.sos > 0
  const total = r.photos + r.audios + r.notes + r.sos
  const chip = 'inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-2.5 py-1 text-[14px] font-semibold'
  const Wrap = onOpen ? 'button' : 'div'
  return (
    <Wrap onClick={onOpen} className={`flex w-full gap-0 overflow-hidden rounded-xl border-2 bg-surface-container-lowest text-left shadow-sm ${sos ? 'border-[#f1b9b5]' : 'border-outline-variant/50'}`}>
      <div className={`w-2 shrink-0 ${sos ? 'bg-[#ba1a1a]' : 'bg-secondary'}`} />
      <div className="min-w-0 flex-1 p-space-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[19px] font-extrabold leading-tight">Registro del {fmtDateLong(r.startedAt)}</h3>
          {sos ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-error-container px-3 py-1 text-[13px] font-bold text-on-error-container">
              <Icon name="warning" size={16} /> Alerta SOS Registrada
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e3eed6] px-3 py-1 text-[13px] font-bold text-secondary">
              <span className="h-2 w-2 rounded-full bg-secondary" /> Sin SOS / Normal
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
          <Icon name="person" size={18} /> Custodio: <strong className="text-on-surface">{r.name}</strong>
        </div>
        <div className="tnum mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-container-low px-3 py-2 text-[15px] font-semibold">
          <span className="flex items-center gap-1"><Icon name="timer" size={18} /> {fmtDur(r.endedAt - r.startedAt)}</span>
          <span className="flex items-center gap-1"><Icon name="route" size={18} /> {fmtKm1(r.distanceM)}</span>
          <span className="flex items-center gap-1"><Icon name="schedule" size={18} /> {fmtHour(r.startedAt)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t-2 border-outline-variant/40 pt-2 text-body-sm">
          <span className="text-on-surface-variant">{total} evidencias:</span>
          {r.photos > 0 && <span className={chip}><Icon name="photo_camera" size={16} /> {r.photos} {r.photos === 1 ? 'foto' : 'fotos'}</span>}
          {r.audios > 0 && <span className={chip}><Icon name="mic" size={16} /> {r.audios} {r.audios === 1 ? 'audio' : 'audios'}</span>}
          {r.notes > 0 && <span className={chip}><Icon name="edit_note" size={16} /> {r.notes} {r.notes === 1 ? 'nota' : 'notas'}</span>}
          {r.sos > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-[#ba1a1a] px-2.5 py-1 text-[14px] font-extrabold text-white"><Icon name="emergency" size={16} fill /> {r.sos} SOS</span>}
          {!r.local && !onOpen ? null : <Icon name="chevron_right" className="ml-auto text-on-surface-variant" />}
        </div>
      </div>
    </Wrap>
  )
}

/** Registros de patrullaje de toda la comunidad. */
export default function RegistrosScreen({ user, onBack, onOpen }: { user: Session; onBack: () => void; onOpen: (id: string) => void }) {
  const { registros, loading, online } = useRegistros(user)
  const [recent, setRecent] = useState(true)
  const [shown, setShown] = useState(20)
  const list = recent ? registros : [...registros].reverse()
  const demo = user.communityId === 'comunidad-demo'

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary shadow-[0_4px_16px_rgba(0,34,24,0.18)]">
        <div className="flex h-[76px] items-center justify-between gap-space-xs px-margin">
          <div className="flex min-w-0 items-center gap-space-sm">
            <button onClick={onBack} aria-label="Volver" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary active:scale-95">
              <Icon name="arrow_back" size={28} />
            </button>
            <div className="min-w-0 leading-tight">
              <h1 className="text-[19px] font-extrabold leading-tight text-white">Registros de Patrullaje</h1>
              <div className="flex items-center gap-1 truncate text-[14px] text-primary-fixed">
                <Icon name="forest" size={16} /> {demo ? user.communityName : `Comunidad ${user.communityName}`}
              </div>
            </div>
          </div>
          <span className="tnum flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-primary px-2.5 py-1.5 text-[13px] font-extrabold uppercase text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary-container" /> {registros.length} TOTAL
          </span>
        </div>
      </header>

      {!online && (
        <div className="flex h-12 shrink-0 items-center justify-center gap-2 bg-[#D97706] px-margin text-body-sm font-bold text-black">
          <Icon name="cloud_off" size={22} /> SIN INTERNET · Mostrando los últimos registros guardados
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-margin pb-space-lg pt-space-md">
        <div className="mb-space-md flex items-center justify-between gap-2 border-b-2 border-outline-variant/40 pb-space-sm">
          <div className="flex items-center gap-2">
            <Icon name="history" size={30} />
            <div className="leading-tight">
              <div className="text-body-lg font-extrabold">Historial de Salidas</div>
              <span className="tnum text-[13px] font-bold text-on-surface-variant">{registros.length} registros</span>
            </div>
          </div>
          <button onClick={() => setRecent(!recent)} className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-white px-3 py-2 text-[14px] font-semibold text-on-surface active:scale-95">
            <Icon name="sort" size={20} /> {recent ? 'Más recientes primero' : 'Más antiguos primero'}
          </button>
        </div>

        {loading && registros.length === 0 && <p className="py-8 text-center text-body-md text-on-surface-variant">Cargando registros…</p>}
        {!loading && registros.length === 0 && <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-md text-on-surface-variant">Todavía no hay recorridos registrados en esta comunidad.</p>}
        <div className="flex flex-col gap-space-sm">
          {list.slice(0, shown).map((r) => (
            <Card key={r.id} r={r} onOpen={r.local ? () => onOpen(r.id) : undefined} />
          ))}
        </div>
        {list.length > shown && (
          <button onClick={() => setShown(shown + 20)} className="mt-space-md h-14 w-full rounded-xl bg-surface-container-high text-body-md font-extrabold text-primary-container">
            Ver más ({list.length - shown} restantes)
          </button>
        )}
      </main>
    </div>
  )
}

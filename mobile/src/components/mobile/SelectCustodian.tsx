import { useState } from 'react'
import type { Custodian, Session } from '../../lib/auth'
import { Icon } from './ui'

/** Pantalla 1.1: ¿Quién patrulla hoy? */
export default function SelectCustodian({
  user,
  sos,
  onBack,
  onStart,
}: {
  user: Session
  sos: boolean
  onBack: () => void
  onStart: (c: Custodian) => Promise<void>
}) {
  const [sel, setSel] = useState<Custodian>()
  const [busy, setBusy] = useState(false)
  const demo = user.communityId === 'comunidad-demo'

  async function start() {
    if (!sel || busy) return
    setBusy(true)
    await onStart(sel)
  }

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary shadow-[0_4px_16px_rgba(0,34,24,0.18)]">
        <div className="flex h-14 items-center justify-between gap-space-sm px-margin">
          <div className="flex flex-1 items-center gap-space-sm">
            <button aria-label="Volver" onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-transform active:scale-95">
              <Icon name="arrow_back" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary-fixed">Custodio Rural</span>
              <h1 className="text-body-md font-bold uppercase leading-tight tracking-wide text-on-primary">{demo ? user.communityName : `COMUNIDAD ${user.communityName}`}</h1>
            </div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-secondary-container">
            <Icon name="forest" size={26} />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col bg-surface px-margin pt-space-md">
        <div className="mb-3 flex shrink-0 flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-md shadow-md">
          <div className="flex items-center gap-space-xs">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-fixed">
              <Icon name="badge" size={28} fill />
            </div>
            <h2 className="text-headline-md leading-tight text-on-surface">¿Quién Patrulla Hoy?</h2>
          </div>
          <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant">{sos ? 'Selecciona tu nombre y presiona "REPORTAR SOS"' : 'Selecciona tu nombre y presiona "EMPEZAR"'}</p>
        </div>

        <div className="mb-2 flex shrink-0 items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Icon name="how_to_reg" size={22} className="text-secondary" />
            <span className="text-label-status font-bold text-on-surface">Padrón del Comité</span>
          </div>
          <span className="rounded-full bg-surface-container-high px-3 py-1 text-body-sm font-semibold text-on-surface-variant">{user.roster.length} acreditados</span>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain pb-32 pr-1" role="radiogroup" aria-label="Listado de custodios comunitarios">
          {user.roster.length === 0 && <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-md text-on-surface-variant">No hay custodios acreditados. Conéctese a internet para descargar el padrón.</p>}
          {user.roster.map((c) => {
            const on = sel?.id === c.id
            return (
              <button
                key={c.id}
                role="radio"
                aria-checked={on}
                onClick={() => setSel(c)}
                className={`flex min-h-[64px] w-full cursor-pointer items-center justify-between rounded-xl px-space-md py-space-sm text-left text-body-lg font-bold transition-all duration-150 active:scale-[0.98] ${
                  on ? 'bg-primary-container text-white shadow-md ring-2 ring-primary-fixed-dim' : 'bg-surface-container-lowest text-on-surface shadow-sm'
                }`}
              >
                <span className="truncate">{c.name}</span>
                {on && <Icon name="check" size={26} className="ml-2 shrink-0 text-white" />}
              </button>
            )
          })}
        </div>
      </main>

      <div className="z-50 shrink-0 border-t border-outline-variant/30 bg-surface/95 px-margin pb-safe pt-3 shadow-[0_-4px_20px_rgba(0,34,24,0.12)] backdrop-blur-md">
        <button
          onClick={start}
          disabled={!sel || busy}
          className={`mb-2 flex h-16 min-h-[64px] w-full select-none items-center justify-center gap-space-sm rounded-xl text-label-action text-white shadow-lg transition-all active:scale-[0.98] ${sos ? 'bg-[#ba1a1a]' : 'bg-[#0F382C]'} ${!sel ? 'opacity-60' : ''} ${busy ? 'pointer-events-none opacity-90' : ''}`}
        >
          {busy ? (
            <>
              <Icon name="progress_activity" size={28} className="animate-spin" />
              <span className="truncate">INICIANDO CON {sel?.name.split(' ')[0].toUpperCase()}...</span>
            </>
          ) : (
            <>
              <Icon name={sos ? 'emergency' : 'directions_walk'} size={30} fill />
              <span>{sel ? (sos ? `REPORTAR SOS: ${sel.name.split(' ')[0].toUpperCase()}` : 'CONFIRMAR Y EMPEZAR') : sos ? 'REPORTAR SOS' : 'EMPEZAR'}</span>
              <Icon name="arrow_forward" size={26} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

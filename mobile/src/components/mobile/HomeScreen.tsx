import type { Session } from '../../lib/auth'
import type { Patrol } from '../../lib/types'
import { BrandBar, Icon } from './ui'

const isDemo = (s: Session) => s.communityId === 'comunidad-demo'

/** Pantalla 1: inicio de patrullaje. */
export default function HomeScreen({
  user,
  active,
  onPatrol,
  onIncident,
  onRegistros,
  onPerfil,
}: {
  user: Session
  active?: Patrol
  onPatrol: () => void
  onIncident: () => void
  onRegistros: () => void
  onPerfil: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <BrandBar />
      <main className="flex flex-1 flex-col overflow-hidden bg-surface px-margin pb-safe">
        <div className="flex h-full flex-1 flex-col justify-between gap-3 py-2">
          <button
            type="button"
            onClick={onPerfil}
            aria-label="Ver perfil de la comunidad"
            className="group flex w-full shrink-0 cursor-pointer flex-col gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-sm text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Icon name="diversity_3" fill className="shrink-0 text-primary-container" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">COMUNIDAD CAMPESINA</span>
                  <h1 className="break-words text-[17px] font-black uppercase leading-tight text-on-surface">{isDemo(user) ? user.communityName : `COMUNIDAD ${user.communityName}`}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container-high px-2 py-1 text-[12px] font-bold text-secondary">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Ver perfil</span>
                <Icon name="chevron_right" size={16} />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-high px-space-sm py-2">
              <Icon name="nature" size={22} className="shrink-0 text-secondary" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">ZONA ASIGNADA</span>
                <span className="truncate text-[14px] font-extrabold text-on-surface">{user.reserve}</span>
              </div>
            </div>
          </button>

          <div className="flex min-h-0 flex-1 flex-col">
            <button
              onClick={onPatrol}
              aria-label={active ? 'Continuar el patrullaje en curso' : 'Patrullar: seleccionar custodio'}
              className="group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl bg-primary-container p-space-md text-center text-on-primary shadow-xl ring-2 ring-primary-fixed-dim/30 transition-transform duration-100 active:scale-[0.98]"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-fixed shadow-lg">
                <Icon name="hiking" size={44} className="leading-none text-on-secondary-fixed" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[28px] font-black leading-tight tracking-wide text-on-primary">{active ? 'CONTINUAR' : 'PATRULLAR'}</span>
                <span className="mt-1 flex items-center gap-1 text-body-sm font-semibold text-primary-fixed">
                  {active ? `Recorrido en curso · ${active.custodianName ?? ''}` : 'Paso 1: Seleccionar Custodio'} <Icon name="arrow_forward" size={18} />
                </span>
              </div>
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-3 pb-2">
            <button onClick={onIncident} className="flex h-16 min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ba1a1a] px-space-sm text-on-primary shadow-md transition-transform active:scale-[0.98]">
              <Icon name="warning" size={26} />
              <span className="text-body-lg font-extrabold uppercase tracking-wide">REPORTAR INCIDENTE</span>
            </button>
            <button onClick={onRegistros} className="flex h-16 min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-tertiary-container px-space-sm text-white shadow-sm transition-transform active:scale-[0.98]">
              <Icon name="folder_shared" />
              <span className="text-body-md font-bold uppercase tracking-wide">REVISAR REGISTROS</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

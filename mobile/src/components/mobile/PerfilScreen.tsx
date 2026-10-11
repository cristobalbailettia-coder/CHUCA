import type { Session } from '../../lib/auth'
import { useRegistros } from '../../hooks/useCommunity'
import { Icon } from './ui'

/** Perfil de la comunidad: números de toda la comunidad y zona de vigilancia asignada. */
export default function PerfilScreen({ user, canLogout, onBack, onRegistros, onLogout }: { user: Session; canLogout: boolean; onBack: () => void; onRegistros: () => void; onLogout: () => void }) {
  const { registros, loading } = useRegistros(user)
  const km = registros.reduce((s, r) => s + r.distanceM, 0) / 1000
  const evidencias = registros.reduce((s, r) => s + r.photos + r.audios + r.notes + r.sos, 0)
  const demo = user.communityId === 'comunidad-demo'

  const tile = (icon: string, tag: string, tagTone: 'blue' | 'green', value: string, unit: string | undefined, label: string, top: boolean) => (
    <div className={`flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm ${top ? 'border-t-2 border-primary-container' : ''}`}>
      <div className="flex items-center justify-between">
        <Icon name={icon} className="text-secondary" />
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-extrabold uppercase ${tagTone === 'blue' ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'}`}>{tag}</span>
      </div>
      <div className="tnum mt-2 text-[34px] font-extrabold leading-none text-on-surface">
        {value}
        {unit && <span className="ml-1 text-body-lg font-bold text-on-surface-variant">{unit}</span>}
      </div>
      <div className="mt-1 text-body-sm text-on-surface-variant">{label}</div>
    </div>
  )

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary shadow-[0_4px_16px_rgba(0,34,24,0.18)]">
        <div className="flex h-14 items-center gap-space-sm px-margin">
          <button onClick={onBack} aria-label="Volver" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary active:scale-95">
            <Icon name="arrow_back" />
          </button>
          <Icon name="forest" size={28} className="text-secondary-fixed" />
          <h1 className="text-body-lg font-extrabold text-white">Perfil de la Comunidad</h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-margin pb-space-md pt-space-md">
        <section className="mb-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="text-[13px] font-extrabold uppercase text-secondary">COMUNIDAD CAMPESINA</div>
          <h2 className="my-1 break-words text-[32px] font-black uppercase leading-tight text-primary-container">{demo ? user.communityName : `COMUNIDAD ${user.communityName}`}</h2>
          <div className="flex items-center gap-1 text-body-md text-on-surface-variant">
            <Icon name="location_on" size={22} /> Bosque seco · Tumbes y Piura, Perú
          </div>
        </section>

        <div className="mb-space-md grid grid-cols-2 gap-space-sm">
          {tile('groups', 'ACTIVOS', 'blue', String(user.roster.length), undefined, 'Custodios / Patrulleros acreditados', true)}
          {tile('route', 'TOTAL', 'green', km.toLocaleString('es-PE', { maximumFractionDigits: 1 }), 'km', 'Km recorridos', false)}
          {tile('flag', 'REGISTRO', 'blue', String(registros.length), undefined, 'Patrullajes realizados', true)}
          {tile('fact_check', 'ARCHIVOS', 'green', String(evidencias), undefined, 'Evidencias registradas', false)}
        </div>
        {loading && <p className="mb-2 text-center text-body-sm text-on-surface-variant">Actualizando datos…</p>}

        <section className="mb-space-md rounded-xl bg-primary-container p-space-md text-white shadow-md">
          <div className="mb-2 flex items-center gap-2 text-[14px] font-extrabold uppercase text-secondary-container">
            <Icon name="verified_user" fill size={22} /> ZONA DE VIGILANCIA ASIGNADA
          </div>
          <div className="text-headline-md leading-snug text-white">{user.reserve}</div>
        </section>

        <button onClick={onRegistros} className="mb-space-sm flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high text-body-lg font-extrabold uppercase text-primary-container active:scale-[0.98]">
          <Icon name="manage_search" size={26} /> REVISAR REGISTROS
        </button>
        <button
          onClick={onLogout}
          disabled={!canLogout}
          className="mb-2 flex h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#e9a8a4] bg-white text-body-lg font-extrabold uppercase text-[#ba1a1a] active:scale-[0.98] disabled:opacity-40"
        >
          <Icon name="logout" size={26} /> {canLogout ? 'CERRAR SESIÓN' : 'TERMINE EL RECORRIDO PARA SALIR'}
        </button>
      </main>
    </div>
  )
}

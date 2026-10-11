import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashProvider, useDash } from '../hooks/useDash'
import { useSosAlert } from '../hooks/useSosAlert'
import { useTheme } from '../hooks/useTheme'
import { UIProvider, useUI } from '../hooks/useUI'
import { communityLabel, unreviewedSos } from '../lib/stats'
import { ago, fmtTime } from '../lib/time'
import CustodianDetail from './CustodianDetail'
import FilterBar from './FilterBar'
import ReportDetail from './ReportDetail'
import SosDetail from './SosDetail'
import { Avatar, Drawer, Icon, Logo } from './ui'

const NAV = [
  { to: '/', label: 'Inicio', sub: 'Centro de alertas', icon: 'home', end: true },
  { to: '/mapa', label: 'Mapa y cobertura', sub: 'Rutas y zonas vigiladas', icon: 'map' },
  { to: '/reportes', label: 'Reportes de patrullaje', sub: 'Lista, resúmenes y exportación', icon: 'description' },
  { to: '/sos', label: 'REPORTES SOS', sub: 'Atención de emergencias', icon: 'emergency', sos: true },
  { to: '/comunidades', label: 'Comunidades y custodios', sub: 'Fichas y comparativas', icon: 'groups' },
]

/** Notificación inline de Carbon: aviso fijo cuando hay alertas SOS nuevas; se puede cerrar con la X. */
function SosBanner({ fresh }: { fresh: string[] }) {
  const { data } = useDash()
  const [dismissed, setDismissed] = useState<string[]>([])
  const rows = useMemo(
    () => (data?.events ?? []).filter((e) => e.type === 'sos' && e.sosStatus === 'nuevo' && !dismissed.includes(e.id)).sort((a, b) => b.timestamp - a.timestamp),
    [data, dismissed],
  )
  if (!rows.length || !data) return null
  const e = rows[0]
  const com = data.communities.find((c) => c.id === e.communityId)
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 border-l-[6px] border-[#fa4d56] bg-[#a2191f] py-2 pl-4 pr-2 text-white lg:pl-8 ${fresh.length ? 'sos-ring' : ''}`}>
      <Icon name="error" size={22} fill className="pulse-dot shrink-0" />
      <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-tight">
        {rows.length === 1 ? 'Alerta SOS nueva' : `${rows.length} alertas SOS nuevas`}
        <span className="ml-2 hidden font-normal opacity-90 sm:inline">
          {e.userName} · {communityLabel(com)} · {ago(e.timestamp)}
        </span>
      </p>
      <Link to="/sos" className="bg-white px-4 py-1.5 text-[13px] font-semibold text-[#a2191f] hover:bg-white/90">
        Atender todas
      </Link>
      <button onClick={() => setDismissed((d) => [...d, ...rows.map((r) => r.id)])} aria-label="Cerrar notificación" title="Cerrar notificación" className="flex h-9 w-9 items-center justify-center hover:bg-white/15">
        <Icon name="close" size={20} />
      </button>
    </div>
  )
}

/** Campana desplegable: reportes y SOS que han llegado desde la última vez que se marcaron como leídos. */
function NotificationBell({ iconBtn }: { iconBtn: string }) {
  const { data } = useDash()
  const ui = useUI()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [seenAt, setSeenAt] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('chuca-notif-seen'))
      if (v) return v
      localStorage.setItem('chuca-notif-seen', String(Date.now()))
    } catch {
      /* sin almacenamiento */
    }
    return Date.now()
  })

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items = useMemo(() => {
    if (!data) return []
    const com = new Map(data.communities.map((c) => [c.id, c]))
    const reports = data.patrols.map((p) => ({ id: p.id, kind: 'report' as const, at: p.endedAt ?? p.startedAt, who: p.userName, community: communityLabel(com.get(p.communityId)), live: p.active }))
    const sos = data.events.filter((e) => e.type === 'sos').map((e) => ({ id: e.id, kind: 'sos' as const, at: e.timestamp, who: e.userName, community: communityLabel(com.get(e.communityId)), live: false }))
    return [...reports, ...sos].sort((a, b) => b.at - a.at)
  }, [data])
  const fresh = items.filter((i) => i.at > seenAt)
  const older = items.filter((i) => i.at <= seenAt).slice(0, 4)

  const markRead = () => {
    const now = Date.now()
    setSeenAt(now)
    try {
      localStorage.setItem('chuca-notif-seen', String(now))
    } catch {
      /* sin almacenamiento */
    }
  }
  const open_ = (i: (typeof items)[number]) => {
    setOpen(false)
    if (i.kind === 'sos') ui.openSos(i.id)
    else ui.openReport(i.id)
  }
  const row = (i: (typeof items)[number], isNew: boolean) => (
    <li key={`${i.kind}-${i.id}`}>
      <button onClick={() => open_(i)} className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left hover:bg-surface-2 ${isNew ? '' : 'opacity-70'}`}>
        <Icon name={i.kind === 'sos' ? 'error' : 'description'} size={20} fill={i.kind === 'sos'} className={`mt-0.5 ${i.kind === 'sos' ? 'text-danger' : 'text-brand'}`} />
        <span className="min-w-0 flex-1 leading-snug">
          <span className="block text-[14px] font-semibold text-ink">
            {i.kind === 'sos' ? (isNew ? 'Nuevo SOS de ' : 'SOS de ') : i.live ? 'Recorrido en curso de ' : isNew ? 'Nuevo reporte de ' : 'Reporte de '}
            {i.who}
          </span>
          <span className="block truncate text-[13px] text-ink-2">{i.community}</span>
          <span className="block text-[12px] text-ink-2">{ago(i.at)}</span>
        </span>
        {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-2" />}
      </button>
    </li>
  )

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Notificaciones" aria-expanded={open} title="Notificaciones" className={`${iconBtn} ${open ? 'bg-white/15' : ''}`}>
        <Icon name="notifications" size={20} />
        {fresh.length > 0 && <span className="tnum absolute right-1.5 top-2 rounded-full bg-[#da1e28] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{fresh.length}</span>}
      </button>
      {open && (
        <div className="fade-in absolute right-0 top-12 z-[1800] w-[min(92vw,380px)] border border-line bg-surface text-ink shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[15px] font-semibold">Notificaciones{fresh.length > 0 && <span className="ml-2 text-[13px] font-normal text-ink-2">{fresh.length} nueva{fresh.length > 1 ? 's' : ''}</span>}</p>
            {fresh.length > 0 && (
              <button onClick={markRead} className="text-[13px] font-semibold text-brand hover:underline">
                Marcar como leídas
              </button>
            )}
          </div>
          <ul className="thin-scroll max-h-[60vh] overflow-y-auto">
            {fresh.length === 0 && <li className="border-b border-line px-4 py-5 text-[14px] text-ink-2">No hay reportes nuevos. Cuando un custodio envíe un reporte aparecerá aquí.</li>}
            {fresh.map((i) => row(i, true))}
            {older.length > 0 && (
              <>
                <li className="bg-surface-2 px-4 py-1.5 text-[12px] font-semibold text-ink-2">Anteriores</li>
                {older.map((i) => row(i, false))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function Drawers() {
  const { drawer, closeDrawer } = useUI()
  const { data, refresh } = useDash()
  if (!drawer || !data) return null

  if (drawer.kind === 'sos') {
    const e = data.events.find((x) => x.id === drawer.id)
    if (!e) return null
    return (
      <Drawer tone="danger" icon="emergency" title={`SOS · ${e.userName}`} subtitle={communityLabel(data.communities.find((c) => c.id === e.communityId))} onClose={closeDrawer} width="max-w-[820px]">
        <SosDetail event={e} />
      </Drawer>
    )
  }
  if (drawer.kind === 'report') {
    const p = data.patrols.find((x) => x.id === drawer.id)
    if (!p) return null
    const com = data.communities.find((c) => c.id === p.communityId)
    return (
      <Drawer icon="description" title={`Reporte ${p.code}`} subtitle={`${p.userName} · ${com?.name ?? ''} · ${fmtTime(p.startedAt)}`} onClose={closeDrawer}>
        <ReportDetail patrol={p} points={data.points.filter((x) => x.patrolId === p.id)} events={data.events.filter((x) => x.patrolId === p.id)} communities={data.communities} onChanged={() => void refresh()} />
      </Drawer>
    )
  }
  const m = data.members.find((x) => x.id === drawer.id)
  if (!m) return null
  return (
    <Drawer icon="person" title={m.name} subtitle={m.brigadeRole ?? 'Custodio'} onClose={closeDrawer} width="max-w-[680px]">
      <CustodianDetail member={m} />
    </Drawer>
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { data, updatedAt, refresh, refreshing, applyDefaultPeriod } = useDash()
  const { pathname } = useLocation()
  // Inicio, Comunidades y Mapa abren en "Mes"; Reportes en "Hoy" (mientras el usuario no elija otro período).
  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/comunidades') || pathname.startsWith('/mapa')) applyDefaultPeriod('mes')
    else if (pathname.startsWith('/reportes')) applyDefaultPeriod('dia')
  }, [pathname, applyDefaultPeriod])
  const [menu, setMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('chuca-sidebar') === 'min'
    } catch {
      return false
    }
  })
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('chuca-sidebar', c ? 'max' : 'min')
      } catch {
        /* sin almacenamiento */
      }
      return !c
    })
  const fresh = useSosAlert(data?.events)
  const pending = data ? unreviewedSos(data.events) : 0
  const isRoute = pathname.startsWith('/ruta/')
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))) ?? (isRoute ? { label: 'Ruta de patrullaje', sub: 'Detalle del recorrido' } : NAV[0])

  /** Menú lateral de Carbon: plano, ítems de 40 px y barra amarilla en el activo. */
  const renderNav = (compact: boolean) => (
    <div className="flex h-full flex-col bg-surface text-ink">
      {!compact && (
        <Link to="/" onClick={() => setMenu(false)} aria-label="CHUCA · Inicio" className="block border-b border-line p-4">
          <Logo mode="full" size={132} className="mx-auto" />
          <p className="mt-3 text-center text-[12px] leading-snug text-ink-2">Conservación del Hábitat mediante la Unidad Comunitaria Ambiental</p>
        </Link>
      )}
      <nav className="flex-1 py-2">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            title={compact ? n.label : undefined}
            aria-label={n.label}
            onClick={() => setMenu(false)}
            className={({ isActive }) => `relative flex h-12 items-center transition ${compact ? 'justify-center' : 'gap-3 px-4'} ${isActive ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-0 left-0 w-1 bg-gold" />}
                <Icon name={n.icon} size={20} fill={n.sos} className={n.sos && pending > 0 ? 'text-danger' : ''} />
                {!compact && (
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[14px]">{n.label}</span>
                  </span>
                )}
                {n.sos && pending > 0 && (
                  <span className={`tnum bg-danger font-semibold text-on-danger ${compact ? 'absolute right-1 top-1.5 px-1 text-[10px]' : 'rounded-full px-2 py-0.5 text-[12px]'}`}>{pending}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {!compact && (
        <div className="border-t border-line p-4">
          <p className="text-[12px] font-semibold text-brand">Cada paso protege el bosque.</p>
          <p className="mt-0.5 text-[11px] text-ink-2">Panel AIDER · Octubre 2026</p>
        </div>
      )}
    </div>
  )

  const iconBtn = 'relative flex h-12 w-12 items-center justify-center text-side-ink transition hover:bg-white/10'

  return (
    <div className="min-h-screen bg-page pt-12 text-ink">
      {/* UI shell: barra superior oscura con matiz verde bosque */}
      <header className="fixed inset-x-0 top-0 z-[1700] flex h-12 items-center border-b border-white/10 bg-side text-side-ink">
        <button onClick={() => setMenu((m) => !m)} aria-label="Menú" className={`${iconBtn} lg:hidden`}>
          <Icon name={menu ? 'close' : 'menu'} size={22} />
        </button>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú lateral' : 'Minimizar menú lateral'}
          title={collapsed ? 'Expandir menú lateral' : 'Minimizar menú lateral'}
          className={`${iconBtn} hidden lg:flex`}
        >
          <Icon name={collapsed ? 'menu' : 'menu_open'} size={22} />
        </button>
        <Link to="/" className="flex items-center gap-2.5 pr-4" aria-label="CHUCA · Inicio">
          <Logo mode="icon" size={28} />
          <span className="text-[15px] leading-none">
            <span className="font-semibold">CHUCA</span>
            <span className="ml-2 hidden font-light text-side-ink/80 sm:inline">Panel AIDER</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center">
          <span className="mr-2 hidden items-center gap-1.5 text-[12px] text-side-ink/80 md:flex">
            <span className="pulse-dot h-2 w-2 rounded-full bg-[#42be65]" /> En vivo · {updatedAt ? fmtTime(updatedAt) : '…'}
          </span>
          <button onClick={() => void refresh()} aria-label="Actualizar datos" title="Actualizar datos" className={iconBtn}>
            <Icon name="sync" size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <NotificationBell iconBtn={iconBtn} />
          <button onClick={toggle} aria-label="Cambiar tema" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} className={iconBtn}>
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
          </button>
          <div className="flex h-12 items-center gap-2 border-l border-white/10 pl-3 pr-1">
            <Avatar name={user?.name ?? 'AIDER'} size={28} />
            <span className="hidden text-[13px] lg:block">{user?.name ?? 'Equipo AIDER'}</span>
            <button onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión" className={iconBtn}>
              <Icon name="logout" size={20} />
            </button>
          </div>
        </div>
      </header>

      <aside className={`fixed bottom-0 left-0 top-12 z-[1600] hidden border-r border-line transition-[width] duration-200 lg:block ${collapsed ? 'w-12' : 'w-64'}`}>{renderNav(collapsed)}</aside>
      {menu && (
        <div className="fixed inset-0 top-12 z-[1650] lg:hidden" onClick={() => setMenu(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="slide-in-left absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-line" onClick={(e) => e.stopPropagation()}>
            {renderNav(false)}
          </aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-12' : 'lg:pl-64'}`}>
        <SosBanner fresh={fresh} />

        {/* Encabezado de página */}
        <div className="border-b border-line bg-surface px-4 pb-4 pt-5 lg:px-8">
          <p className="text-[12px] text-ink-2">
            Panel AIDER <span className="px-1 text-ink-2/60">/</span> {current.label}
          </p>
          <h1 className="mt-1 text-[30px] font-light leading-tight text-ink">{current.label}</h1>
          <p className="text-[14px] text-ink-2">{current.sub} · Bosque seco Tumbes–Piura</p>
        </div>
        {!isRoute && pathname !== '/sos' && <FilterBar />}

        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-line py-4 text-[12px] text-ink-2 lg:mx-8">
          <span>CHUCA · Cada paso protege el bosque.</span>
          <span>Panel AIDER · Conservación del Hábitat mediante la Unidad Comunitaria Ambiental</span>
        </footer>
      </div>

      <Drawers />
    </div>
  )
}

export default function Layout() {
  return (
    <DashProvider>
      <UIProvider>
        <Shell />
      </UIProvider>
    </DashProvider>
  )
}

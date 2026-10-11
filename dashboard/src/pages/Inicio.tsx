import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityChart, CategoryDonut } from '../components/Charts'
import FocusTabs from '../components/FocusTabs'
import { SOS_TONE } from '../components/SosDetail'
import { LayeredMap, TerritoryLegend, buildGuards } from '../components/maps'
import { Avatar, Card, Chip, Icon, SectionTitle } from '../components/ui'
import { useDash } from '../hooks/useDash'
import { useTerritory } from '../hooks/useTerritory'
import { useUI } from '../hooks/useUI'
import { SOS_LABEL } from '../lib/colors'
import { communityLabel } from '../lib/stats'
import { ago } from '../lib/time'

function Metric({ icon, label, value, note, tone = 'gold', to }: { icon: string; label: string; value: React.ReactNode; note?: React.ReactNode; tone?: 'gold' | 'ok' | 'danger'; to?: string }) {
  const t = { gold: 'bg-gold-soft text-ochre', ok: 'bg-ok-soft text-ok', danger: 'bg-danger-soft text-danger' }[tone]
  const body = (
    <Card className="h-full p-4 transition hover:shadow-md">
      <span className={`flex h-10 w-10 items-center justify-center ${t}`}>
        <Icon name={icon} size={22} />
      </span>
      <p className="tnum mt-3 font-display text-[32px] font-black leading-none">{value}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-ink-2">{label}</p>
      {note && <p className="mt-1 text-[12px] text-ink-2">{note}</p>}
    </Card>
  )
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

/** Barra de progreso plana de Carbon. */
export function Bar({ pct, tone = 'ok' }: { pct: number; tone?: 'ok' | 'gold' }) {
  return (
    <div className="h-2 w-full bg-surface-2">
      <div className={`h-full ${tone === 'gold' ? 'bg-gold' : 'bg-brand-2'}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/** Inicio · Centro de alertas: lo urgente arriba, luego el estado del territorio y su cobertura. */
export default function Inicio() {
  const { data, view, summary } = useDash()
  const ui = useUI()
  const { territories, total } = useTerritory()
  const [focus, setFocus] = useState('all')

  const sos = useMemo(() => (data?.events ?? []).filter((e) => e.type === 'sos' && e.sosStatus !== 'resuelto').sort((a, b) => b.timestamp - a.timestamp), [data])
  const live = useMemo(() => (view?.patrols ?? []).filter((p) => p.active), [view])
  const guards = useMemo(() => buildGuards(view?.patrols ?? []), [view])
  if (!data || !view || !summary) return <p className="py-20 text-center text-ink-2">Cargando información del territorio…</p>

  const delta = summary.deltaPct
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section>
        {sos.length === 0 ? (
          <div className="flex items-center gap-4 border border-ok/30 bg-ok-soft p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ok text-on-brand">
              <Icon name="verified_user" size={26} />
            </span>
            <div>
              <p className="font-display text-xl font-semibold text-ok">Sin emergencias activas</p>
              <p className="text-[13px] text-ink-2">Todas las alertas SOS están resueltas.</p>
            </div>
          </div>
        ) : (
          <>
            <SectionTitle icon="emergency" title={`Emergencias activas (${sos.length})`} hint="Atiende primero lo urgente: cada tarjeta abre el reporte con contacto, ubicación y estado" action={<Link to="/sos" className="text-[13px] font-semibold text-brand hover:underline">Ir a REPORTES SOS →</Link>} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sos.slice(0, 3).map((e) => {
                const com = data.communities.find((c) => c.id === e.communityId)
                const isNew = e.sosStatus === 'nuevo'
                return (
                  <button key={e.id} onClick={() => ui.openSos(e.id)} className={`relative overflow-hidden border-2 p-4 text-left transition hover:shadow-lg ${isNew ? 'border-danger bg-danger-soft' : 'border-gold bg-gold-soft'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Chip tone={SOS_TONE[e.sosStatus]}>
                        {isNew && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-danger" />} {SOS_LABEL[e.sosStatus]}
                      </Chip>
                      <span className="text-[12px] font-semibold text-ink-2">{ago(e.timestamp)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Avatar name={e.userName} size={44} />
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold">{e.userName}</p>
                        <p className="truncate text-[13px] text-ink-2">{communityLabel(com)}</p>
                      </div>
                    </div>
                    {e.lat != null && (
                      <p className="tnum mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
                        <Icon name="my_location" size={15} className="text-danger" /> {e.lat.toFixed(5)}, {e.lng!.toFixed(5)}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-danger">
                      Ver y atender <Icon name="arrow_forward" size={16} />
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric icon="route" label="Patrullajes" value={summary.reports} note={delta == null ? 'Sin período previo' : <span className={delta >= 0 ? 'text-ok' : 'text-danger'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}% vs. período anterior</span>} />
        <Metric icon="straighten" label="Kilómetros recorridos" value={summary.km.toFixed(1)} note={`Promedio ${summary.avgKm.toFixed(1)} km por ronda`} />
        <Metric icon="forest" label="Hectáreas vigiladas" value={summary.ha.toLocaleString('es-PE')} note={`${summary.sectors} sectores cubiertos`} tone="ok" />
        <Metric icon="groups" label="Custodios activos" value={summary.guards} note={`${live.length} en recorrido ahora`} tone="ok" />
        <Metric
          icon="grid_view"
          label="Territorio vigilado (histórico)"
          value={total ? `${total.pctAll.toFixed(0)}%` : '—'}
          note={total ? `${total.blindHa.toLocaleString('es-PE')} ha en sombra` : 'Sin límites definidos'}
          to="/mapa"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden p-4">
          <SectionTitle icon="map" title="Mapa en vivo" hint="Límite de cada comunidad, zonas vigiladas y zonas en sombra (nunca recorridas)" action={<Link to="/mapa" className="text-[13px] font-semibold text-brand hover:underline">Abrir mapa completo →</Link>} />
          <div className="mb-2">
            <FocusTabs territories={territories} value={focus} onChange={setFocus} />
          </div>
          <div className="h-[460px]">
            <LayeredMap
              focus={focus}
              patrols={live}
              points={view.points}
              events={view.events.filter((e) => e.type === 'sos')}
              communities={data.communities}
              guards={guards}
              territories={territories}
              layers={{ territory: true, visited: true, blind: true, routes: true, records: true }}
              fitId={`home-${territories.length}`}
            />
          </div>
          <div className="mt-2">
            <TerritoryLegend />
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle icon="grid_view" title="Cobertura del territorio" hint="% del área de cada comunidad que sus pobladores vigilan con sus reportes" />
          <div className="space-y-5">
            {territories.length === 0 && <p className="bg-surface-2 p-3 text-[13px] text-ink-2">Sin límites geográficos definidos para esta selección.</p>}
            {territories.map((t) => (
              <div key={t.community.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[14px] font-semibold">{communityLabel(t.community)}</p>
                  <p className="tnum font-display text-[24px] font-light leading-none">{t.pctAll.toFixed(0)}%</p>
                </div>
                <p className="mb-1.5 text-[12px] text-ink-2">Territorio ≈ {t.areaHa.toLocaleString('es-PE')} ha · vigilado en total</p>
                <Bar pct={t.pctAll} />
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-ink-2">
                  <span>
                    En este período: <b className="tnum text-ink">{t.pctPeriod.toFixed(0)}%</b>
                  </span>
                  <span>
                    En sombra: <b className="tnum text-ink">{t.blindHa.toLocaleString('es-PE')} ha</b> ({(100 - t.pctAll).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ActivityChart />
        <CategoryDonut />
      </section>
    </div>
  )
}

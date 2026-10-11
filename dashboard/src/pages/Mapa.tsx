import { useMemo, useState } from 'react'
import { LayeredMap, TerritoryLegend, buildGuards, type Layers } from '../components/maps'
import { Bar } from './Inicio'
import FocusTabs from '../components/FocusTabs'
import { Card, Chip, Icon, btnPrimary } from '../components/ui'
import { useDash } from '../hooks/useDash'
import { useTerritory } from '../hooks/useTerritory'
import { useUI } from '../hooks/useUI'
import { communityLabel } from '../lib/stats'
import { fmtDateTime, fmtDur } from '../lib/time'

const LAYERS: [keyof Layers, string, string][] = [
  ['territory', 'Límites', 'border_outer'],
  ['visited', 'Zonas vigiladas', 'grid_view'],
  ['blind', 'Zonas en sombra', 'visibility_off'],
  ['routes', 'Rutas', 'timeline'],
  ['records', 'Registros', 'place'],
]

/** Mapa y cobertura: el territorio de cada comunidad, lo que se vigila y lo que nunca se ha recorrido. */
export default function Mapa() {
  const { data, view, summary, filters } = useDash()
  const ui = useUI()
  const { territories, total } = useTerritory()
  const [layers, setLayers] = useState<Layers>({ territory: true, visited: true, blind: true, routes: true, records: true })
  const [onlySos, setOnlySos] = useState(false)
  const [focus, setFocus] = useState('all')
  const [open, setOpen] = useState<string>()
  const [shown, setShown] = useState(12)
  const guards = useMemo(() => buildGuards(view?.patrols ?? []), [view])
  const reports = useMemo(() => [...(view?.patrols ?? [])].sort((a, b) => b.startedAt - a.startedAt), [view])
  if (!data || !view || !summary) return <p className="py-20 text-center text-ink-2">Cargando mapa…</p>

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {LAYERS.map(([k, label, icon]) => (
            <button key={k} onClick={() => setLayers({ ...layers, [k]: !layers[k] })} aria-pressed={layers[k]} className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[13px] transition ${layers[k] ? 'border-side bg-side text-white' : 'border-ink-2/50 bg-surface text-ink-2 hover:bg-surface-2'}`}>
              <Icon name={icon} size={16} /> {label}
            </button>
          ))}
          <button onClick={() => setOnlySos(!onlySos)} aria-pressed={onlySos} className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[13px] transition ${onlySos ? 'border-danger bg-danger text-on-danger' : 'border-ink-2/50 bg-surface text-ink-2 hover:bg-surface-2'}`}>
            <Icon name="emergency" size={16} fill /> Solo SOS
          </button>
        </div>
        <div className="mb-2">
          <FocusTabs territories={territories} value={focus} onChange={setFocus} />
        </div>
        <div className="h-[calc(100vh-430px)] min-h-[460px]">
          <LayeredMap
            focus={focus}
            patrols={view.patrols}
            points={view.points}
            events={view.events}
            communities={data.communities}
            guards={guards}
            territories={territories}
            layers={layers}
            sosOnly={onlySos}
            fitId={`map-${filters.communityId}-${territories.length}`}
          />
        </div>
        <div className="mt-2 px-1">
          <TerritoryLegend />
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <p className="mb-1 text-[15px] font-semibold">Cobertura del territorio</p>
          <p className="mb-4 text-[12px] text-ink-2">Zona en sombra: parte del territorio por la que ningún recorrido ha pasado nunca.</p>
          {total && (
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['Vigilado', `${total.pctAll.toFixed(0)}%`],
                ['En sombra', `${(100 - total.pctAll).toFixed(0)}%`],
                ['Este período', `${total.pctPeriod.toFixed(0)}%`],
              ].map(([l, v]) => (
                <div key={l} className="bg-surface-2 py-2.5">
                  <p className="tnum font-display text-[24px] font-light leading-none">{v}</p>
                  <p className="mt-1 text-[11px] text-ink-2">{l}</p>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-4">
            {territories.map((t) => (
              <div key={t.community.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold">{communityLabel(t.community)}</p>
                  <p className="tnum text-[13px] font-semibold">{t.pctAll.toFixed(0)}%</p>
                </div>
                <Bar pct={t.pctAll} />
                <p className="mt-1 text-[12px] text-ink-2">
                  ≈ {t.areaHa.toLocaleString('es-PE')} ha · en sombra {t.blindHa.toLocaleString('es-PE')} ha · período {t.pctPeriod.toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-[15px] font-semibold">Reportes en el mapa ({reports.length})</p>
          <p className="mb-3 text-[12px] text-ink-2">Abre un reporte para ver su resumen aquí mismo; “Ver más” abre el recorrido completo.</p>
          <ul className="thin-scroll max-h-[420px] divide-y divide-line overflow-y-auto border border-line">
            {reports.length === 0 && <li className="p-3 text-[13px] text-ink-2">No hay reportes en este período. Cambia el período arriba para ver más.</li>}
            {reports.slice(0, shown).map((p) => {
              const evs = view.events.filter((e) => e.patrolId === p.id)
              const sos = evs.filter((e) => e.type === 'sos').length
              const expanded = open === p.id
              const com = data.communities.find((c) => c.id === p.communityId)
              return (
                <li key={p.id}>
                  <button onClick={() => setOpen(expanded ? undefined : p.id)} aria-expanded={expanded} className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-2 ${expanded ? 'bg-surface-2' : ''}`}>
                    <span className="whitespace-nowrap bg-gold-soft px-1.5 py-0.5 font-mono text-[12px] font-semibold text-ochre">{p.code}</span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold">{p.userName}</span>
                      <span className="block truncate text-[12px] text-ink-2">
                        {com ? `Com. ${com.code}` : ''} · {fmtDateTime(p.startedAt)}
                      </span>
                    </span>
                    {sos > 0 && <Icon name="emergency" size={16} fill className="text-danger" />}
                    <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="text-ink-2" />
                  </button>
                  {expanded && (
                    <div className="fade-in space-y-2 bg-surface-2 px-3 pb-3 text-[13px]">
                      <p className="line-clamp-4 leading-snug">{p.active ? 'Recorrido en curso: el resumen se genera al finalizar.' : (p.summary ?? 'Sin resumen todavía.')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Chip tone="neutral">{(p.distanceM / 1000).toFixed(1)} km</Chip>
                        {p.endedAt && <Chip tone="neutral">{fmtDur(p.endedAt - p.startedAt)}</Chip>}
                        <Chip tone="neutral">{evs.filter((e) => e.type === 'photo').length} fotos</Chip>
                        <Chip tone="neutral">{evs.filter((e) => e.type === 'audio').length} audios</Chip>
                        {sos > 0 && <Chip tone="danger">{sos} SOS</Chip>}
                        {p.keyData?.urgencia && <Chip tone={p.keyData.urgencia === 'alta' ? 'danger' : p.keyData.urgencia === 'media' ? 'gold' : 'ok'}>Urgencia {p.keyData.urgencia}</Chip>}
                      </div>
                      <button onClick={() => ui.openReport(p.id)} className={btnPrimary}>
                        Ver más <Icon name="arrow_forward" size={16} />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {reports.length > shown && (
            <button onClick={() => setShown(shown + 12)} className="mt-2 w-full border border-ink-2/50 py-2 text-[13px] hover:bg-surface-2">
              Ver más reportes ({reports.length - shown} restantes)
            </button>
          )}
        </Card>
      </div>
    </div>
  )
}

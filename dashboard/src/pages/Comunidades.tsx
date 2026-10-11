import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MonthlyLines } from '../components/Charts'
import { ZoneMiniMap } from '../components/maps'
import { Avatar, Card, Chip, Icon, SectionTitle } from '../components/ui'
import { useDash } from '../hooks/useDash'
import { useTheme } from '../hooks/useTheme'
import { useUI } from '../hooks/useUI'
import { CHART } from '../lib/colors'
import { custodianRows, filterData, communityLabel, summarize, unreviewedSos, zoneHull, type Summary } from '../lib/stats'
import { periodTitle, shift } from '../lib/time'
import type { DashboardData } from '../lib/types'

const isMain = (code: string) => /^[A-Z]$/.test(code)

function Delta({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before) return <span className="text-ink-2">—</span>
  const pct = ((now - before) / before) * 100
  const good = invert ? pct <= 0 : pct >= 0
  return (
    <span className={`tnum font-bold ${good ? 'text-ok' : 'text-danger'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(Math.round(pct))}%
    </span>
  )
}

const metricsOf = (v: DashboardData, s: Summary) => ({ patrullajes: s.reports, km: +s.km.toFixed(1), ha: s.ha, custodios: s.guards, sos: v.events.filter((e) => e.type === 'sos').length })

/** Comunidades y custodios: fichas, comparativas entre comunidades y entre períodos, y ranking de custodios. */
export default function Comunidades() {
  const { data, view, filters, setFilters, gaps, summary } = useDash()
  const ui = useUI()
  const { theme } = useTheme()
  const c = CHART[theme]
  const [mode, setMode] = useState<'comunidades' | 'periodos'>('comunidades')

  const communities = useMemo(() => (data?.communities ?? []).filter((x) => isMain(x.code)), [data])

  const perCommunity = useMemo(() => {
    if (!data) return []
    return communities.map((com) => {
      const v = filterData(data, { ...filters, communityId: com.id }, gaps)
      const all = filterData(data, { ...filters, communityId: com.id }, gaps, true)
      return { com, v, s: summarize(v, [], gaps), hull: zoneHull(all.points), members: data.members.filter((m) => m.communityId === com.id).length, open: unreviewedSos(all.events) }
    })
  }, [data, communities, filters, gaps])

  const prevPeriod = useMemo(() => {
    if (!data || !summary || !view) return undefined
    const pv = filterData(data, { ...filters, period: shift(filters.period, -1) }, gaps)
    return { v: pv, s: summarize(pv, [], gaps) }
  }, [data, filters, gaps, summary, view])

  const rows = useMemo(() => (data && view ? custodianRows(data, view, filters, gaps) : []), [data, view, filters, gaps])
  if (!data || !view || !summary) return <p className="py-20 text-center text-ink-2">Cargando comunidades…</p>

  const bars = perCommunity.map(({ com, s, v }) => ({ name: `Com. ${com.code}`, Patrullajes: s.reports, 'Km ÷ 10': +(s.km / 10).toFixed(1), 'Alertas SOS': v.events.filter((e) => e.type === 'sos').length }))
  const now = metricsOf(view, summary)
  const before = prevPeriod ? metricsOf(prevPeriod.v, prevPeriod.s) : undefined
  const tip = { background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 12, color: c.text, fontSize: 12 }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section>
        <SectionTitle icon="diversity_3" title="Comunidades" hint="Fichas de las comunidades vigilantes. Elige una para filtrar todo el panel." />
        <div className="grid gap-4 lg:grid-cols-3">
          {perCommunity.map(({ com, s, hull, members, open }) => {
            const on = filters.communityId === com.id
            return (
              <Card key={com.id} className={`overflow-hidden ${on ? 'ring-2 ring-gold' : ''}`}>
                <div className="h-[220px] overflow-hidden">
                  <ZoneMiniMap hull={hull} />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-[18px] font-black leading-tight">{communityLabel(com)}</p>
                      <p className="text-[12px] text-ink-2">{com.nearbyReserve ?? '—'}</p>
                    </div>
                    {open > 0 ? <Chip tone="danger">{open} SOS pendiente{open > 1 ? 's' : ''}</Chip> : <Chip tone="ok">Sin SOS pendientes</Chip>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Custodios', members],
                      ['Reportes', s.reports],
                      ['Km', s.km.toFixed(0)],
                    ].map(([l, v]) => (
                      <div key={l as string} className="rounded-xl bg-surface-2 py-2">
                        <p className="tnum font-display text-[20px] font-black leading-none">{v}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-ink-2">{l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-ink-2">
                    <Icon name="diversity_3" size={14} className="mr-1 align-[-2px]" />≈ {com.population?.toLocaleString('es-PE') ?? '—'} habitantes · reporta desde {com.reportsSince ?? '—'}
                  </p>
                  <button onClick={() => setFilters({ communityId: on ? 'all' : com.id })} className={`w-full rounded-xl py-2 text-[13px] font-bold transition ${on ? 'bg-brand text-on-brand' : 'bg-surface-2 text-ink hover:bg-line'}`}>
                    {on ? 'Quitar filtro' : 'Filtrar por esta comunidad'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle
          icon="compare_arrows"
          title="Comparar"
          hint={mode === 'comunidades' ? `Las tres comunidades en ${periodTitle(filters.period)}` : `${periodTitle(filters.period)} frente al período anterior`}
          action={
            <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
              {(['comunidades', 'periodos'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-[13px] font-bold capitalize transition ${mode === m ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-2 hover:text-ink'}`}>
                  {m === 'comunidades' ? 'Entre comunidades' : 'Entre períodos'}
                </button>
              ))}
            </div>
          }
        />
        {mode === 'comunidades' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                    <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: c.tick, fontSize: 12 }} stroke={c.grid} />
                    <YAxis allowDecimals={false} tick={{ fill: c.tick, fontSize: 12 }} stroke={c.grid} />
                    <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: c.text }} />
                    <Bar dataKey="Patrullajes" fill={c.bar} radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Km ÷ 10" fill={c.inc} radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Alertas SOS" fill={c.crit} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-2 text-[13px] font-semibold text-ink">
                  <tr>
                    <th className="px-4 py-3">Comunidad</th>
                    <th className="px-3 py-3 text-right">Rondas</th>
                    <th className="px-3 py-3 text-right">Km</th>
                    <th className="px-3 py-3 text-right">Hectáreas</th>
                    <th className="px-3 py-3 text-right">SOS</th>
                  </tr>
                </thead>
                <tbody>
                  {perCommunity.map(({ com, s, v }) => (
                    <tr key={com.id} className="border-t border-line">
                      <td className="px-4 py-3 font-bold">{communityLabel(com)}</td>
                      <td className="tnum px-3 py-3 text-right">{s.reports}</td>
                      <td className="tnum px-3 py-3 text-right">{s.km.toFixed(1)}</td>
                      <td className="tnum px-3 py-3 text-right">{s.ha.toLocaleString('es-PE')}</td>
                      <td className="tnum px-3 py-3 text-right">{v.events.filter((e) => e.type === 'sos').length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 text-[13px] font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Indicador</th>
                  <th className="px-3 py-3 text-right">Este período</th>
                  <th className="px-3 py-3 text-right">Anterior</th>
                  <th className="px-3 py-3 text-right">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Patrullajes', 'patrullajes', false],
                    ['Kilómetros recorridos', 'km', false],
                    ['Hectáreas vigiladas', 'ha', false],
                    ['Custodios activos', 'custodios', false],
                    ['Alertas SOS', 'sos', true],
                  ] as const
                ).map(([label, key, invert]) => (
                  <tr key={key} className="border-t border-line">
                    <td className="px-4 py-3 font-bold">{label}</td>
                    <td className="tnum px-3 py-3 text-right font-semibold">{now[key].toLocaleString('es-PE')}</td>
                    <td className="tnum px-3 py-3 text-right text-ink-2">{before ? before[key].toLocaleString('es-PE') : '—'}</td>
                    <td className="px-3 py-3 text-right">{before ? <Delta now={now[key]} before={before[key]} invert={invert} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <MonthlyLines />

      <section>
        <SectionTitle icon="military_tech" title="Custodios" hint={`${rows.length} custodios · ordenados por kilómetros recorridos. Haz clic para ver su perfil.`} />
        <Card className="overflow-hidden">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="bg-surface-2 text-[13px] font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-3 py-3">Custodio</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3 text-right">Rondas</th>
                  <th className="px-3 py-3 text-right">Km</th>
                  <th className="px-3 py-3 text-right">Fotos / audios / notas</th>
                  <th className="px-3 py-3 text-right">SOS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.member.id} onClick={() => ui.openCustodian(r.member.id)} className="cursor-pointer border-t border-line transition hover:bg-surface-2">
                    <td className="tnum px-4 py-2.5 font-bold text-ink-2">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={r.member.name} size={32} />
                        <span>
                          <span className="block font-bold leading-tight">{r.member.name}</span>
                          <span className="block text-[11px] text-ink-2">{communityLabel(data.communities.find((x) => x.id === r.member.communityId))}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{r.member.brigadeRole ?? '—'}</td>
                    <td className="tnum px-3 py-2.5 text-right">{r.patrols.length}</td>
                    <td className="tnum px-3 py-2.5 text-right font-semibold">{r.km.toFixed(1)}</td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-2">
                      {r.photos} / {r.audios} / {r.notes}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right">{r.sos ? <Chip tone="danger">{r.sos}</Chip> : <span className="text-ink-2">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}

import { useMemo } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDash } from '../hooks/useDash'
import { useTheme } from '../hooks/useTheme'
import { CATEGORY_NAME, CHART } from '../lib/colors'
import { activitySeries, categoryCounts, communityLabel, monthlySeries } from '../lib/stats'
import { limaYear, periodTitle } from '../lib/time'
import { Card, Icon, SectionTitle } from './ui'

function useChart() {
  const { theme } = useTheme()
  const c = CHART[theme]
  return { c, tip: { background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 12, color: c.text, fontSize: 12 } }
}

/** Patrullajes, incidencias y SOS según el período elegido. */
export function ActivityChart() {
  const { view, filters } = useDash()
  const { c, tip } = useChart()
  const series = useMemo(() => (view ? activitySeries(view, filters.period) : []), [view, filters.period])
  const best = series.reduce((a, b) => (b.patrullajes > a.patrullajes ? b : a), series[0] ?? { label: '', patrullajes: 0, incidencias: 0, criticas: 0, trend: 0 })
  const unit = filters.period.kind === 'dia' ? 'hora' : filters.period.kind === 'semana' ? 'día' : filters.period.kind === 'mes' ? 'día del mes' : 'mes'
  return (
    <Card className="p-5">
      <SectionTitle icon="bar_chart" title="Patrullajes frente a incidencias" hint={`${periodTitle(filters.period)} · rondas, talas, incendios, pastoreo y alertas SOS`} />
      <div className="mb-2 flex flex-wrap gap-4 text-[12px] font-semibold">
        {[
          ['Patrullajes', c.bar],
          ['Incidencias', c.inc],
          ['Alertas SOS', c.crit],
        ].map(([l, col]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: col }} /> {l}
          </span>
        ))}
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 11 }} stroke={c.grid} interval={series.length > 16 ? 1 : 0} />
            <YAxis allowDecimals={false} tick={{ fill: c.tick, fontSize: 11 }} stroke={c.grid} />
            <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="patrullajes" name="Patrullajes" fill={c.bar} radius={[5, 5, 0, 0]} maxBarSize={24} />
            <Bar dataKey="incidencias" name="Incidencias" fill={c.inc} radius={[4, 4, 0, 0]} maxBarSize={14} />
            <Bar dataKey="criticas" name="Alertas SOS" fill={c.crit} radius={[4, 4, 0, 0]} maxBarSize={14} />
            <Line type="monotone" dataKey="trend" name="Tendencia" connectNulls={false} stroke={c.line} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-ink-2">
        <Icon name="verified" size={17} className="text-ok" /> Mayor actividad por {unit}: <strong className="text-ink">{best.label} ({best.patrullajes} rondas)</strong>
      </p>
    </Card>
  )
}

/** Notas de campo según el tipo de situación. */
export function CategoryDonut() {
  const { view } = useDash()
  const { c } = useChart()
  const cats = useMemo(() => categoryCounts(view?.events ?? []), [view])
  return (
    <Card className="p-5">
      <SectionTitle icon="donut_large" title="Registros por tipo" hint="Qué reportan los custodios en sus notas" />
      <div className="relative mx-auto my-3 h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={cats.total ? cats.rows : [{ category: 'otro', count: 1, pct: 100 }]} dataKey="count" innerRadius={54} outerRadius={78} startAngle={90} endAngle={-270} stroke="none" paddingAngle={cats.total ? 2 : 0}>
              {(cats.total ? cats.rows : [{ category: 'otro' as const }]).map((r) => (
                <Cell key={r.category} fill={cats.total ? c.cats[r.category] : c.grid} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-display text-[28px] font-black leading-none">{cats.total}</span>
          <span className="text-[11px] font-bold uppercase text-ink-2">Notas</span>
        </div>
      </div>
      <div className="space-y-1.5 text-[13px]">
        {cats.rows.map((r) => (
          <div key={r.category} className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.cats[r.category] }} /> {CATEGORY_NAME[r.category]}
            </span>
            <span className="tnum text-ink-2">
              {Math.round(r.pct)}% ({r.count})
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Reportes por mes de cada comunidad. */
export function MonthlyLines() {
  const { data, filters } = useDash()
  const { c, tip } = useChart()
  const year = limaYear(filters.period.ref)
  const series = useMemo(() => (data ? monthlySeries(data.patrols, data.communities, year) : []), [data, year])
  if (!data) return null
  const main = data.communities.filter((x) => /^[A-Z]$/.test(x.code))
  return (
    <Card className="p-5">
      <SectionTitle icon="show_chart" title={`Reportes por mes · ${year}`} hint="Recorridos registrados cada mes por cada comunidad" />
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: c.tick, fontSize: 12 }} stroke={c.grid} />
            <YAxis allowDecimals={false} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: c.tick, fontSize: 12 }} stroke={c.grid} />
            <Tooltip contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 13, color: c.text }} />
            {main.map((x, i) => (
              <Line key={x.id} type="monotone" dataKey={x.id} name={communityLabel(x)} stroke={c.communities[i % 3]} strokeWidth={3} dot={{ r: 4, fill: c.communities[i % 3], strokeWidth: 0 }} activeDot={{ r: 7 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

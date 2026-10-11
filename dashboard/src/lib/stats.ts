import { haversine } from './geo'
import { DAYS_SHORT, MONTHS_SHORT, inRange, lima, limaHour, limaMonth, limaYear, range, shift, type Period } from './time'
import type { Community, DashboardData, EventRow, Member, NoteCategory, Patrol, TrackPoint } from './types'

export type Coverage = 'all' | 'live' | 'shadow'
export type EvidenceFilter = 'all' | 'photo' | 'audio' | 'note' | 'sos'

export interface Filters {
  communityId: string
  period: Period
  coverage: Coverage
  search: string
  evidence: EvidenceFilter
  category: 'all' | NoteCategory
  role: string
}

export const defaultFilters = (): Filters => ({
  communityId: 'all',
  period: { kind: 'dia', ref: Date.now() },
  coverage: 'all',
  search: '',
  evidence: 'all',
  category: 'all',
  role: 'all',
})

/** Cantidad de filtros distintos del valor por defecto (para la insignia de "Más filtros"). */
export function activeFilterCount(f: Filters) {
  return [f.communityId !== 'all', f.coverage !== 'all', f.search.trim() !== '', f.evidence !== 'all', f.category !== 'all', f.role !== 'all'].filter(Boolean).length
}

// ───────── Zonas en sombra GPS: huecos de señal en la ruta ─────────
const GAP_MS = 8 * 60_000

export interface Gap {
  patrolId: string
  fromT: number
  toT: number
  km: number
  lat: number
  lng: number
}

/** Tramos de más de 8 min sin puntos GPS dentro de un recorrido (sin señal; se sincronizó luego). */
export function findGaps(points: TrackPoint[]): Map<string, Gap[]> {
  const by = new Map<string, TrackPoint[]>()
  for (const p of points) {
    const l = by.get(p.patrolId) ?? []
    l.push(p)
    by.set(p.patrolId, l)
  }
  const out = new Map<string, Gap[]>()
  for (const [id, list] of by) {
    list.sort((a, b) => a.timestamp - b.timestamp)
    const gaps: Gap[] = []
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]
      const b = list[i]
      if (b.timestamp - a.timestamp > GAP_MS) {
        gaps.push({ patrolId: id, fromT: a.timestamp, toT: b.timestamp, km: haversine(a.lat, a.lng, b.lat, b.lng) / 1000, lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 })
      }
    }
    if (gaps.length) out.set(id, gaps)
  }
  return out
}

// ───────── Filtros ─────────
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filterData(d: DashboardData, f: Filters, gaps: Map<string, Gap[]>, ignorePeriod = false): DashboardData {
  const r = range(f.period)
  const member = new Map(d.members.map((m) => [m.id, m]))
  const evBy = new Map<string, EventRow[]>()
  d.events.forEach((e) => evBy.set(e.patrolId, [...(evBy.get(e.patrolId) ?? []), e]))
  const q = norm(f.search.trim())

  const patrols = d.patrols.filter((p) => {
    if (f.communityId !== 'all' && p.communityId !== f.communityId) return false
    if (!ignorePeriod && !inRange(p.startedAt, r)) return false
    if (f.coverage === 'live' && !p.active) return false
    if (f.coverage === 'shadow' && !gaps.has(p.id)) return false
    const m = member.get(p.userId)
    if (q && !norm(p.userName).includes(q) && !(m?.dni ?? '').includes(q)) return false
    if (f.role !== 'all' && m?.brigadeRole !== f.role) return false
    const evs = evBy.get(p.id) ?? []
    if (f.evidence !== 'all' && !evs.some((e) => e.type === f.evidence)) return false
    if (f.category !== 'all' && !evs.some((e) => e.category === f.category)) return false
    return true
  })
  const ids = new Set(patrols.map((p) => p.id))
  return { communities: d.communities, members: d.members, patrols, points: d.points.filter((p) => ids.has(p.patrolId)), events: d.events.filter((e) => ids.has(e.patrolId)) }
}

// ───────── Cuadrículas: zonas cubiertas ─────────
const CELL_FINE = 0.005 // ≈ 550 m → "zona recorrida" en el mapa
const CELL_SECTOR = 0.02 // ≈ 2,2 km → "sector"
const HA_PER_CELL = 31

export function coverageRects(points: TrackPoint[]): [[number, number], [number, number]][] {
  const seen = new Set<string>()
  const out: [[number, number], [number, number]][] = []
  for (const p of points) {
    const i = Math.floor(p.lat / CELL_FINE)
    const j = Math.floor(p.lng / CELL_FINE)
    const key = `${i}_${j}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push([
      [i * CELL_FINE, j * CELL_FINE],
      [(i + 1) * CELL_FINE, (j + 1) * CELL_FINE],
    ])
  }
  return out
}

export function coverageStats(points: TrackPoint[]) {
  const fine = new Set<string>()
  const sectors = new Set<string>()
  for (const p of points) {
    fine.add(`${Math.floor(p.lat / CELL_FINE)}_${Math.floor(p.lng / CELL_FINE)}`)
    sectors.add(`${Math.floor(p.lat / CELL_SECTOR)}_${Math.floor(p.lng / CELL_SECTOR)}`)
  }
  return { sectors: sectors.size, ha: fine.size * HA_PER_CELL }
}

// ───────── Métricas ─────────
export interface Summary {
  reports: number
  km: number
  avgKm: number
  deltaPct: number | null
  sectors: number
  ha: number
  shadowCount: number
  shadowKm: number
  guards: number
}

export function summarize(view: DashboardData, prevPatrols: Patrol[], gaps: Map<string, Gap[]>): Summary {
  const km = view.patrols.reduce((s, p) => s + p.distanceM, 0) / 1000
  const cov = coverageStats(view.points)
  let shadowCount = 0
  let shadowKm = 0
  for (const p of view.patrols) for (const g of gaps.get(p.id) ?? []) (shadowCount++, (shadowKm += g.km))
  return {
    reports: view.patrols.length,
    km,
    avgKm: view.patrols.length ? km / view.patrols.length : 0,
    deltaPct: prevPatrols.length ? ((view.patrols.length - prevPatrols.length) / prevPatrols.length) * 100 : null,
    sectors: cov.sectors,
    ha: cov.ha,
    shadowCount,
    shadowKm,
    guards: new Set(view.patrols.map((p) => p.userId)).size,
  }
}

/** Recorridos del período inmediatamente anterior (para el "vs. periodo previo"). */
export function previousPatrols(d: DashboardData, f: Filters, gaps: Map<string, Gap[]>) {
  const prev = filterData(d, { ...f, period: shift(f.period, -1) }, gaps)
  return prev.patrols
}

// ───────── Series para los gráficos ─────────
export interface Bucket {
  label: string
  patrullajes: number
  incidencias: number
  criticas: number
  trend: number | null // línea de tendencia; vacía en los tramos futuros
}

const INCIDENT: NoteCategory[] = ['tala', 'incendio', 'pastoreo']

/** Patrullajes, incidencias (tala, incendio, pastoreo) y SOS agrupados según el período. */
export function activitySeries(view: DashboardData, p: Period): Bucket[] {
  const [a] = range(p)
  let labels: string[]
  let index: (t: number) => number
  if (p.kind === 'dia') {
    labels = Array.from({ length: 15 }, (_, i) => `${String(i + 5).padStart(2, '0')}h`)
    index = (t) => Math.min(14, Math.max(0, Math.floor(limaHour(t)) - 5))
  } else if (p.kind === 'semana') {
    labels = DAYS_SHORT
    index = (t) => (lima(t).getUTCDay() + 6) % 7
  } else if (p.kind === 'mes') {
    const d = lima(p.ref)
    const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    labels = Array.from({ length: n }, (_, i) => String(i + 1))
    index = (t) => lima(t).getUTCDate() - 1
  } else {
    labels = MONTHS_SHORT
    index = (t) => limaMonth(t)
  }
  const rows: Bucket[] = labels.map((label) => ({ label, patrullajes: 0, incidencias: 0, criticas: 0, trend: 0 }))
  for (const pt of view.patrols) rows[index(pt.startedAt)] && rows[index(pt.startedAt)].patrullajes++
  for (const e of view.events) {
    const row = rows[index(e.timestamp)]
    if (!row) continue
    if (e.type === 'sos') row.criticas++
    else if (e.category && INCIDENT.includes(e.category)) row.incidencias++
  }
  // Tendencia: sigue a los patrullajes hasta el momento actual y se corta en los tramos que aún no ocurren.
  const now = Date.now()
  const [, end] = range(p)
  const lastIdx = a > now ? -1 : now >= end ? rows.length - 1 : Math.min(rows.length - 1, index(now))
  rows.forEach((r, i) => (r.trend = i <= lastIdx ? r.patrullajes : null))
  return rows
}

export const CATEGORY_ORDER: NoteCategory[] = ['tala', 'incendio', 'pastoreo', 'fauna']

export function categoryCounts(events: EventRow[]) {
  const total = events.filter((e) => e.type === 'note' && e.category).length
  return {
    total,
    rows: CATEGORY_ORDER.map((c) => {
      const count = events.filter((e) => e.type === 'note' && e.category === c).length
      return { category: c, count, pct: total ? (count / total) * 100 : 0 }
    }),
  }
}

/** Reportes (recorridos) por mes y por comunidad en el año dado; meses futuros quedan vacíos. */
export function monthlySeries(patrols: Patrol[], communities: Community[], year: number) {
  const main = communities.filter((c) => /^[A-Z]$/.test(c.code))
  const now = Date.now()
  const lastMonth = limaYear(now) === year ? limaMonth(now) : 11
  return MONTHS_SHORT.map((label, m) => {
    const row: Record<string, number | string | null> = { month: label }
    for (const c of main) row[c.id] = m > lastMonth ? null : patrols.filter((p) => p.communityId === c.id && limaYear(p.startedAt) === year && limaMonth(p.startedAt) === m).length
    return row
  })
}

// ───────── Custodios ─────────
export interface CustodianRow {
  member: Member
  patrols: Patrol[]
  km: number
  sectors: number
  shadowKm: number
  photos: number
  audios: number
  notes: number
  sos: number
  last?: Patrol
}

export function custodianRows(d: DashboardData, view: DashboardData, f: Filters, gaps: Map<string, Gap[]>): CustodianRow[] {
  const q = norm(f.search.trim())
  const members = d.members.filter((m) => {
    if (f.communityId !== 'all' && m.communityId !== f.communityId) return false
    if (f.role !== 'all' && m.brigadeRole !== f.role) return false
    if (q && !norm(m.name).includes(q) && !(m.dni ?? '').includes(q)) return false
    return true
  })
  const ptsBy = new Map<string, TrackPoint[]>()
  view.points.forEach((p) => ptsBy.set(p.patrolId, [...(ptsBy.get(p.patrolId) ?? []), p]))
  return members
    .map((member) => {
      const patrols = view.patrols.filter((p) => p.userId === member.id).sort((a, b) => b.startedAt - a.startedAt)
      const ids = new Set(patrols.map((p) => p.id))
      const evs = view.events.filter((e) => ids.has(e.patrolId))
      const pts = patrols.flatMap((p) => ptsBy.get(p.id) ?? [])
      return {
        member,
        patrols,
        km: patrols.reduce((s, p) => s + p.distanceM, 0) / 1000,
        sectors: coverageStats(pts).sectors,
        shadowKm: patrols.reduce((s, p) => s + (gaps.get(p.id) ?? []).reduce((x, g) => x + g.km, 0), 0),
        photos: evs.filter((e) => e.type === 'photo').length,
        audios: evs.filter((e) => e.type === 'audio').length,
        notes: evs.filter((e) => e.type === 'note').length,
        sos: evs.filter((e) => e.type === 'sos').length,
        last: patrols[0],
      }
    })
    .sort((a, b) => b.km - a.km)
}

/** Alertas SOS que aún no se resuelven (nuevas + en atención). */
export const unreviewedSos = (events: EventRow[]) => events.filter((e) => e.type === 'sos' && e.sosStatus !== 'resuelto').length

/** Contorno (envolvente convexa, ligeramente ampliado) de la zona que abarcan los puntos. */
export function zoneHull(points: TrackPoint[]): [number, number][] {
  const pts = points.filter((_, i) => i % 6 === 0).map((p) => [p.lng, p.lat] as [number, number])
  if (pts.length < 3) return []
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)]
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length
  return hull.map(([x, y]) => [cy + (y - cy) * 1.1, cx + (x - cx) * 1.1] as [number, number])
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

export const communityLabel = (c?: Community) => (!c ? '' : /^[A-Z]$/.test(c.code) ? `Comunidad ${c.code} · ${c.name}` : c.name)

import { useMemo } from 'react'
import { useDash } from './useDash'
import { territoryOf, type Territory } from '../lib/territory'

/** Territorio de cada comunidad (polígono, % vigilado y zonas en sombra), según los filtros activos. */
export function useTerritory() {
  const { data, view, filters } = useDash()
  return useMemo(() => {
    if (!data || !view) return { territories: [] as Territory[], total: undefined }
    const community = new Map(data.patrols.map((p) => [p.id, p.communityId]))
    const byCom = (pts: typeof data.points) => {
      const m = new Map<string, typeof data.points>()
      for (const p of pts) {
        const c = community.get(p.patrolId)
        if (!c) continue
        const l = m.get(c) ?? []
        l.push(p)
        m.set(c, l)
      }
      return m
    }
    const all = byCom(data.points)
    const per = byCom(view.points)
    const territories = data.communities
      .filter((c) => (filters.communityId === 'all' || c.id === filters.communityId) && c.boundary)
      .map((c) => territoryOf(c, all.get(c.id) ?? [], per.get(c.id) ?? []))
      .filter((t): t is Territory => !!t)
    const totalCells = territories.reduce((s, t) => s + t.totalCells, 0)
    const total = totalCells
      ? {
          areaHa: territories.reduce((s, t) => s + t.areaHa, 0),
          blindHa: territories.reduce((s, t) => s + t.blindHa, 0),
          pctAll: (territories.reduce((s, t) => s + t.visitedAll, 0) / totalCells) * 100,
          pctPeriod: (territories.reduce((s, t) => s + t.visitedPeriod, 0) / totalCells) * 100,
        }
      : undefined
    return { territories, total }
  }, [data, view, filters.communityId])
}

import type { Community, TrackPoint } from './types'

// Cuadrícula de 0,005° (≈ 555 m ≈ 31 ha). Una celda cuenta como "vigilada" si algún recorrido pasó por ella.
export const CELL = 0.005
export const HA_PER_CELL = 31

type Bounds = [[number, number], [number, number]]

/** Punto dentro de un polígono [lat, lng] (trazado de rayos). */
function inside(lat: number, lng: number, poly: [number, number][]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]
    const [yj, xj] = poly[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const key = (i: number, j: number) => `${i}_${j}`

export interface Territory {
  community: Community
  boundary: [number, number][]
  totalCells: number
  areaHa: number
  /** Celdas del territorio recorridas alguna vez (toda la historia). */
  visitedAll: number
  /** Celdas del territorio recorridas en el período elegido. */
  visitedPeriod: number
  pctAll: number
  pctPeriod: number
  /** Zonas en sombra: celdas del territorio por las que ningún recorrido ha pasado nunca. */
  blind: Bounds[]
  blindHa: number
  /** Celdas recorridas en el período (para pintarlas). */
  visitedRects: Bounds[]
}

/** Cobertura de un territorio: qué parte del polígono se vigila y qué zonas nunca se han recorrido. */
export function territoryOf(community: Community, allPoints: TrackPoint[], periodPoints: TrackPoint[]): Territory | undefined {
  const boundary = community.boundary
  if (!boundary || boundary.length < 3) return undefined
  const lats = boundary.map((p) => p[0])
  const lngs = boundary.map((p) => p[1])
  const i0 = Math.floor(Math.min(...lats) / CELL)
  const i1 = Math.floor(Math.max(...lats) / CELL)
  const j0 = Math.floor(Math.min(...lngs) / CELL)
  const j1 = Math.floor(Math.max(...lngs) / CELL)

  const all = new Set<string>()
  for (const p of allPoints) all.add(key(Math.floor(p.lat / CELL), Math.floor(p.lng / CELL)))
  const per = new Set<string>()
  for (const p of periodPoints) per.add(key(Math.floor(p.lat / CELL), Math.floor(p.lng / CELL)))

  const blind: Bounds[] = []
  const visitedRects: Bounds[] = []
  let total = 0
  let visAll = 0
  let visPer = 0
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      if (!inside((i + 0.5) * CELL, (j + 0.5) * CELL, boundary)) continue
      total++
      const k = key(i, j)
      const rect: Bounds = [
        [i * CELL, j * CELL],
        [(i + 1) * CELL, (j + 1) * CELL],
      ]
      if (all.has(k)) visAll++
      else blind.push(rect)
      if (per.has(k)) {
        visPer++
        visitedRects.push(rect)
      }
    }
  }
  return {
    community,
    boundary,
    totalCells: total,
    areaHa: total * HA_PER_CELL,
    visitedAll: visAll,
    visitedPeriod: visPer,
    pctAll: total ? (visAll / total) * 100 : 0,
    pctPeriod: total ? (visPer / total) * 100 : 0,
    blind,
    blindHa: blind.length * HA_PER_CELL,
    visitedRects,
  }
}

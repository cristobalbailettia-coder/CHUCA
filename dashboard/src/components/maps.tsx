import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useTheme } from '../hooks/useTheme'
import { CATEGORY_NAME, CHART, GUARD_COLORS, TYPE_COLOR, TYPE_LABEL } from '../lib/colors'
import { coverageRects, type Gap } from '../lib/stats'
import type { Territory } from '../lib/territory'
import { fmtDateTime } from '../lib/time'
import type { Community, EventRow, Patrol, TrackPoint } from '../lib/types'

// Imagen satelital de Esri (World Imagery).
const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ATTR = 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics'
const DEMO = 'comunidad-demo'

function Fit({ positions, id }: { positions: [number, number][]; id: string }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length) map.fitBounds(L.latLngBounds(positions), { padding: [30, 30], maxZoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, positions.length])
  return null
}

/** Zona ya recorrida: celdas de color sobre la imagen satelital. */
function Coverage({ points }: { points: TrackPoint[] }) {
  const map = useMap()
  const { theme } = useTheme()
  useEffect(() => {
    const color = CHART[theme].coverage
    const group = L.featureGroup(coverageRects(points).map((b) => L.rectangle(b, { stroke: false, fillColor: color, fillOpacity: 0.5, interactive: false }))).addTo(map)
    return () => {
      group.remove()
    }
  }, [map, points, theme])
  return null
}

function EventPopup({ e, communities }: { e: EventRow; communities: Community[] }) {
  const com = communities.find((c) => c.id === e.communityId)
  return (
    <div className="w-52 space-y-1 text-sm">
      <p className="font-bold">
        {TYPE_LABEL[e.type]}
        {e.category && ` · ${CATEGORY_NAME[e.category]}`}
      </p>
      {e.type === 'photo' && e.mediaUrl && <img src={e.mediaUrl} alt="Foto" className="w-full rounded" />}
      {e.type === 'audio' && e.mediaUrl && <audio src={e.mediaUrl} controls className="w-full" />}
      {e.text && <p>{e.text}</p>}
      <p style={{ opacity: 0.75 }}>
        {e.userName}
        {com && ` · ${com.name}`}
        <br />
        {fmtDateTime(e.timestamp)}
      </p>
    </div>
  )
}

function Markers({ events, communities, compact = false }: { events: EventRow[]; communities: Community[]; compact?: boolean }) {
  return (
    <>
      {events
        .filter((e) => e.lat != null)
        .map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.lat!, e.lng!]}
            radius={e.type === 'sos' ? (compact ? 7 : 9) : compact ? 3.5 : 6}
            pathOptions={{ color: '#ffffff', weight: compact ? 1 : 2, fillColor: TYPE_COLOR[e.type], fillOpacity: 1 }}
          >
            <Popup>
              <EventPopup e={e} communities={communities} />
            </Popup>
          </CircleMarker>
        ))}
    </>
  )
}

function GapMarkers({ gaps }: { gaps: Gap[] }) {
  return (
    <>
      {gaps.map((g, i) => (
        <CircleMarker key={`${g.patrolId}-${i}`} center={[g.lat, g.lng]} radius={9} pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '3 3', fillColor: '#f59e0b', fillOpacity: 0.25 }}>
          <Tooltip>
            Zona en sombra · {Math.round((g.toT - g.fromT) / 60000)} min · {g.km.toFixed(1)} km sin señal
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}

export function Legend({ gaps = false }: { gaps?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-2">
      {(Object.keys(TYPE_COLOR) as (keyof typeof TYPE_COLOR)[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />
          {TYPE_LABEL[t]}
        </span>
      ))}
      {gaps && (
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-amber-500 bg-amber-500/30" />
          Zona en sombra
        </span>
      )}
    </div>
  )
}

/** Mapa de cobertura general: zonas recorridas resaltadas + un punto por cada registro. */
export function OverviewMap({ points, events, communities, gaps, height = 'h-80' }: { points: TrackPoint[]; events: EventRow[]; communities: Community[]; gaps: Gap[]; height?: string }) {
  const bounds = useMemo(() => {
    const real = events.filter((e) => e.lat != null && e.communityId !== DEMO)
    const src = real.length ? real : events.filter((e) => e.lat != null)
    return src.map((e) => [e.lat!, e.lng!] as [number, number])
  }, [events])
  return (
    <div className={`${height} w-full overflow-hidden rounded-xl shadow-inner`}>
      <MapContainer center={[-4.1, -80.5]} zoom={9} preferCanvas className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution={ATTR} url={SAT} />
        <Fit positions={bounds} id={`ov-${bounds.length > 0}`} />
        <Coverage points={points} />
        <GapMarkers gaps={gaps} />
        <Markers events={events} communities={communities} compact />
      </MapContainer>
    </div>
  )
}

export interface Guard {
  userId: string
  name: string
  color: string
  km: number
  patrols: number
}

export function buildGuards(patrols: Patrol[]): Guard[] {
  const by = new Map<string, Guard>()
  for (const p of [...patrols].sort((a, b) => a.userName.localeCompare(b.userName))) {
    const g = by.get(p.userId) ?? { userId: p.userId, name: p.userName, color: '', km: 0, patrols: 0 }
    g.km += p.distanceM / 1000
    g.patrols++
    by.set(p.userId, g)
  }
  return [...by.values()].map((g, i) => ({ ...g, color: GUARD_COLORS[i % GUARD_COLORS.length] }))
}

/** Recorridos (líneas por vigilante) y registros (puntos) sobre la imagen satelital. */
export function RoutesMap({
  patrols,
  points,
  events,
  communities,
  guards,
  fitId,
  gaps = [],
  height = 'h-full',
}: {
  patrols: Patrol[]
  points: TrackPoint[]
  events: EventRow[]
  communities: Community[]
  guards: Guard[]
  fitId: string
  gaps?: Gap[]
  height?: string
}) {
  const tracks = useMemo(() => {
    const color = new Map(guards.map((g) => [g.userId, g.color]))
    const by = new Map<string, [number, number][]>()
    for (const pt of [...points].sort((a, b) => a.timestamp - b.timestamp)) {
      const l = by.get(pt.patrolId) ?? []
      l.push([pt.lat, pt.lng])
      by.set(pt.patrolId, l)
    }
    return patrols.filter((p) => by.has(p.id)).map((p) => ({ patrol: p, color: color.get(p.userId) ?? '#38bdf8', positions: by.get(p.id)! }))
  }, [patrols, points, guards])
  const bounds = useMemo(
    () => [...tracks.flatMap((t) => t.positions), ...events.filter((e) => e.lat != null).map((e) => [e.lat!, e.lng!] as [number, number])],
    [tracks, events],
  )
  return (
    <div className={`${height} w-full overflow-hidden rounded-xl shadow-inner`}>
      <MapContainer center={[-4.1, -80.5]} zoom={10} preferCanvas className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution={ATTR} url={SAT} />
        <Fit positions={bounds} id={fitId} />
        {tracks.map((t) => (
          <Polyline key={t.patrol.id} positions={t.positions} pathOptions={{ color: t.color, weight: 3.5, opacity: 0.95 }}>
            <Tooltip sticky>
              <b>{t.patrol.userName}</b>
              <br />
              {fmtDateTime(t.patrol.startedAt)} · {(t.patrol.distanceM / 1000).toFixed(1)} km
            </Tooltip>
          </Polyline>
        ))}
        <GapMarkers gaps={gaps} />
        <Markers events={events} communities={communities} />
      </MapContainer>
    </div>
  )
}

/** Mini mapa estático con el contorno de la zona que abarca la comunidad. */
export function ZoneMiniMap({ hull }: { hull: [number, number][] }) {
  const { theme } = useTheme()
  const color = CHART[theme].coverage
  return (
    <div className="h-full min-h-[220px] w-full overflow-hidden rounded-lg">
      <MapContainer
        center={[-4.1, -80.5]}
        zoom={10}
        className="h-full min-h-[220px] w-full"
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url={SAT} />
        {hull.length > 2 && (
          <>
            <Fit positions={hull} id={`zone-${hull.length}-${hull[0][0].toFixed(3)}`} />
            <Polygon positions={hull} pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.25 }} />
          </>
        )}
      </MapContainer>
    </div>
  )
}

export interface Layers {
  territory: boolean
  visited: boolean
  blind: boolean
  routes: boolean
  records: boolean
}

/** Celdas pintadas sobre el mapa (zonas vigiladas o zonas en sombra) y contorno del territorio. */
function Cells({ rects, color, opacity }: { rects: [[number, number], [number, number]][]; color: string; opacity: number }) {
  const map = useMap()
  useEffect(() => {
    const group = L.featureGroup(rects.map((b) => L.rectangle(b, { stroke: false, fillColor: color, fillOpacity: opacity, interactive: false }))).addTo(map)
    return () => {
      group.remove()
    }
  }, [map, rects, color, opacity])
  return null
}

/** Mapa del territorio: límites de cada comunidad, zonas vigiladas, zonas en sombra (nunca recorridas), rutas y registros. */
export function LayeredMap({
  patrols,
  points,
  events,
  communities,
  guards,
  territories,
  layers,
  fitId,
  height = 'h-full',
  sosOnly = false,
  focus = 'all',
}: {
  focus?: string
  patrols: Patrol[]
  points: TrackPoint[]
  events: EventRow[]
  communities: Community[]
  guards: Guard[]
  territories: Territory[]
  layers: Layers
  fitId: string
  height?: string
  sosOnly?: boolean
}) {
  const tracks = useMemo(() => {
    const color = new Map(guards.map((g) => [g.userId, g.color]))
    const by = new Map<string, [number, number][]>()
    for (const pt of [...points].sort((a, b) => a.timestamp - b.timestamp)) {
      const l = by.get(pt.patrolId) ?? []
      l.push([pt.lat, pt.lng])
      by.set(pt.patrolId, l)
    }
    return patrols.filter((p) => by.has(p.id)).map((p) => ({ patrol: p, color: color.get(p.userId) ?? '#38bdf8', positions: by.get(p.id)! }))
  }, [patrols, points, guards])
  const shown = useMemo(() => (sosOnly ? events.filter((e) => e.type === 'sos') : events), [events, sosOnly])
  const bounds = useMemo(() => {
    const t = territories.filter((x) => focus === 'all' || x.community.id === focus).flatMap((x) => x.boundary)
    if (t.length) return t
    const real = events.filter((e) => e.lat != null && e.communityId !== DEMO)
    const src = real.length ? real : events.filter((e) => e.lat != null)
    return src.map((e) => [e.lat!, e.lng!] as [number, number])
  }, [events, territories, focus])
  const blind = useMemo(() => territories.flatMap((t) => t.blind), [territories])
  const visited = useMemo(() => territories.flatMap((t) => t.visitedRects), [territories])
  return (
    <div className={`${height} w-full overflow-hidden`}>
      <MapContainer center={[-4.1, -80.5]} zoom={9} preferCanvas className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution={ATTR} url={SAT} />
        <Fit positions={bounds} id={`${fitId}-${focus}`} />
        {layers.blind && <Cells rects={blind} color="#9ca3af" opacity={0.62} />}
        {layers.visited && <Cells rects={visited} color="#bef264" opacity={0.5} />}
        {layers.territory &&
          territories.map((t) => (
            <Polygon key={t.community.id} positions={t.boundary} pathOptions={{ color: '#f9cd3b', weight: 3, dashArray: '8 6', fillOpacity: 0 }}>
              <Tooltip sticky>
                <b>{t.community.name}</b>
                <br />
                Territorio ≈ {t.areaHa.toLocaleString('es-PE')} ha · vigilado {t.pctAll.toFixed(0)}% · en sombra {t.blindHa.toLocaleString('es-PE')} ha
              </Tooltip>
            </Polygon>
          ))}
        {layers.routes &&
          tracks.map((t) => (
            <Polyline key={t.patrol.id} positions={t.positions} pathOptions={{ color: t.color, weight: 3, opacity: 0.9 }}>
              <Tooltip sticky>
                <b>{t.patrol.userName}</b>
                <br />
                {fmtDateTime(t.patrol.startedAt)} · {(t.patrol.distanceM / 1000).toFixed(1)} km
              </Tooltip>
            </Polyline>
          ))}
        {layers.records && <Markers events={shown} communities={communities} compact={!sosOnly} />}
      </MapContainer>
    </div>
  )
}

/** Leyenda del mapa del territorio. */
export function TerritoryLegend() {
  const item = (style: React.CSSProperties, label: string) => (
    <span className="flex items-center gap-1.5">
      <i className="inline-block h-3 w-4" style={style} />
      {label}
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
      {item({ border: '2px dashed #f9cd3b' }, 'Límite de la comunidad')}
      {item({ background: '#bef264' }, 'Zona vigilada en el período')}
      {item({ background: '#9ca3af' }, 'Zona en sombra (nunca recorrida)')}
      {(Object.keys(TYPE_COLOR) as (keyof typeof TYPE_COLOR)[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />
          {TYPE_LABEL[t]}
        </span>
      ))}
    </div>
  )
}

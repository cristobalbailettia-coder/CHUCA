import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import { fmtClock, fmtHour, fmtKm1 } from '../../lib/format'
import type { Evidence, Patrol, TrackPoint } from '../../lib/types'
import { BottomSheet, Icon } from './ui'

const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const STYLE = {
  photo: { bg: '#7a4a1d', pin: '#e9a622', icon: 'photo_camera', label: 'Foto' },
  audio: { bg: '#103c26', pin: '#7fb069', icon: 'mic', label: 'Audio' },
  note: { bg: '#4a2a0b', pin: '#c88229', icon: 'edit_note', label: 'Nota' },
  sos: { bg: '#93000a', pin: '#ba1a1a', icon: 'emergency', label: 'SOS' },
} as const

function pin(e: Evidence, n: number) {
  const s = STYLE[e.type]
  return L.divIcon({
    className: '',
    iconSize: [70, 56],
    iconAnchor: [35, 56],
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <span style="display:flex;align-items:center;gap:3px;background:${s.bg};color:#fff;border-radius:6px;padding:2px 6px;font:700 12px 'Plus Jakarta Sans',sans-serif;white-space:nowrap">
        <span class="material-symbols-outlined" style="font-size:14px">${s.icon}</span>${e.type === 'sos' ? 'SOS' : `#${String(n).padStart(2, '0')}`}</span>
      <span style="flex:none;margin-top:3px;width:30px;height:30px;border-radius:50%;background:${s.pin};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:block"></span></div>`,
  })
}

function Fit({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 17 })
    else if (positions.length === 1) map.setView(positions[0], 16)
  }, [map, positions])
  return null
}

/** Pantalla 2.4: mapa del recorrido con la ruta y las evidencias numeradas. */
export default function MapScreen({
  patrol,
  points,
  evidences,
  accuracy,
  title,
  backLabel,
  onBack,
}: {
  patrol: Patrol
  points: TrackPoint[]
  evidences: Evidence[]
  accuracy: number | null
  title: string
  backLabel: string
  onBack: () => void
}) {
  const [now, setNow] = useState(Date.now())
  const [view, setView] = useState<Evidence>()
  useEffect(() => {
    if (patrol.status !== 'active') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [patrol.status])
  const end = patrol.status === 'active' ? now : (patrol.endedAt ?? now)
  const line = useMemo(() => points.map((p) => [p.lat, p.lng] as [number, number]), [points])
  const located = evidences.filter((e) => e.lat != null)
  const all = useMemo(() => [...line, ...located.map((e) => [e.lat!, e.lng!] as [number, number])], [line, located])
  const numbered = useMemo(() => {
    const c = { photo: 0, audio: 0, note: 0, sos: 0 }
    return [...evidences].sort((a, b) => a.timestamp - b.timestamp).map((e) => ({ e, n: ++c[e.type] }))
  }, [evidences])
  const last = numbered[numbered.length - 1]
  const photoUrl = useBlobUrl(view?.blob)

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary shadow-[0_4px_16px_rgba(0,34,24,0.18)]">
        <div className="flex h-14 items-center justify-between gap-space-sm px-margin">
          <div className="flex min-w-0 items-center gap-space-sm">
            <button onClick={onBack} aria-label="Volver" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-transform active:scale-95">
              <Icon name="arrow_back" />
            </button>
            <h1 className="text-[17px] font-extrabold leading-tight text-white">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-container px-2 py-1 text-[10px] font-extrabold uppercase text-on-secondary-container">
            <Icon name="satellite_alt" size={16} /> GPS {patrol.status === 'active' ? 'ACTIVO' : 'REGISTRADO'}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-space-sm overflow-y-auto px-margin pb-space-md pt-space-sm">
        <section className="shrink-0 rounded-xl bg-surface-container-lowest p-space-sm shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[12px] font-medium uppercase text-on-surface-variant">CUSTODIO FORESTAL</div>
              <div className="truncate text-body-lg font-extrabold text-on-surface">{patrol.custodianName}</div>
            </div>
            {accuracy != null && patrol.status === 'active' && <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-[13px] font-bold text-on-secondary-container">±{Math.round(accuracy)}m</span>}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-container-low p-2">
              <div className="text-[11px] text-on-surface-variant">TIEMPO ACTIVO</div>
              <div className="tnum text-[18px] font-extrabold text-on-surface">{fmtClock(end - patrol.startedAt)}</div>
            </div>
            <div className="rounded-lg bg-surface-container-low p-2">
              <div className="text-[11px] text-on-surface-variant">DISTANCIA</div>
              <div className="tnum text-[18px] font-extrabold text-secondary">{fmtKm1(patrol.distanceM)}</div>
            </div>
            <div className="rounded-lg bg-surface-container-low p-2">
              <div className="text-[11px] text-on-surface-variant">PUNTOS GPS</div>
              <div className="tnum text-[18px] font-extrabold text-on-surface">{points.length} pts</div>
            </div>
          </div>
        </section>

        <section className="relative h-[360px] shrink-0 overflow-hidden rounded-xl shadow-md">
          <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-lg bg-primary-container/95 px-3 py-1.5 text-white shadow">
            <Icon name="forest" size={20} className="text-secondary-container" />
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase text-secondary-container">SECTOR MONITOREADO</div>
              <div className="text-[13px] font-extrabold">Ruta {patrol.code}</div>
            </div>
          </div>
          {all.length === 0 ? (
            <div className="grid h-full place-items-center bg-primary-container p-6 text-center text-body-md text-white/80">Aún no hay puntos GPS. Espere unos segundos con el GPS activo.</div>
          ) : (
            <MapContainer center={all[0]} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer attribution="Tiles &copy; Esri" url={SAT} />
              <Fit positions={all} />
              {line.length > 1 && (
                <>
                  <Polyline positions={line} pathOptions={{ color: '#103c26', weight: 9, opacity: 0.75 }} />
                  <Polyline positions={line} pathOptions={{ color: '#f9cd3b', weight: 5, opacity: 1 }} />
                </>
              )}
              {line.length > 0 && (
                <Marker
                  position={line[0]}
                  icon={L.divIcon({
                    className: '',
                    iconSize: [90, 40],
                    iconAnchor: [14, 14],
                    html: `<div style="display:flex;align-items:center;gap:6px"><span style="flex:none;width:28px;height:28px;border-radius:50%;background:#103c26;border:3px solid #fff;display:block"></span><span style="background:#fff;border-radius:6px;padding:2px 6px;font:800 11px 'Plus Jakarta Sans',sans-serif;color:#103c26;white-space:nowrap">PUNTO BASE</span></div>`,
                  })}
                />
              )}
              {numbered.filter(({ e }) => e.lat != null).map(({ e, n }) => <Marker key={e.id} position={[e.lat!, e.lng!]} icon={pin(e, n)} />)}
            </MapContainer>
          )}
        </section>

        {last && (
          <button onClick={() => setView(last.e)} className="flex shrink-0 items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm text-left shadow-md active:scale-[0.99]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: STYLE[last.e.type].bg }}>
              <Icon name={STYLE[last.e.type].icon} size={30} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-body-lg font-extrabold">{STYLE[last.e.type].label} #{String(last.n).padStart(2, '0')}</span>
                <span className="tnum text-[13px] text-on-surface-variant">{fmtHour(last.e.timestamp)}</span>
              </div>
              <div className="truncate text-body-sm text-on-surface-variant">{last.e.text ?? 'Registrado con ubicación GPS'}</div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
              <Icon name="visibility" />
            </div>
          </button>
        )}
      </main>

      <footer className="shrink-0 px-margin pb-safe pt-space-xs">
        <button onClick={onBack} className="mb-2 flex h-16 w-full items-center justify-center gap-space-sm rounded-xl bg-primary text-label-action text-white shadow-lg active:translate-y-0.5">
          <Icon name="arrow_back" size={28} /> {backLabel}
        </button>
      </footer>

      {view && (
        <BottomSheet tone="primary" onClose={() => setView(undefined)}>
          <h3 className="mb-2 text-headline-md">{STYLE[view.type].label}</h3>
          {view.type === 'photo' && photoUrl && <img src={photoUrl} alt="Foto" className="mb-3 max-h-72 w-full rounded-xl object-cover" />}
          {view.text && <p className="mb-3 text-body-lg">{view.text}</p>}
          <button onClick={() => setView(undefined)} className="h-14 w-full rounded-xl bg-surface-container-high text-label-action">CERRAR</button>
        </BottomSheet>
      )}
    </div>
  )
}

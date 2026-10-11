import type { EventRow, Patrol, TrackPoint } from './types'
import { TYPE_LABEL } from './colors'

export type RouteFormat = 'gpx' | 'geojson' | 'kml'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const iso = (t: number) => new Date(t).toISOString()
const label = (e: EventRow) => `${TYPE_LABEL[e.type]}${e.text ? `: ${e.text}` : ''}`

function download(name: string, mime: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Exporta la ruta de un recorrido (línea + puntos de registro) en GPX, GeoJSON o KML. */
export function exportRoute(format: RouteFormat, patrol: Patrol, points: TrackPoint[], events: EventRow[]) {
  const pts = [...points].sort((a, b) => a.timestamp - b.timestamp)
  const evs = events.filter((e) => e.lat != null)
  const name = `ruta-${patrol.code}`

  if (format === 'geojson') {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'ruta', codigo: patrol.code, vigilante: patrol.userName, inicio: iso(patrol.startedAt), fin: patrol.endedAt ? iso(patrol.endedAt) : null, km: +(patrol.distanceM / 1000).toFixed(3) },
          geometry: { type: 'LineString', coordinates: pts.map((p) => [p.lng, p.lat]) },
        },
        ...evs.map((e) => ({
          type: 'Feature',
          properties: { kind: 'registro', tipo: e.type, categoria: e.category ?? null, texto: e.text ?? null, hora: iso(e.timestamp) },
          geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
        })),
      ],
    }
    return download(`${name}.geojson`, 'application/geo+json', JSON.stringify(fc, null, 2))
  }

  if (format === 'gpx') {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AIDER" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(patrol.code)}</name><desc>${esc(`Recorrido de ${patrol.userName}`)}</desc><time>${iso(patrol.startedAt)}</time></metadata>
${evs.map((e) => `  <wpt lat="${e.lat}" lon="${e.lng}"><time>${iso(e.timestamp)}</time><name>${esc(TYPE_LABEL[e.type])}</name><desc>${esc(label(e))}</desc></wpt>`).join('\n')}
  <trk>
    <name>${esc(patrol.code)}</name>
    <trkseg>
${pts.map((p) => `      <trkpt lat="${p.lat}" lon="${p.lng}"><time>${iso(p.timestamp)}</time></trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>
`
    return download(`${name}.gpx`, 'application/gpx+xml', gpx)
  }

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(patrol.code)}</name>
    <Style id="ruta"><LineStyle><color>fff5a50e</color><width>4</width></LineStyle></Style>
    <Placemark>
      <name>${esc(`Ruta ${patrol.code} · ${patrol.userName}`)}</name>
      <styleUrl>#ruta</styleUrl>
      <LineString><tessellate>1</tessellate><coordinates>${pts.map((p) => `${p.lng},${p.lat},0`).join(' ')}</coordinates></LineString>
    </Placemark>
${evs.map((e) => `    <Placemark><name>${esc(TYPE_LABEL[e.type])}</name><description>${esc(label(e))}</description><TimeStamp><when>${iso(e.timestamp)}</when></TimeStamp><Point><coordinates>${e.lng},${e.lat},0</coordinates></Point></Placemark>`).join('\n')}
  </Document>
</kml>
`
  download(`${name}.kml`, 'application/vnd.google-earth.kml+xml', kml)
}

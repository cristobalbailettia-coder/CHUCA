import { useMemo, useState } from 'react'
import { Card, Chip, Icon, SectionTitle } from '../components/ui'
import { useDash } from '../hooks/useDash'
import { useExport } from '../hooks/useExport'
import { useUI } from '../hooks/useUI'
import { EXPORT_LABEL, type ExportKind } from '../lib/exporters'
import { communityLabel } from '../lib/stats'
import { fmtDateTime } from '../lib/time'

const EXPORTS: { kind: ExportKind; icon: string; title: string; text: string }[] = [
  { kind: 'pdf', icon: 'picture_as_pdf', title: 'Informe técnico', text: 'PDF con membrete: cifras clave, SOS y lista de recorridos.' },
  { kind: 'resumen', icon: 'description', title: 'Resumen comunal', text: 'PDF con una ficha por comunidad.' },
  { kind: 'csv', icon: 'table_chart', title: 'Telemetría', text: 'CSV para Excel: un patrullaje por fila.' },
  { kind: 'geojson', icon: 'polyline', title: 'Trazas GPS', text: 'GeoJSON para QGIS, ArcGIS o Google Earth.' },
]

const URGENCY_TONE = { alta: 'danger', media: 'gold', baja: 'ok' } as const

/** Reportes de patrullaje: lista filtrable, detalle en panel lateral y exportación. */
export default function Reportes() {
  const { data, view } = useDash()
  const ui = useUI()
  const { run, busy, empty } = useExport()
  const [shown, setShown] = useState(15)
  const [menu, setMenu] = useState(false)

  const rows = useMemo(() => {
    if (!view) return []
    const evBy = new Map<string, typeof view.events>()
    view.events.forEach((e) => evBy.set(e.patrolId, [...(evBy.get(e.patrolId) ?? []), e]))
    return [...view.patrols].sort((a, b) => b.startedAt - a.startedAt).map((p) => ({ p, evs: evBy.get(p.id) ?? [] }))
  }, [view])
  if (!data || !view) return <p className="py-20 text-center text-ink-2">Cargando reportes…</p>

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <SectionTitle
        icon="description"
        title={`${rows.length} reportes`}
        hint="Haz clic en un reporte para ver la ruta, el resumen de Gemini y revisar sus evidencias"
        action={
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-on-brand shadow-sm hover:opacity-90">
              <Icon name="file_download" size={18} /> Exportar informes <Icon name="expand_more" size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-full z-[1400] mt-2 w-[min(92vw,420px)] rounded-2xl border border-line bg-surface p-2 shadow-xl">
                <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-2">Se exporta según los filtros activos</p>
                {EXPORTS.map((x) => (
                  <button
                    key={x.kind}
                    disabled={empty || busy !== null}
                    onClick={() => {
                      setMenu(false)
                      void run(x.kind)
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-surface-2 disabled:opacity-40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-ochre">
                      <Icon name={x.icon} size={22} />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[14px] font-extrabold">{EXPORT_LABEL[x.kind]}</span>
                      <span className="block text-[12px] text-ink-2">{x.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />
      {busy && <p className="rounded-xl bg-gold-soft px-4 py-2.5 text-[13px] font-semibold text-ochre">Generando {EXPORT_LABEL[busy].toLowerCase()}…</p>}

      <Card className="overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-surface-2 text-[13px] font-semibold text-ink">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Custodio</th>
                <th className="px-4 py-3">Comunidad</th>
                <th className="px-4 py-3 text-right">Km</th>
                <th className="px-4 py-3">Evidencias</th>
                <th className="px-4 py-3">Urgencia</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-ink-2">
                    No hay reportes con los filtros actuales.
                  </td>
                </tr>
              )}
              {rows.slice(0, shown).map(({ p, evs }) => {
                const sos = evs.filter((e) => e.type === 'sos')
                const openSos = sos.some((e) => e.sosStatus !== 'resuelto')
                const n = (t: string) => evs.filter((e) => e.type === t).length
                const urg = p.keyData?.urgencia
                return (
                  <tr key={p.id} onClick={() => ui.openReport(p.id)} className="cursor-pointer border-t border-line transition hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <span className="tnum whitespace-nowrap rounded-lg bg-gold-soft px-2 py-1 font-mono text-[12px] font-extrabold text-ochre">{p.code}</span>
                    </td>
                    <td className="tnum px-4 py-3 text-ink-2">{fmtDateTime(p.startedAt)}</td>
                    <td className="px-4 py-3 font-bold">{p.userName}</td>
                    <td className="px-4 py-3 text-ink-2">{communityLabel(data.communities.find((c) => c.id === p.communityId))}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{(p.distanceM / 1000).toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className="tnum inline-flex items-center gap-2.5 text-[12px] text-ink-2">
                        <span className="inline-flex items-center gap-0.5"><Icon name="photo_camera" size={14} />{n('photo')}</span>
                        <span className="inline-flex items-center gap-0.5"><Icon name="mic" size={14} />{n('audio')}</span>
                        <span className="inline-flex items-center gap-0.5"><Icon name="edit_note" size={14} />{n('note')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">{urg ? <Chip tone={URGENCY_TONE[urg]}>{urg.toUpperCase()}</Chip> : <span className="text-ink-2">—</span>}</td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <Chip tone="danger">EN CURSO</Chip>
                      ) : sos.length ? (
                        <Chip tone={openSos ? 'danger' : 'ok'}>
                          <Icon name="emergency" size={13} fill /> SOS {openSos ? 'pendiente' : 'resuelto'}
                        </Chip>
                      ) : (
                        <Chip tone="neutral">Normal</Chip>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {rows.length > shown && (
        <button onClick={() => setShown(shown + 15)} className="mx-auto block rounded-xl border border-line bg-surface px-5 py-2.5 text-[13px] font-bold hover:bg-surface-2">
          Ver más ({rows.length - shown} restantes)
        </button>
      )}
    </div>
  )
}

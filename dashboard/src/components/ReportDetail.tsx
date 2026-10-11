import { useState } from 'react'
import { Link } from 'react-router-dom'
import { regenerateSummary, reviewEvidence } from '../hooks/useDashboardData'
import { useUI } from '../hooks/useUI'
import { CATEGORY_NAME, SOS_LABEL, TYPE_ICON, TYPE_LABEL } from '../lib/colors'
import { exportRoute, type RouteFormat } from '../lib/routeExport'
import { fmtDateTime, fmtTime } from '../lib/time'
import type { Community, EventRow, Patrol, ReviewStatus, TrackPoint } from '../lib/types'
import { SOS_TONE } from './SosDetail'
import { Legend, RoutesMap, buildGuards } from './maps'
import { Chip, Icon, Modal, btnGhost, btnPrimary } from './ui'

export const routeLink = (code: string) => `${window.location.origin}/ruta/${code}`

const URGENCY: Record<string, 'danger' | 'gold' | 'ok'> = { alta: 'danger', media: 'gold', baja: 'ok' }
const REVIEW_TONE: Record<ReviewStatus, 'neutral' | 'ok' | 'danger'> = { pendiente: 'neutral', aprobada: 'ok', descartada: 'danger' }

function Chips({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-2">{label}</span>
      {items.map((i) => (
        <Chip key={i} tone="neutral">
          {i}
        </Chip>
      ))}
    </div>
  )
}

/** Una evidencia con su revisión: aprobar, descartar o dejar un comentario. */
function EvidenceItem({ e, onZoom, onChanged }: { e: EventRow; onZoom: (url: string) => void; onChanged: () => void }) {
  const [note, setNote] = useState(e.reviewNote ?? '')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const save = async (status: ReviewStatus, withNote = false) => {
    setBusy(true)
    try {
      await reviewEvidence(e.id, status, withNote ? note.trim() : undefined)
      onChanged()
      if (withNote) setOpen(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={`rounded-xl border bg-surface p-3 ${e.reviewStatus === 'descartada' ? 'border-danger/40 opacity-75' : 'border-line'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink-2">
          <Icon name={TYPE_ICON[e.type]} size={15} /> {TYPE_LABEL[e.type]}
          {e.category && ` · ${CATEGORY_NAME[e.category]}`} · <span className="tnum">{fmtTime(e.timestamp)}</span>
        </span>
        <Chip tone={REVIEW_TONE[e.reviewStatus]}>{e.reviewStatus === 'pendiente' ? 'Por revisar' : e.reviewStatus === 'aprobada' ? 'Aprobada' : 'Descartada'}</Chip>
      </div>
      {e.type === 'photo' && e.mediaUrl && (
        <button onClick={() => onZoom(e.mediaUrl!)} className="mb-2 block w-full overflow-hidden rounded-lg">
          <img src={e.mediaUrl} alt={e.text ?? 'Foto'} className="aspect-[16/10] w-full object-cover transition hover:scale-[1.03]" />
        </button>
      )}
      {e.type === 'audio' && e.mediaUrl && <audio src={e.mediaUrl} controls className="mb-2 h-9 w-full" />}
      {e.text && <p className="mb-2 text-[13px] leading-snug">{e.text}</p>}
      {e.reviewNote && !open && (
        <p className="mb-2 flex gap-1.5 rounded-lg bg-gold-soft px-2.5 py-1.5 text-[12px] text-ochre">
          <Icon name="comment" size={14} className="mt-0.5" /> {e.reviewNote}
        </p>
      )}
      {open && (
        <div className="mb-2 flex gap-2">
          <input value={note} onChange={(x) => setNote(x.target.value)} placeholder="Escribe un comentario…" className="min-w-0 flex-1 rounded-lg border border-line bg-page px-2.5 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-gold" />
          <button disabled={busy} onClick={() => save(e.reviewStatus, true)} className={btnPrimary}>
            Guardar
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button disabled={busy || e.reviewStatus === 'aprobada'} onClick={() => save('aprobada')} className="inline-flex items-center gap-1 rounded-lg bg-ok-soft px-2.5 py-1 text-[12px] font-bold text-ok disabled:opacity-40">
          <Icon name="check_circle" size={15} /> Aprobar
        </button>
        <button disabled={busy || e.reviewStatus === 'descartada'} onClick={() => save('descartada')} className="inline-flex items-center gap-1 rounded-lg bg-danger-soft px-2.5 py-1 text-[12px] font-bold text-danger disabled:opacity-40">
          <Icon name="cancel" size={15} /> Descartar
        </button>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[12px] font-bold text-ink-2 hover:text-ink">
          <Icon name="comment" size={15} /> Comentar
        </button>
        {e.reviewStatus !== 'pendiente' && (
          <button disabled={busy} onClick={() => save('pendiente')} className="px-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink">
            Deshacer
          </button>
        )}
      </div>
    </div>
  )
}

/** Detalle de un reporte: ruta, resumen de Gemini, SOS, notas y evidencias revisables. */
export default function ReportDetail({
  patrol,
  points,
  events,
  communities,
  onChanged,
  large = false,
  showOpenLink = true,
}: {
  patrol: Patrol
  points: TrackPoint[]
  events: EventRow[]
  communities: Community[]
  onChanged: () => void
  large?: boolean
  showOpenLink?: boolean
}) {
  const ui = useUI()
  const [photo, setPhoto] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menu, setMenu] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const guards = buildGuards([patrol])
  const sos = events.filter((e) => e.type === 'sos')
  const evidences = events.filter((e) => e.type !== 'sos' && (e.mediaUrl || e.text))
  const k = patrol.keyData

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(routeLink(patrol.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sin permiso de portapapeles */
    }
  }
  const regenerate = async () => {
    setBusy(true)
    setAiMsg('')
    const r = await regenerateSummary(patrol.id)
    setBusy(false)
    if (r === 'ok') onChanged()
    setAiMsg(r === 'ok' ? '' : r === 'pending_config' ? 'Gemini aún no está configurado (falta la clave).' : 'No se pudo generar el resumen. Intenta de nuevo.')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tnum rounded-xl bg-gold-soft px-3 py-1.5 font-mono text-[13px] font-extrabold tracking-wider text-ochre">{patrol.code}</span>
        {patrol.active && (
          <Chip tone="danger">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-danger" /> EN CURSO
          </Chip>
        )}
        {showOpenLink && (
          <Link to={`/ruta/${patrol.code}`} onClick={ui.closeDrawer} className={btnGhost}>
            <Icon name="open_in_full" size={15} /> Abrir página
          </Link>
        )}
        <button onClick={copy} className={btnGhost}>
          <Icon name="link" size={15} /> {copied ? '¡Copiado!' : 'Copiar enlace'}
        </button>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className={btnPrimary}>
            <Icon name="file_download" size={15} /> Exportar ruta
          </button>
          {menu && (
            <div className="absolute left-0 top-full z-[1200] mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {(['gpx', 'geojson', 'kml'] as RouteFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    exportRoute(f, patrol, points, events)
                    setMenu(false)
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-surface-2"
                >
                  {f === 'gpx' ? 'GPX (celular / GPS)' : f === 'geojson' ? 'GeoJSON' : 'KML (Google Earth)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {sos.map((s) => (
        <div key={s.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 ${s.sosStatus === 'resuelto' ? 'border-line bg-surface' : 'border-danger/50 bg-danger-soft'}`}>
          <div>
            <p className="flex flex-wrap items-center gap-2 font-extrabold">
              <Icon name="emergency" size={18} className={s.sosStatus === 'resuelto' ? 'text-ok' : 'text-danger'} fill />
              Alerta SOS · {fmtDateTime(s.timestamp)}
              <Chip tone={SOS_TONE[s.sosStatus]}>{SOS_LABEL[s.sosStatus]}</Chip>
            </p>
            <p className="tnum text-[13px] text-ink-2">{s.lat != null ? `${s.lat.toFixed(5)}, ${s.lng!.toFixed(5)}` : 'Sin ubicación registrada'}</p>
          </div>
          <button onClick={() => ui.openSos(s.id)} className={btnPrimary}>
            <Icon name="open_in_new" size={15} /> Ver y atender
          </button>
        </div>
      ))}

      <div>
        <div className={`${large ? 'h-[480px]' : 'h-72'} overflow-hidden rounded-2xl border border-line`}>
          <RoutesMap patrols={[patrol]} points={points} events={events} communities={communities} guards={guards} gaps={[]} fitId={`rep-${patrol.id}-${patrol.active}`} />
        </div>
        <div className="mt-2">
          <Legend />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-ochre">
            <Icon name="auto_awesome" size={16} /> Resumen con Gemini
          </p>
          {!patrol.active && (
            <button onClick={regenerate} disabled={busy} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-2 hover:text-ink disabled:opacity-50">
              <Icon name="refresh" size={14} className={busy ? 'animate-spin' : ''} /> Regenerar
            </button>
          )}
        </div>
        <p className="text-[14px] leading-relaxed">{patrol.active ? 'El resumen se genera cuando el custodio finaliza el recorrido.' : (patrol.summary ?? 'El resumen se generará automáticamente.')}</p>
        {aiMsg && <p className="mt-2 text-[12px] text-danger">{aiMsg}</p>}
        {k && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-2">Urgencia</span>
              {k.urgencia && <Chip tone={URGENCY[k.urgencia]}>{k.urgencia.toUpperCase()}</Chip>}
            </div>
            <Chips label="Incidentes" items={k.incidentes} />
            <Chips label="Fauna" items={k.fauna} />
            {k.acciones?.length ? (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-2">Acciones sugeridas</span>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px]">
                  {k.acciones.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-ink-2">
          <Icon name="fact_check" size={16} /> Evidencias para revisar ({evidences.length})
        </p>
        {evidences.length === 0 && <p className="rounded-xl border border-line bg-surface p-3 text-[13px] text-ink-2">Este reporte no tiene fotos, audios ni notas.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {evidences.map((e) => (
            <EvidenceItem key={e.id} e={e} onZoom={setPhoto} onChanged={onChanged} />
          ))}
        </div>
      </div>

      {photo && (
        <Modal title="Fotografía del reporte" onClose={() => setPhoto(undefined)}>
          <img src={photo} alt="Fotografía del reporte" className="w-full rounded-xl" />
        </Modal>
      )}
    </div>
  )
}

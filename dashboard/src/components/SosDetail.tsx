import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { setSosStatus } from '../hooks/useDashboardData'
import { useDash } from '../hooks/useDash'
import { SOS_LABEL } from '../lib/colors'
import { communityLabel } from '../lib/stats'
import { ago, fmtDateTime } from '../lib/time'
import type { EventRow, SosStatus } from '../lib/types'
import { RoutesMap, buildGuards } from './maps'
import { Avatar, Chip, Icon, btnGhost, btnPrimary } from './ui'

export const SOS_TONE: Record<SosStatus, 'danger' | 'gold' | 'ok'> = { nuevo: 'danger', en_atencion: 'gold', resuelto: 'ok' }
const STEPS: SosStatus[] = ['nuevo', 'en_atencion', 'resuelto']

/** Todo lo que el equipo necesita ante un SOS: quién es, dónde está, cómo llegar y el estado de la atención. */
export default function SosDetail({ event: e, mapHeight = 'h-64' }: { event: EventRow; mapHeight?: string }) {
  const { data, refresh } = useDash()
  const [note, setNote] = useState(e.sosNote ?? '')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const patrol = data?.patrols.find((p) => p.id === e.patrolId)
  const member = data?.members.find((m) => m.id === e.userId)
  const community = data?.communities.find((c) => c.id === e.communityId)
  const points = useMemo(() => (data?.points ?? []).filter((p) => p.patrolId === e.patrolId).sort((a, b) => a.timestamp - b.timestamp), [data, e.patrolId])
  const events = useMemo(() => (data?.events ?? []).filter((x) => x.patrolId === e.patrolId), [data, e.patrolId])
  const last = points[points.length - 1]
  const lat = e.lat ?? last?.lat
  const lng = e.lng ?? last?.lng

  const change = async (s: SosStatus) => {
    setBusy(true)
    try {
      await setSosStatus(e.id, s, note.trim() || undefined)
      await refresh()
    } finally {
      setBusy(false)
    }
  }
  const saveNote = async () => {
    setBusy(true)
    try {
      await setSosStatus(e.id, e.sosStatus, note.trim())
      await refresh()
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    if (lat == null) return
    try {
      await navigator.clipboard.writeText(`${lat},${lng}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin permiso de portapapeles */
    }
  }

  const info = (icon: string, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={18} className="mt-0.5 text-ochre" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-2">{label}</p>
        <p className="text-[14px] font-semibold">{value}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const on = e.sosStatus === s
          const cls = on ? (s === 'nuevo' ? 'bg-danger text-on-danger' : s === 'en_atencion' ? 'bg-gold text-[#3a2a05]' : 'bg-ok text-on-brand') : 'bg-surface-2 text-ink-2 hover:bg-line'
          return (
            <button key={s} disabled={busy || on} onClick={() => change(s)} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-extrabold transition ${cls}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[11px]">{i + 1}</span>
              {SOS_LABEL[s]}
              {on && <Icon name="check" size={16} />}
            </button>
          )
        })}
        <span className="text-[12px] text-ink-2">{e.sosUpdatedAt ? `Actualizado ${ago(e.sosUpdatedAt)}` : `Recibido ${ago(e.timestamp)}`}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <Avatar name={e.userName} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-extrabold">{e.userName}</p>
              <p className="truncate text-[13px] text-ink-2">{member?.brigadeRole ?? 'Custodio'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {info('badge', 'DNI', member?.dni ?? '—')}
            {info('cake', 'Edad', member?.age ? `${member.age} años` : '—')}
            {info('groups', 'Comunidad', communityLabel(community) || '—')}
            {info('landscape', 'Zona', community?.nearbyReserve ?? '—')}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <div className="grid grid-cols-1 gap-3">
            {info('emergency', 'Hora de la alerta', `${fmtDateTime(e.timestamp)} · ${ago(e.timestamp)}`)}
            {info('my_location', 'Ubicación del SOS', lat != null ? <span className="tnum">{lat.toFixed(5)}, {lng!.toFixed(5)}</span> : 'Sin ubicación registrada')}
            {info('gps_fixed', 'Último punto GPS del recorrido', last ? <span className="tnum">{last.lat.toFixed(5)}, {last.lng.toFixed(5)} · {ago(last.timestamp)}</span> : 'Sin puntos GPS todavía')}
          </div>
          {lat != null && (
            <div className="flex flex-wrap gap-2">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`} target="_blank" rel="noreferrer" className={btnPrimary}>
                <Icon name="navigation" size={16} /> Cómo llegar
              </a>
              <button onClick={copy} className={btnGhost}>
                <Icon name="content_copy" size={16} /> {copied ? '¡Copiado!' : 'Copiar coordenadas'}
              </button>
            </div>
          )}
          {patrol && (
            <Link to={`/ruta/${patrol.code}`} className="inline-flex items-center gap-1 text-[13px] font-bold text-brand hover:underline">
              Ruta {patrol.code} {patrol.active && <Chip tone="danger">EN CURSO</Chip>} <Icon name="arrow_forward" size={15} />
            </Link>
          )}
        </div>
      </div>

      {patrol && (
        <div className={`${mapHeight} overflow-hidden rounded-2xl border border-line`}>
          <RoutesMap patrols={[patrol]} points={points} events={events} communities={data?.communities ?? []} guards={buildGuards([patrol])} gaps={[]} fitId={`sos-${e.id}-${points.length}`} />
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-2">Nota de atención</p>
        <textarea value={note} onChange={(x) => setNote(x.target.value)} rows={3} placeholder="Ej.: Se contactó al presidente de la comunidad; brigada en camino." className="w-full resize-none rounded-xl border border-line bg-page p-3 text-[14px] outline-none focus:ring-2 focus:ring-gold" />
        <div className="mt-2 flex justify-end">
          <button onClick={saveNote} disabled={busy || note.trim() === (e.sosNote ?? '')} className={btnPrimary}>
            <Icon name="save" size={16} /> Guardar nota
          </button>
        </div>
      </div>
    </div>
  )
}

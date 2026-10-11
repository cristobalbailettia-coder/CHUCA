import { useMemo } from 'react'
import { useDash } from '../hooks/useDash'
import { useUI } from '../hooks/useUI'
import { communityLabel, coverageStats } from '../lib/stats'
import { fmtDate } from '../lib/time'
import type { Member } from '../lib/types'
import { Avatar, Chip, Icon } from './ui'

/** Perfil de un custodio: datos personales, resumen de su actividad y sus últimos recorridos. */
export default function CustodianDetail({ member: m }: { member: Member }) {
  const { data } = useDash()
  const ui = useUI()
  const stats = useMemo(() => {
    const patrols = (data?.patrols ?? []).filter((p) => p.userId === m.id).sort((a, b) => b.startedAt - a.startedAt)
    const ids = new Set(patrols.map((p) => p.id))
    const evs = (data?.events ?? []).filter((e) => ids.has(e.patrolId))
    const pts = (data?.points ?? []).filter((p) => ids.has(p.patrolId))
    return {
      patrols,
      km: patrols.reduce((s, p) => s + p.distanceM, 0) / 1000,
      ha: coverageStats(pts).ha,
      photos: evs.filter((e) => e.type === 'photo').length,
      audios: evs.filter((e) => e.type === 'audio').length,
      notes: evs.filter((e) => e.type === 'note').length,
      sos: evs.filter((e) => e.type === 'sos').length,
      hours: Math.round(patrols.reduce((s, p) => s + ((p.endedAt ?? p.startedAt) - p.startedAt), 0) / 3600000),
    }
  }, [data, m.id])
  const com = data?.communities.find((c) => c.id === m.communityId)

  const kpi = (icon: string, label: string, value: string | number) => (
    <div className="rounded-xl border border-line bg-surface p-3">
      <Icon name={icon} size={18} className="text-ochre" />
      <p className="tnum mt-1 font-display text-[24px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-2">{label}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <Avatar name={m.name} size={64} />
        <div className="min-w-0">
          <p className="text-xl font-black leading-tight">{m.name}</p>
          <p className="text-[13px] text-ink-2">{communityLabel(com)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.brigadeRole && <Chip tone="ok">{m.brigadeRole}</Chip>}
            <Chip tone="neutral">DNI {m.dni ?? '—'}</Chip>
            {m.age && <Chip tone="neutral">{m.age} años</Chip>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpi('route', 'Patrullajes', stats.patrols.length)}
        {kpi('straighten', 'Kilómetros', stats.km.toFixed(1))}
        {kpi('forest', 'Hectáreas', stats.ha.toLocaleString('es-PE'))}
        {kpi('emergency', 'Alertas SOS', stats.sos)}
        {kpi('photo_camera', 'Fotos', stats.photos)}
        {kpi('mic', 'Audios', stats.audios)}
        {kpi('edit_note', 'Notas', stats.notes)}
        {kpi('timer', 'Horas de recorrido', stats.hours)}
      </div>

      <div>
        <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-ink-2">Últimos recorridos</p>
        <div className="space-y-2">
          {stats.patrols.length === 0 && <p className="text-[13px] text-ink-2">Todavía no tiene recorridos.</p>}
          {stats.patrols.slice(0, 8).map((p) => (
            <button key={p.id} onClick={() => ui.openReport(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:bg-surface-2">
              <span className="tnum rounded-lg bg-gold-soft px-2 py-1 font-mono text-[12px] font-extrabold text-ochre">{p.code}</span>
              <span className="flex-1 text-[13px] font-semibold">{fmtDate(p.startedAt)}</span>
              <span className="tnum text-[13px] text-ink-2">{(p.distanceM / 1000).toFixed(1)} km</span>
              <Icon name="chevron_right" size={18} className="text-ink-2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

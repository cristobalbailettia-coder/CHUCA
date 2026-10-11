import { useMemo, useState } from 'react'
import SosDetail, { SOS_TONE } from '../components/SosDetail'
import { Avatar, Card, Chip, Icon, fieldCls } from '../components/ui'
import { useDash } from '../hooks/useDash'
import { SOS_LABEL } from '../lib/colors'
import { communityLabel } from '../lib/stats'
import { ago, fmtDateTime } from '../lib/time'
import type { SosStatus } from '../lib/types'

const TABS: ['todos' | SosStatus, string, string][] = [
  ['todos', 'Todos', 'list'],
  ['nuevo', 'Nuevos', 'notification_important'],
  ['en_atencion', 'En atención', 'support_agent'],
  ['resuelto', 'Resueltos', 'task_alt'],
]

/** REPORTES SOS: todas las alertas con su estado; cada una se despliega con contacto, ubicación y atención. */
export default function ReportesSos() {
  const { data } = useDash()
  const [tab, setTab] = useState<'todos' | SosStatus>('nuevo')
  const [open, setOpen] = useState<string>()
  const [community, setCommunity] = useState('all')
  const [shown, setShown] = useState(12)

  const all = useMemo(
    () =>
      (data?.events ?? [])
        .filter((e) => e.type === 'sos' && (community === 'all' || e.communityId === community))
        .sort((a, b) => {
          const rank = (s: SosStatus) => (s === 'nuevo' ? 0 : s === 'en_atencion' ? 1 : 2)
          return rank(a.sosStatus) - rank(b.sosStatus) || b.timestamp - a.timestamp
        }),
    [data, community],
  )
  const count = (s: 'todos' | SosStatus) => (s === 'todos' ? all.length : all.filter((e) => e.sosStatus === s).length)
  const list = all.filter((e) => tab === 'todos' || e.sosStatus === tab)
  if (!data) return <p className="py-20 text-center text-ink-2">Cargando alertas…</p>

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {(['nuevo', 'en_atencion', 'resuelto'] as SosStatus[]).map((s) => (
          <Card key={s} className={`p-4 ${s === 'nuevo' && count(s) > 0 ? 'border-danger/50 bg-danger-soft' : ''}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-2">{SOS_LABEL[s]}</p>
            <p className={`tnum font-display text-[36px] font-black leading-none ${s === 'nuevo' ? 'text-danger' : s === 'en_atencion' ? 'text-ochre' : 'text-ok'}`}>{count(s)}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
          {TABS.map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k)
                setShown(12)
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${tab === k ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-2 hover:text-ink'}`}
            >
              <Icon name={icon} size={16} /> {label}
              <span className="tnum rounded-full bg-black/10 px-1.5 text-[11px]">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px]">
          <Icon name="groups" size={18} className="pointer-events-none absolute left-2.5 top-2 text-ochre" />
          <select className={fieldCls} value={community} onChange={(e) => setCommunity(e.target.value)} aria-label="Comunidad">
            <option value="all">Todas las comunidades</option>
            {data.communities.map((c) => (
              <option key={c.id} value={c.id}>
                {communityLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {list.length === 0 && (
        <Card className="p-8 text-center">
          <Icon name="verified_user" size={40} className="text-ok" />
          <p className="mt-2 font-display text-lg font-black">No hay alertas en esta categoría</p>
        </Card>
      )}

      <div className="space-y-3">
        {list.slice(0, shown).map((e) => {
          const com = data.communities.find((c) => c.id === e.communityId)
          const expanded = open === e.id
          const isNew = e.sosStatus === 'nuevo'
          return (
            <Card key={e.id} className={`overflow-hidden ${isNew ? 'border-danger/60' : e.sosStatus === 'en_atencion' ? 'border-gold' : ''}`}>
              <button onClick={() => setOpen(expanded ? undefined : e.id)} className={`flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2 ${isNew ? 'bg-danger-soft/60' : ''}`}>
                <Avatar name={e.userName} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[16px] font-extrabold">{e.userName}</p>
                    <Chip tone={SOS_TONE[e.sosStatus]}>
                      {isNew && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-danger" />}
                      {SOS_LABEL[e.sosStatus]}
                    </Chip>
                  </div>
                  <p className="truncate text-[13px] text-ink-2">
                    {communityLabel(com)} · {fmtDateTime(e.timestamp)} · {ago(e.timestamp)}
                  </p>
                </div>
                <Icon name={expanded ? 'expand_less' : 'expand_more'} size={26} className="text-ink-2" />
              </button>
              {expanded && (
                <div className="border-t border-line bg-page p-4 fade-in">
                  <SosDetail event={e} />
                </div>
              )}
            </Card>
          )
        })}
      </div>
      {list.length > shown && (
        <button onClick={() => setShown(shown + 12)} className="mx-auto block rounded-xl border border-line bg-surface px-5 py-2.5 text-[13px] font-bold hover:bg-surface-2">
          Ver más ({list.length - shown} restantes)
        </button>
      )}
    </div>
  )
}

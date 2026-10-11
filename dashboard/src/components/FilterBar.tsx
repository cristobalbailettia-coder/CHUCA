import { useMemo, useState } from 'react'
import { useDash } from '../hooks/useDash'
import { activeFilterCount, communityLabel, type Coverage, type EvidenceFilter } from '../lib/stats'
import { MONTHS, limaMonth, limaYear, periodTitle, rangeText, shift, startOfDay, type PeriodKind } from '../lib/time'
import { Icon, fieldCls } from './ui'

const KINDS: [PeriodKind, string][] = [
  ['dia', 'Día'],
  ['semana', 'Semana'],
  ['mes', 'Mes'],
  ['anio', 'Año'],
]
const mini = 'border-0 border-b border-ink-2/70 bg-page px-2.5 py-2 text-[13px] text-ink outline-none hover:bg-surface-2'

/** Filtros siempre visibles: período, comunidad y búsqueda; el resto está en "Más filtros". */
export default function FilterBar() {
  const { data, filters: f, setFilters, resetFilters, view } = useDash()
  const [more, setMore] = useState(false)
  const count = activeFilterCount(f)
  const roles = useMemo(() => [...new Set((data?.members ?? []).map((m) => m.brigadeRole).filter(Boolean))] as string[], [data])
  const setKind = (kind: PeriodKind) => setFilters({ period: { kind, ref: Date.now() } })
  const setMonth = (m: number) => setFilters({ period: { kind: 'mes', ref: Date.UTC(limaYear(f.period.ref), m, 15) + 5 * 3600_000 } })

  return (
    <div className="border-b border-line bg-surface px-4 py-3 lg:px-8">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center bg-surface-2">
          {KINDS.map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)} className={`px-4 py-2.5 text-[14px] transition ${f.period.kind === k ? 'bg-side font-semibold text-white' : 'text-ink-2 hover:bg-line hover:text-ink'}`}>
              {k === 'dia' && startOfDay(f.period.ref) === startOfDay(Date.now()) ? 'Hoy' : label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 border-b border-ink-2/70 bg-page px-1">
          <button onClick={() => setFilters({ period: shift(f.period, -1) })} aria-label="Período anterior" className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2">
            <Icon name="chevron_left" size={18} />
          </button>
          {f.period.kind === 'mes' ? (
            <select value={limaMonth(f.period.ref)} onChange={(e) => setMonth(Number(e.target.value))} className="bg-transparent px-1 text-[13px] font-semibold outline-none" aria-label="Mes">
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m} {limaYear(f.period.ref)}
                </option>
              ))}
            </select>
          ) : (
            <span className="tnum min-w-[150px] px-1 text-center text-[13px] font-semibold" title={periodTitle(f.period)}>
              {rangeText(f.period)}
            </span>
          )}
          <button onClick={() => setFilters({ period: shift(f.period, 1) })} aria-label="Período siguiente" className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2">
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        <div className="relative min-w-[190px]">
          <Icon name="groups" size={18} className="pointer-events-none absolute left-2.5 top-2 text-ochre" />
          <select className={fieldCls} value={f.communityId} onChange={(e) => setFilters({ communityId: e.target.value })} aria-label="Comunidad">
            <option value="all">Todas las comunidades</option>
            {data?.communities.map((c) => (
              <option key={c.id} value={c.id}>
                {communityLabel(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Icon name="search" size={18} className="pointer-events-none absolute left-2.5 top-2 text-ochre" />
          <input className={fieldCls} placeholder="Buscar custodio o DNI…" value={f.search} onChange={(e) => setFilters({ search: e.target.value })} />
        </div>

        <button onClick={() => setMore(!more)} className="inline-flex items-center gap-1.5 border border-ink-2/60 bg-surface px-3.5 py-2.5 text-[14px] hover:bg-surface-2">
          <Icon name="tune" size={17} className="text-ochre" /> Más filtros
          {count > 0 && <span className="rounded-full bg-gold px-1.5 text-[11px] font-extrabold text-[#3a2a05]">{count}</span>}
        </button>

        <span className="tnum ml-auto hidden text-[12px] text-ink-2 xl:block">
          {view?.patrols.length ?? 0} patrullajes · {view?.events.length ?? 0} registros
        </span>
      </div>

      {more && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          <select className={mini} value={f.coverage} onChange={(e) => setFilters({ coverage: e.target.value as Coverage })} aria-label="Cobertura">
            <option value="all">Cobertura: todas</option>
            <option value="live">Recorridos en curso</option>
          </select>
          <select className={mini} value={f.evidence} onChange={(e) => setFilters({ evidence: e.target.value as EvidenceFilter })} aria-label="Evidencias">
            <option value="all">Evidencias: todas</option>
            <option value="photo">Con fotos</option>
            <option value="audio">Con audios</option>
            <option value="note">Con notas de texto</option>
            <option value="sos">Con alerta SOS</option>
          </select>
          <select className={mini} value={f.category} onChange={(e) => setFilters({ category: e.target.value as typeof f.category })} aria-label="Tipo de registro">
            <option value="all">Registro: todos</option>
            <option value="tala">Tala</option>
            <option value="incendio">Incendio</option>
            <option value="pastoreo">Pastoreo</option>
            <option value="fauna">Fauna</option>
          </select>
          <select className={mini} value={f.role} onChange={(e) => setFilters({ role: e.target.value })} aria-label="Rol o brigada">
            <option value="all">Rol: todos</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button onClick={resetFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-danger">
            <Icon name="restart_alt" size={15} /> Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}

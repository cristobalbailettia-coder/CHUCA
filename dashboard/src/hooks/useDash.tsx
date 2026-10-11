import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDashboardData } from './useDashboardData'
import { defaultFilters, filterData, findGaps, previousPatrols, summarize, type Filters, type Gap, type Summary } from '../lib/stats'
import type { PeriodKind } from '../lib/time'
import type { DashboardData, Patrol } from '../lib/types'

interface Dash {
  data?: DashboardData
  error?: string
  updatedAt?: number
  refresh: () => Promise<void>
  refreshing: boolean
  filters: Filters
  setFilters: (patch: Partial<Filters>) => void
  /** Fija el período predeterminado de una pantalla, salvo que el usuario ya haya elegido uno. */
  applyDefaultPeriod: (kind: PeriodKind) => void
  resetFilters: () => void
  gaps: Map<string, Gap[]>
  view?: DashboardData // datos con todos los filtros aplicados
  prev: Patrol[] // recorridos del período anterior
  summary?: Summary
  yearOfCommunity?: DashboardData // toda la historia de la comunidad elegida (para su ficha)
}

const Ctx = createContext<Dash | null>(null)

export function DashProvider({ children }: { children: ReactNode }) {
  const { data, error, updatedAt, refresh: baseRefresh } = useDashboardData()
  const [filters, setF] = useState<Filters>(defaultFilters)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await baseRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [baseRefresh])

  const touched = useRef(false)
  const setFilters = useCallback((patch: Partial<Filters>) => {
    if (patch.period) touched.current = true
    setF((f) => ({ ...f, ...patch }))
  }, [])
  const applyDefaultPeriod = useCallback((kind: PeriodKind) => {
    if (touched.current) return
    setF((f) => (f.period.kind === kind ? f : { ...f, period: { kind, ref: Date.now() } }))
  }, [])
  const resetFilters = useCallback(() => setF((f) => ({ ...defaultFilters(), period: f.period })), [])

  const gaps = useMemo(() => findGaps(data?.points ?? []), [data?.points])
  const view = useMemo(() => (data ? filterData(data, filters, gaps) : undefined), [data, filters, gaps])
  const prev = useMemo(() => (data ? previousPatrols(data, filters, gaps) : []), [data, filters, gaps])
  const summary = useMemo(() => (view ? summarize(view, prev, gaps) : undefined), [view, prev, gaps])
  const yearOfCommunity = useMemo(
    () => (data && filters.communityId !== 'all' ? filterData(data, { ...defaultFilters(), communityId: filters.communityId }, gaps, true) : undefined),
    [data, filters.communityId, gaps],
  )

  const value = useMemo(
    () => ({ data, error, updatedAt, refresh, refreshing, filters, setFilters, applyDefaultPeriod, resetFilters, gaps, view, prev, summary, yearOfCommunity }),
    [data, error, updatedAt, refresh, refreshing, filters, setFilters, applyDefaultPeriod, resetFilters, gaps, view, prev, summary, yearOfCommunity],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDash() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDash debe usarse dentro de DashProvider')
  return v
}

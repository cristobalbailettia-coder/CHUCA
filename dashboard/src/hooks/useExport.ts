import { useCallback, useState } from 'react'
import { useDash } from './useDash'
import { runExport, type ExportKind } from '../lib/exporters'
import { communityLabel } from '../lib/stats'
import { periodTitle } from '../lib/time'

/** Exporta la vista actual (según los filtros activos). */
export function useExport() {
  const { view, summary, gaps, filters, data } = useDash()
  const [busy, setBusy] = useState<ExportKind | null>(null)

  const scope = filters.communityId === 'all' ? 'Todas las comunidades' : communityLabel(data?.communities.find((c) => c.id === filters.communityId))
  const period = periodTitle(filters.period)

  const run = useCallback(
    async (kind: ExportKind) => {
      if (!view || !summary) return
      setBusy(kind)
      try {
        await runExport(kind, { view, summary, gaps, scope, period })
      } finally {
        setBusy(null)
      }
    },
    [view, summary, gaps, scope, period],
  )

  return { run, busy, scope, period, empty: !view || view.patrols.length === 0 }
}

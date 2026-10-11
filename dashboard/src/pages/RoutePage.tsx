import { Link, useParams } from 'react-router-dom'
import ReportDetail from '../components/ReportDetail'
import { Card, Icon } from '../components/ui'
import { useRoute } from '../hooks/useRoute'
import { fmtDateTime } from '../lib/time'

/** Página de una ruta: /ruta/R-XXXXXX (solo para el equipo AIDER, con sesión). */
export default function RoutePage() {
  const { code = '' } = useParams()
  const { data, state, reload } = useRoute(code)
  const com = data?.communities.find((c) => c.id === data.patrol.communityId)

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-black">{data ? `Ruta ${data.patrol.code} · ${data.patrol.userName}` : `Ruta ${code.toUpperCase()}`}</h2>
          <p className="text-[13px] text-ink-2">
            {data
              ? `${com?.name ?? data.patrol.communityId} · ${fmtDateTime(data.patrol.startedAt)}${data.patrol.endedAt ? ` → ${fmtDateTime(data.patrol.endedAt)}` : ' · en curso'} · ${(data.patrol.distanceM / 1000).toFixed(1)} km`
              : 'Cargando…'}
          </p>
        </div>
        <Link to="/reportes" className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-surface-2">
          <Icon name="arrow_back" size={16} /> Volver a reportes
        </Link>
      </div>
      {state === 'loading' && <p className="py-10 text-center text-ink-2">Cargando ruta…</p>}
      {state === 'notfound' && (
        <Card className="p-6">
          <p className="font-display text-lg font-black">No se encontró la ruta {code.toUpperCase()}</p>
          <p className="text-[13px] text-ink-2">Puede que el recorrido aún no se haya enviado (el custodio no tiene internet) o que el código esté mal escrito.</p>
        </Card>
      )}
      {state === 'error' && <p className="py-10 text-center text-danger">No se pudo cargar la ruta. Intenta de nuevo.</p>}
      {data && <ReportDetail patrol={data.patrol} points={data.points} events={data.events} communities={data.communities} onChanged={reload} large showOpenLink={false} />}
    </div>
  )
}

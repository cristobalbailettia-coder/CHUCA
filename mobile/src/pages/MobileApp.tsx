import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../hooks/useAuth'
import { useOnline } from '../hooks/useOnline'
import { useTracker } from '../hooks/useTracker'
import { addEvidence, db } from '../lib/db'
import { startAutoSync, syncLive, syncPending } from '../lib/sync'
import type { Evidence, NoteCategory } from '../lib/types'
import AudioScreen from '../components/mobile/AudioScreen'
import CameraScreen from '../components/mobile/CameraScreen'
import HomeScreen from '../components/mobile/HomeScreen'
import MapScreen from '../components/mobile/MapScreen'
import NoteScreen from '../components/mobile/NoteScreen'
import PatrolScreen from '../components/mobile/PatrolScreen'
import PerfilScreen from '../components/mobile/PerfilScreen'
import RegistrosScreen from '../components/mobile/RegistrosScreen'
import ReportScreen from '../components/mobile/ReportScreen'
import SelectCustodian from '../components/mobile/SelectCustodian'

type View =
  | { name: 'home' }
  | { name: 'select'; sos: boolean }
  | { name: 'patrol' }
  | { name: 'camera' | 'audio' | 'note' }
  | { name: 'map'; patrolId: string; from: 'patrol' | 'report' }
  | { name: 'report'; id: string }
  | { name: 'perfil' }
  | { name: 'registros' }

type ToastState = { text: string; icon?: string; tone?: 'ok' | 'error' }

function MapFor({ patrolId, accuracy, onBack, fromPatrol }: { patrolId: string; accuracy: number | null; onBack: () => void; fromPatrol: boolean }) {
  const patrol = useLiveQuery(() => db.patrols.get(patrolId), [patrolId])
  const points = useLiveQuery(() => db.points.where('patrolId').equals(patrolId).sortBy('timestamp'), [patrolId])
  const evidences = useLiveQuery(() => db.evidences.where('patrolId').equals(patrolId).sortBy('timestamp'), [patrolId])
  if (!patrol) return null
  return (
    <MapScreen
      patrol={patrol}
      points={points ?? []}
      evidences={evidences ?? []}
      accuracy={accuracy}
      title={fromPatrol ? 'Mapa del Recorrido' : 'Reporte Final'}
      backLabel={fromPatrol ? 'VOLVER AL PATRULLAJE' : 'VOLVER AL REPORTE'}
      onBack={onBack}
    />
  )
}

/** App del custodio: orquesta las pantallas del diseño. */
export default function MobileApp() {
  const { user, logout } = useAuth()
  const t = useTracker()
  const online = useOnline()
  const [view, setView] = useState<View>({ name: 'home' })
  const [toast, setToast] = useState<ToastState>()
  const [autoSos, setAutoSos] = useState(false)
  const patrol = t.patrol
  const accuracy = t.lastPoint?.accuracy ?? null
  const evs = useLiveQuery(() => (patrol ? db.evidences.where('patrolId').equals(patrol.id).toArray() : Promise.resolve([] as Evidence[])), [patrol?.id]) ?? []
  const count = useMemo(() => ({ photo: evs.filter((e) => e.type === 'photo').length, note: evs.filter((e) => e.type === 'note').length }), [evs])

  useEffect(() => startAutoSync(), [])

  // Mientras hay un recorrido en curso, la ruta se envía cada 45 s (y al recuperar conexión).
  const activeId = patrol?.id
  useEffect(() => {
    if (!activeId) return
    const run = () => void syncLive(activeId)
    run()
    const timer = setInterval(run, 45_000)
    window.addEventListener('online', run)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', run)
    }
  }, [activeId])

  // Si la app se recarga con un recorrido en curso, se vuelve a esa pantalla.
  useEffect(() => {
    if (activeId && view.name === 'home') setView({ name: 'patrol' })
  }, [activeId, view.name])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(undefined), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  if (!user) return null

  async function save(data: Partial<Evidence> & Pick<Evidence, 'type'>, msg: ToastState) {
    if (!patrol) return
    const fix = await t.currentFix()
    await addEvidence({ patrolId: patrol.id, lat: fix?.lat ?? null, lng: fix?.lng ?? null, ...data })
    setView({ name: 'patrol' })
    setToast(msg)
    if (data.type === 'sos') void syncLive(patrol.id) // el SOS sale al instante si hay internet
  }

  const finish = async () => {
    if (!patrol) return
    const id = patrol.id
    await t.stop()
    setView({ name: 'report', id })
    void syncPending()
  }

  switch (view.name) {
    case 'select':
      return (
        <SelectCustodian
          user={user}
          sos={view.sos}
          onBack={() => setView({ name: 'home' })}
          onStart={async (c) => {
            await t.start(c)
            setAutoSos(view.sos)
            setView({ name: 'patrol' })
          }}
        />
      )

    case 'patrol':
    case 'camera':
    case 'audio':
    case 'note':
      if (!patrol) return null
      if (view.name === 'camera')
        return <CameraScreen photoNo={count.photo + 1} community={user.communityName} onCancel={() => setView({ name: 'patrol' })} onSave={(blob) => save({ type: 'photo', blob, mimeType: blob.type }, { text: `Foto #${count.photo + 1} guardada`, icon: 'photo_camera' })} />
      if (view.name === 'audio') return <AudioScreen onCancel={() => setView({ name: 'patrol' })} onSave={(blob) => save({ type: 'audio', blob, mimeType: blob.type }, { text: 'Nota de voz registrada', icon: 'mic' })} />
      if (view.name === 'note')
        return (
          <NoteScreen
            noteNo={count.note + 1}
            accuracy={accuracy}
            community={user.communityName}
            onCancel={() => setView({ name: 'patrol' })}
            onSave={(v: { category?: NoteCategory; text: string }) => save({ type: 'note', category: v.category, text: v.text }, { text: 'Nota de campo registrada', icon: 'edit_note' })}
          />
        )
      return (
        <PatrolScreen
          patrol={patrol}
          distanceM={t.distanceM}
          gpsOk={!!t.lastPoint}
          gpsError={t.error}
          online={online}
          toast={toast}
          openSos={autoSos}
          onCamera={() => setView({ name: 'camera' })}
          onAudio={() => setView({ name: 'audio' })}
          onNote={() => setView({ name: 'note' })}
          onSos={() => {
            setAutoSos(false)
            void save({ type: 'sos', text: 'Alerta SOS' }, navigator.onLine ? { text: '¡ALERTA SOS ENVIADA A CENTRAL!', icon: 'emergency', tone: 'error' } : { text: 'SOS guardado: saldrá al volver la señal', icon: 'emergency', tone: 'error' })
          }}
          onMap={() => setView({ name: 'map', patrolId: patrol.id, from: 'patrol' })}
          onFinish={finish}
        />
      )

    case 'map':
      return <MapFor patrolId={view.patrolId} accuracy={accuracy} fromPatrol={view.from === 'patrol'} onBack={() => setView(view.from === 'patrol' ? { name: 'patrol' } : { name: 'report', id: view.patrolId })} />

    case 'report':
      return <ReportScreen patrolId={view.id} accuracy={accuracy} community={user.communityName} onHome={() => setView({ name: 'home' })} onMap={() => setView({ name: 'map', patrolId: view.id, from: 'report' })} />

    case 'perfil':
      return <PerfilScreen user={user} canLogout={!patrol} onBack={() => setView({ name: 'home' })} onRegistros={() => setView({ name: 'registros' })} onLogout={logout} />

    case 'registros':
      return <RegistrosScreen user={user} onBack={() => setView({ name: 'home' })} onOpen={(id) => setView({ name: 'report', id })} />

    default:
      return (
        <HomeScreen
          user={user}
          active={patrol}
          onPatrol={() => setView(patrol ? { name: 'patrol' } : { name: 'select', sos: false })}
          onIncident={() => setView(patrol ? { name: 'patrol' } : { name: 'select', sos: true })}
          onRegistros={() => setView({ name: 'registros' })}
          onPerfil={() => setView({ name: 'perfil' })}
        />
      )
  }
}

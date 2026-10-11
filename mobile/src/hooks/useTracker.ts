import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { finishPatrol, getActivePatrol, startPatrol } from '../lib/db'
import { GpsTracker } from '../lib/tracker'
import type { TrackPoint } from '../lib/types'
import { useAuth } from './useAuth'

export function useTracker() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const patrol = useLiveQuery(() => getActivePatrol(userId), [userId])
  const [lastPoint, setLastPoint] = useState<TrackPoint | null>(null)
  const [pointCount, setPointCount] = useState(0)
  const [distanceM, setDistanceM] = useState(0)
  const [error, setError] = useState<string>()
  const trackerRef = useRef<GpsTracker | null>(null)

  if (!trackerRef.current) {
    trackerRef.current = new GpsTracker((s) => {
      setLastPoint(s.point)
      setPointCount(s.count)
      setDistanceM(s.distanceM)
      setError(s.error)
    })
  }
  const tracker = trackerRef.current

  // Reanuda el rastreo si hay un patrullaje activo (p. ej. tras recargar la página).
  useEffect(() => {
    if (patrol?.id) void tracker.start(patrol.id)
    return () => {
      void tracker.stop()
    }
  }, [patrol?.id, tracker])

  const start = useCallback(
    async (custodian: { id: string; name: string }) => {
      if (!user) return
      await startPatrol({ id: user.id, communityId: user.communityId, custodianId: custodian.id, custodianName: custodian.name })
    },
    [user],
  )

  const stop = useCallback(async () => {
    if (!patrol) return
    await tracker.stop()
    await finishPatrol(patrol.id)
  }, [patrol, tracker])

  const currentFix = useCallback(() => tracker.currentFix(), [tracker])

  return { patrol, lastPoint, pointCount, distanceM, error, start, stop, currentFix }
}

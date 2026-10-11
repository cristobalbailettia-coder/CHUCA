import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import type { Session } from '../lib/auth'
import { useOnline } from './useOnline'

export interface Registro {
  id: string
  code?: string
  startedAt: number
  endedAt: number
  distanceM: number
  name: string
  photos: number
  audios: number
  notes: number
  sos: number
  local: boolean // todavía en este teléfono (puede estar sin enviar)
}

const cacheKey = (communityId: string) => `aider-registros-${communityId}`

function readCache(communityId: string): Registro[] {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(communityId)) ?? '[]')
  } catch {
    return []
  }
}

/**
 * Registros de patrullaje de toda la comunidad: los del servidor (cuando hay internet, con copia local
 * para verlos sin conexión) más los de este teléfono que aún no se enviaron.
 */
export function useRegistros(user: Session) {
  const online = useOnline()
  const [remote, setRemote] = useState<Registro[]>(() => readCache(user.communityId))
  const [loading, setLoading] = useState(false)

  const local = useLiveQuery(async () => {
    const patrols = await db.patrols.where('status').equals('finished').toArray()
    const out: Registro[] = []
    for (const p of patrols) {
      const evs = await db.evidences.where('patrolId').equals(p.id).toArray()
      out.push({
        id: p.id,
        code: p.code,
        startedAt: p.startedAt,
        endedAt: p.endedAt ?? p.startedAt,
        distanceM: p.distanceM,
        name: p.custodianName ?? 'Custodio',
        photos: evs.filter((e) => e.type === 'photo').length,
        audios: evs.filter((e) => e.type === 'audio').length,
        notes: evs.filter((e) => e.type === 'note').length,
        sos: evs.filter((e) => e.type === 'sos').length,
        local: true,
      })
    }
    return out
  }, [])

  useEffect(() => {
    if (!online) return
    let alive = true
    setLoading(true)
    ;(async () => {
      const names = new Map(user.roster.map((c) => [c.id, c.name]))
      const { data: ps } = await supabase
        .from('patrols')
        .select('id, code, started_at, ended_at, distance_m, custodian_id, user_id')
        .eq('community_id', user.communityId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(300)
      const rows = ps ?? []
      const counts = new Map<string, { photo: number; audio: number; note: number; sos: number }>()
      for (let i = 0; i < rows.length; i += 80) {
        const ids = rows.slice(i, i + 80).map((r) => r.id)
        const { data: evs } = await supabase.from('evidences').select('patrol_id, type').in('patrol_id', ids)
        for (const e of evs ?? []) {
          const c = counts.get(e.patrol_id) ?? { photo: 0, audio: 0, note: 0, sos: 0 }
          c[e.type as 'photo' | 'audio' | 'note' | 'sos']++
          counts.set(e.patrol_id, c)
        }
      }
      const list: Registro[] = rows.map((r) => {
        const c = counts.get(r.id) ?? { photo: 0, audio: 0, note: 0, sos: 0 }
        return {
          id: r.id,
          code: r.code ?? undefined,
          startedAt: Date.parse(r.started_at),
          endedAt: Date.parse(r.ended_at as string),
          distanceM: r.distance_m,
          name: names.get(r.custodian_id ?? r.user_id) ?? 'Custodio',
          photos: c.photo,
          audios: c.audio,
          notes: c.note,
          sos: c.sos,
          local: false,
        }
      })
      if (!alive) return
      setRemote(list)
      try {
        localStorage.setItem(cacheKey(user.communityId), JSON.stringify(list))
      } catch {
        /* sin almacenamiento */
      }
    })()
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [online, user.communityId, user.roster])

  const localIds = new Set((local ?? []).map((l) => l.id))
  const registros = [...(local ?? []), ...remote.filter((r) => !localIds.has(r.id))].sort((a, b) => b.startedAt - a.startedAt)
  return { registros, loading, online }
}

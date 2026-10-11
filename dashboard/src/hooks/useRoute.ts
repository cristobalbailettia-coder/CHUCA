import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Community, EventRow, EvidenceType, KeyData, NoteCategory, Patrol, ReviewStatus, SosStatus, TrackPoint } from '../lib/types'

export interface RouteData {
  patrol: Patrol
  points: TrackPoint[]
  events: EventRow[]
  communities: Community[]
}

/** Carga un recorrido por su código (R-XXXXXX); si está en curso, se actualiza cada 10 s. */
export function useRoute(code: string) {
  const [data, setData] = useState<RouteData>()
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading')

  const load = useCallback(async () => {
    try {
      const { data: p, error } = await supabase
        .from('patrols')
        .select('id, user_id, community_id, started_at, ended_at, distance_m, summary, key_data, code, custodian_id')
        .eq('code', code.toUpperCase())
        .maybeSingle()
      if (error) throw error
      if (!p) return setState('notfound')

      const pts: TrackPoint[] = []
      for (let from = 0; ; from += 1000) {
        const { data: rows, error: e } = await supabase
          .from('track_points')
          .select('lat, lng, accuracy, ts')
          .eq('patrol_id', p.id)
          .order('ts')
          .range(from, from + 999)
        if (e) throw e
        pts.push(...(rows ?? []).map((r) => ({ patrolId: p.id, lat: r.lat, lng: r.lng, accuracy: r.accuracy, timestamp: Date.parse(r.ts) })))
        if (!rows || rows.length < 1000) break
      }

      const [{ data: evRows }, { data: prof }, { data: coms }] = await Promise.all([
        supabase.from('evidences').select('id, type, category, text, lat, lng, ts, media_path, mime_type, reviewed, sos_status, sos_note, sos_updated_at, review_status, review_note').eq('patrol_id', p.id).order('ts'),
        supabase.from('profiles').select('name').eq('id', p.custodian_id ?? p.user_id).maybeSingle(),
        supabase.from('communities').select('id, name, code'),
      ])
      const paths = (evRows ?? []).flatMap((e) => (e.media_path ? [e.media_path] : []))
      const urls = new Map<string, string>()
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('evidences').createSignedUrls(paths, 3600)
        signed?.forEach((s) => s.signedUrl && s.path && urls.set(s.path, s.signedUrl))
      }

      const userName = prof?.name ?? 'Vigilante'
      const patrol: Patrol = {
        id: p.id,
        code: p.code ?? code,
        userId: p.custodian_id ?? p.user_id,
        userName,
        communityId: p.community_id,
        startedAt: Date.parse(p.started_at),
        endedAt: p.ended_at ? Date.parse(p.ended_at) : undefined,
        active: !p.ended_at,
        distanceM: p.distance_m,
        summary: p.summary ?? undefined,
        keyData: (p.key_data as KeyData | null) ?? undefined,
      }
      const events: EventRow[] = (evRows ?? []).map((e) => ({
        id: e.id,
        patrolId: p.id,
        type: e.type as EvidenceType,
        category: (e.category as NoteCategory | null) ?? undefined,
        text: e.text ?? undefined,
        lat: e.lat,
        lng: e.lng,
        timestamp: Date.parse(e.ts),
        hasMedia: !!e.media_path,
        mimeType: e.mime_type ?? undefined,
        mediaUrl: e.media_path ? urls.get(e.media_path) : undefined,
        reviewed: e.reviewed,
        sosStatus: e.sos_status as SosStatus,
        sosNote: e.sos_note ?? undefined,
        sosUpdatedAt: e.sos_updated_at ? Date.parse(e.sos_updated_at) : undefined,
        reviewStatus: e.review_status as ReviewStatus,
        reviewNote: e.review_note ?? undefined,
        communityId: p.community_id,
        userId: p.custodian_id ?? p.user_id,
        userName,
      }))
      setData({ patrol, points: pts, events, communities: (coms ?? []).map((c) => ({ id: c.id, name: c.name, code: c.code ?? '' })) })
      setState('ok')
    } catch {
      setState((s) => (s === 'ok' ? s : 'error'))
    }
  }, [code])

  useEffect(() => {
    setState('loading')
    void load()
  }, [load])

  const live = data?.patrol.active
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => void load(), 10_000)
    return () => clearInterval(t)
  }, [live, load])

  return { data, state, reload: load }
}

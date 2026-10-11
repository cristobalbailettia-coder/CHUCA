import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Community, DashboardData, EventRow, EvidenceType, KeyData, Member, NoteCategory, Patrol, ReviewStatus, SosStatus, TrackPoint } from '../lib/types'

const PAGE = 1000
const POLL_MS = 15_000

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/** PostgREST devuelve máximo 1000 filas por consulta: se pide por páginas. */
async function fetchAll<T>(build: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

// Los recorridos terminados no cambian: sus puntos se piden una sola vez y se guardan en memoria.
// (Los recién subidos no se cachean todavía, por si la subida de puntos aún está en curso.)
const pointCache = new Map<string, TrackPoint[]>()

async function loadPoints(patrols: { id: string; createdAt: number }[]): Promise<TrackPoint[]> {
  const missing = patrols.filter((p) => !pointCache.has(p.id))
  const chunks: string[][] = []
  for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10).map((p) => p.id))
  const fresh = new Map<string, TrackPoint[]>()

  // En tandas de 4 consultas en paralelo para no saturar la conexión.
  for (let i = 0; i < chunks.length; i += 4) {
    await Promise.all(
      chunks.slice(i, i + 4).map(async (chunk) => {
        const rows = await fetchAll<{ patrol_id: string; lat: number; lng: number; accuracy: number | null; ts: string }>((from, to) =>
          supabase
            .from('track_points')
            .select('patrol_id, lat, lng, accuracy, ts')
            .in('patrol_id', chunk)
            .order('patrol_id')
            .order('ts')
            .range(from, to) as unknown as Page<never>,
        )
        for (const r of rows) {
          const list = fresh.get(r.patrol_id) ?? []
          list.push({ patrolId: r.patrol_id, lat: r.lat, lng: r.lng, accuracy: r.accuracy, timestamp: Date.parse(r.ts) })
          fresh.set(r.patrol_id, list)
        }
      }),
    )
  }

  const now = Date.now()
  for (const p of missing) {
    const pts = fresh.get(p.id)
    if (pts?.length && now - p.createdAt > 3 * 60_000) pointCache.set(p.id, pts)
  }
  return patrols.flatMap((p) => pointCache.get(p.id) ?? fresh.get(p.id) ?? [])
}

// URLs firmadas (1 h) en caché para no regenerarlas en cada actualización.
const urlCache = new Map<string, { url: string; exp: number }>()
async function signedUrls(paths: string[]) {
  const now = Date.now()
  const missing = [...new Set(paths)].filter((p) => (urlCache.get(p)?.exp ?? 0) < now + 5 * 60_000)
  for (let i = 0; i < missing.length; i += 200) {
    const { data } = await supabase.storage.from('evidences').createSignedUrls(missing.slice(i, i + 200), 3600)
    data?.forEach((d) => d.signedUrl && d.path && urlCache.set(d.path, { url: d.signedUrl, exp: now + 3600_000 }))
  }
  return urlCache
}

async function load(): Promise<DashboardData> {
  const [{ data: comRows }, { data: memRows }] = await Promise.all([
    supabase.from('communities').select('id, name, code, nearby_reserve, reports_since, population, lat, lng, boundary').order('code'),
    supabase.from('profiles').select('id, name, dni, age, brigade_role, community_id, role'),
  ])
  const communities: Community[] = (comRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code ?? '',
    nearbyReserve: c.nearby_reserve ?? undefined,
    reportsSince: c.reports_since ?? undefined,
    population: c.population ?? undefined,
    lat: c.lat ?? undefined,
    lng: c.lng ?? undefined,
    boundary: (c.boundary as [number, number][] | null) ?? undefined,
  }))
  const members: Member[] = (memRows ?? [])
    .filter((m) => m.role === 'vigilante')
    .map((m) => ({
      id: m.id,
      name: m.name,
      dni: m.dni ?? undefined,
      age: m.age ?? undefined,
      brigadeRole: m.brigade_role ?? undefined,
      communityId: m.community_id ?? undefined,
    }))
  const names = new Map((memRows ?? []).map((m) => [m.id, m.name as string]))

  const patrolRows = await fetchAll<{
    id: string
    user_id: string
    community_id: string
    started_at: string
    ended_at: string | null
    distance_m: number
    summary: string | null
    key_data: KeyData | null
    code: string | null
    custodian_id: string | null
    created_at: string
  }>(
    (from, to) =>
      supabase
        .from('patrols')
        .select('id, user_id, community_id, started_at, ended_at, distance_m, summary, key_data, code, custodian_id, created_at')
        .order('started_at', { ascending: false })
        .order('id')
        .range(from, to) as unknown as Page<never>,
  )
  const patrolCommunity = new Map(patrolRows.map((p) => [p.id, p.community_id]))
  // Quien hizo el recorrido: el custodio elegido en la app, o el dueño de la cuenta (datos anteriores).
  const patrolWho = new Map(patrolRows.map((p) => [p.id, p.custodian_id ?? p.user_id]))

  const evRows = await fetchAll<{
    id: string
    patrol_id: string
    user_id: string
    type: EvidenceType
    category: NoteCategory | null
    text: string | null
    lat: number | null
    lng: number | null
    ts: string
    media_path: string | null
    mime_type: string | null
    reviewed: boolean
    sos_status: SosStatus
    sos_note: string | null
    sos_updated_at: string | null
    review_status: ReviewStatus
    review_note: string | null
  }>(
    (from, to) =>
      supabase
        .from('evidences')
        .select('id, patrol_id, user_id, type, category, text, lat, lng, ts, media_path, mime_type, reviewed, sos_status, sos_note, sos_updated_at, review_status, review_note')
        .order('ts', { ascending: false })
        .order('id')
        .range(from, to) as unknown as Page<never>,
  )
  const urls = await signedUrls(evRows.flatMap((e) => (e.media_path ? [e.media_path] : [])))

  const events: EventRow[] = evRows
    .filter((e) => patrolCommunity.has(e.patrol_id))
    .map((e) => ({
      id: e.id,
      patrolId: e.patrol_id,
      type: e.type,
      category: e.category ?? undefined,
      text: e.text ?? undefined,
      lat: e.lat,
      lng: e.lng,
      timestamp: Date.parse(e.ts),
      hasMedia: !!e.media_path,
      mimeType: e.mime_type ?? undefined,
      mediaUrl: e.media_path ? urls.get(e.media_path)?.url : undefined,
      reviewed: e.reviewed,
      sosStatus: e.sos_status,
      sosNote: e.sos_note ?? undefined,
      sosUpdatedAt: e.sos_updated_at ? Date.parse(e.sos_updated_at) : undefined,
      reviewStatus: e.review_status,
      reviewNote: e.review_note ?? undefined,
      communityId: patrolCommunity.get(e.patrol_id)!,
      userId: patrolWho.get(e.patrol_id) ?? e.user_id,
      userName: names.get(patrolWho.get(e.patrol_id) ?? e.user_id) ?? 'Vigilante',
    }))

  const patrols: Patrol[] = patrolRows.map((p) => ({
    id: p.id,
    userId: p.custodian_id ?? p.user_id,
    userName: names.get(p.custodian_id ?? p.user_id) ?? 'Vigilante',
    communityId: p.community_id,
    startedAt: Date.parse(p.started_at),
    endedAt: p.ended_at ? Date.parse(p.ended_at) : undefined,
    active: !p.ended_at,
    code: p.code ?? p.id.slice(0, 8).toUpperCase(),
    distanceM: p.distance_m,
    summary: p.summary ?? undefined,
    keyData: p.key_data ?? undefined,
  }))

  const points = await loadPoints(patrolRows.map((p) => ({ id: p.id, createdAt: Date.parse(p.created_at) })))
  return { communities, members, patrols, events, points }
}

/** Todos los datos del panel, leídos de la base compartida; se actualizan solos. */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData>()
  const [error, setError] = useState<string>()
  const [updatedAt, setUpdatedAt] = useState<number>()
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      setData(await load())
      setError(undefined)
      setUpdatedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos')
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => document.visibilityState === 'visible' && void refresh(), POLL_MS)
    return () => clearInterval(t)
  }, [refresh])

  return { data, error, updatedAt, refresh }
}

/** El equipo AIDER cambia el estado de una alerta SOS (nuevo → en atención → resuelto). */
export async function setSosStatus(eventId: string, status: SosStatus, note?: string) {
  const patch: Record<string, unknown> = { sos_status: status, reviewed: status === 'resuelto', sos_updated_at: new Date().toISOString() }
  if (note !== undefined) patch.sos_note = note
  const { error } = await supabase.from('evidences').update(patch).eq('id', eventId)
  if (error) throw new Error(error.message)
}

/** Aprobar, descartar o comentar una evidencia (foto, audio o nota). */
export async function reviewEvidence(eventId: string, status: ReviewStatus, note?: string) {
  const patch: Record<string, unknown> = { review_status: status, reviewed: status !== 'pendiente' }
  if (note !== undefined) patch.review_note = note
  const { error } = await supabase.from('evidences').update(patch).eq('id', eventId)
  if (error) throw new Error(error.message)
}

/** Pide a Gemini (re)generar el resumen y los datos clave de un recorrido terminado. */
export async function regenerateSummary(patrolId: string): Promise<'ok' | 'pending_config' | 'error'> {
  const { data, error } = await supabase.functions.invoke('summarize-report', { body: { patrol_id: patrolId, force: true } })
  if (error) return 'error'
  return data?.status === 'pending_config' ? 'pending_config' : data?.status === 'ok' || data?.status === 'no_content' ? 'ok' : 'error'
}

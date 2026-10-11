import { supabase } from './supabase'

export interface Custodian {
  id: string
  name: string
}

/** Sesión del teléfono de una comunidad (se entra con el PIN de 4 dígitos de la comunidad). */
export interface Session {
  id: string // cuenta del teléfono (dueña técnica de los registros)
  communityId: string
  communityName: string
  reserve: string // zona de vigilancia asignada = reserva cercana
  roster: Custodian[] // padrón de custodios acreditados
}

export type LoginResult = { ok: true; session: Session } | { ok: false; error: string }

const KEY = 'aider-session-v2'

const emailFor = (code: string) => `d${code}@aider.example`
const passwordFor = (code: string) => `aider-${code}`

/**
 * PIN de 4 dígitos de cada comunidad → cuenta del teléfono en el servidor (demostración).
 * Un PIN que no está aquí se prueba directamente como cuenta de 4 dígitos.
 */
const PIN_TO_ACCOUNT: Record<string, string> = {
  '0601': '240601', // A · Santitos
  '0602': '240602', // B · Algarrobo
  '0603': '240603', // C · El Bosque
  '1234': '123456', // Pruebas en vivo
}

/**
 * La sesión (con el padrón de custodios) se guarda en el teléfono para trabajar sin internet.
 * El código solo se valida contra el servidor, por eso el primer ingreso necesita conexión.
 */
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    const s = raw ? (JSON.parse(raw) as Session) : null
    return s && s.communityId && Array.isArray(s.roster) ? s : null
  } catch {
    return null
  }
}

function save(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* almacenamiento bloqueado */
  }
}

async function fetchCommunity(communityId: string) {
  const [{ data: com }, { data: members }] = await Promise.all([
    supabase.from('communities').select('name, nearby_reserve').eq('id', communityId).single(),
    supabase.from('profiles').select('id, name').eq('community_id', communityId).eq('role', 'vigilante').order('name'),
  ])
  return { com, roster: (members ?? []).map((m) => ({ id: m.id as string, name: m.name as string })) }
}

export async function loginWithCode(pin: string): Promise<LoginResult> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'El PIN tiene 4 dígitos.' }
  const code = PIN_TO_ACCOUNT[pin] ?? pin
  if (!navigator.onLine) return { ok: false, error: 'Necesita internet para ingresar.' }
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailFor(code), password: passwordFor(code) })
  if (error || !data.user) {
    return { ok: false, error: error?.name === 'AuthRetryableFetchError' ? 'No hay conexión con el servidor.' : 'PIN incorrecto.' }
  }
  const { data: me } = await supabase.from('profiles').select('community_id, role').eq('id', data.user.id).single()
  if (!me || me.role !== 'device' || !me.community_id) {
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: false, error: 'Este PIN no corresponde a una comunidad.' }
  }
  const { com, roster } = await fetchCommunity(me.community_id)
  const session: Session = {
    id: data.user.id,
    communityId: me.community_id,
    communityName: com?.name ?? me.community_id,
    reserve: com?.nearby_reserve ?? 'Área de vigilancia comunal',
    roster,
  }
  save(session)
  return { ok: true, session }
}

/** Actualiza el padrón cuando hay internet (alguien nuevo acreditado, etc.). */
export async function refreshRoster(s: Session): Promise<Session | null> {
  if (!navigator.onLine) return null
  try {
    const { com, roster } = await fetchCommunity(s.communityId)
    if (!roster.length) return null
    const next = { ...s, communityName: com?.name ?? s.communityName, reserve: com?.nearby_reserve ?? s.reserve, roster }
    save(next)
    return next
  } catch {
    return null
  }
}

export async function logout() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignorar */
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}

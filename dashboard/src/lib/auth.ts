import { supabase } from './supabase'

export interface Session {
  id: string
  username: string
  name: string
}

export type LoginResult = { ok: true; session: Session } | { ok: false; error: string }

/** Cuenta de prueba mostrada en la pantalla de acceso (poner SHOW_DEMO_HINT en false para ocultarla). */
export const SHOW_DEMO_HINT = true
export const DEMO_HINT = [{ label: 'Equipo AIDER', username: 'admin', password: 'admin123' }]

const emailFor = (username: string) => `${username.trim().toLowerCase()}@aider.example`

/** Devuelve el perfil si el usuario es del equipo AIDER (rol admin). */
export async function adminProfile(uid: string): Promise<Session | null> {
  const { data } = await supabase.from('profiles').select('id, username, name, role').eq('id', uid).single()
  return data && data.role === 'admin' ? { id: data.id, username: data.username, name: data.name } : null
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailFor(username), password })
  if (error || !data.user) {
    const net = error?.name === 'AuthRetryableFetchError'
    return { ok: false, error: net ? 'No hay conexión con el servidor.' : 'Usuario o contraseña incorrectos.' }
  }
  const session = await adminProfile(data.user.id)
  if (!session) {
    await supabase.auth.signOut()
    return { ok: false, error: 'Esta cuenta no tiene acceso al panel. Use una cuenta del equipo AIDER.' }
  }
  return { ok: true, session }
}

export const logout = () => supabase.auth.signOut()

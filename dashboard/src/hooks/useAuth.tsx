import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import * as auth from '../lib/auth'
import type { LoginResult, Session } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface AuthValue {
  user: Session | null
  loading: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ? await auth.adminProfile(data.session.user.id) : null
      if (alive) {
        setUser(s)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (u: string, p: string) => {
    const r = await auth.login(u, p)
    if (r.ok) setUser(r.session)
    return r
  }, [])
  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return v
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Cargando…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

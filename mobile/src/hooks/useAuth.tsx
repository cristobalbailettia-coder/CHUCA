import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as auth from '../lib/auth'
import type { LoginResult, Session } from '../lib/auth'

interface AuthValue {
  user: Session | null
  login: (code: string) => Promise<LoginResult>
  logout: () => void
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(() => auth.loadSession())

  // Con internet, el padrón de custodios se actualiza en segundo plano.
  useEffect(() => {
    if (!user) return
    void auth.refreshRoster(user).then((s) => s && setUser(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const login = useCallback(async (code: string) => {
    const r = await auth.loginWithCode(code)
    if (r.ok) setUser(r.session)
    return r
  }, [])
  const logout = useCallback(() => {
    void auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return v
}

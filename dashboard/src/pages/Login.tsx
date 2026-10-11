import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await login(username, password)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    navigate(from, { replace: true })
  }

  const input = 'w-full border-0 border-b border-ink-2/70 bg-page px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-2 hover:bg-surface-2'

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#0f2d1d] p-12 text-white lg:flex" style={{ backgroundImage: 'url(/contours.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          <img src="/chuca-logo-white.png" alt="CHUCA · Cada paso protege el bosque" className="w-[320px] max-w-full select-none" draggable={false} />
          <span className="mt-8 block h-1 w-12 bg-gold" />
          <h2 className="mt-5 font-display text-[34px] font-light leading-[1.15]">Cuidamos lo que caminamos.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#f5e4b6]">Conservación del Hábitat mediante la Unidad Comunitaria Ambiental. Vigilancia forestal comunitaria del bosque seco de Tumbes y Piura.</p>
        </div>
      </section>

      <section className="grid place-items-center bg-page p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center bg-[#0f2d1d] py-6 lg:hidden" style={{ backgroundImage: 'url(/contours.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <img src="/chuca-logo-white.png" alt="CHUCA · Cada paso protege el bosque" className="w-[190px] select-none" draggable={false} />
          </div>
          <span className="block h-1 w-10 rounded-full bg-gold" />
          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-ochre">
            <Icon name="admin_panel_settings" size={15} /> Equipo AIDER
          </p>
          <h1 className="mt-1 font-display text-[36px] font-light leading-tight text-brand">Panel de monitoreo</h1>
          <p className="mb-6 mt-2 text-[15px] text-ink-2">Ingresa con tu cuenta del equipo técnico para ver rutas, alertas y reportes de los custodios.</p>

          <div className="space-y-5 bg-surface p-6">
            <label className="block">
              <span className="mb-1 block text-[13px] font-bold text-ink">Usuario</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tu usuario" autoComplete="username" autoCapitalize="none" required className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-bold text-ink">Contraseña</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required className={input} />
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-bold text-danger">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-between bg-brand px-4 py-4 text-[15px] text-on-brand transition hover:opacity-90 disabled:opacity-50">
              <span>{busy ? 'Entrando…' : 'Entrar al panel'}</span>
              <Icon name="arrow_forward" size={20} />
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

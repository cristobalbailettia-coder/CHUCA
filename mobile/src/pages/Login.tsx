import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Icon } from '../components/mobile/ui'

const LEN = 4

/** Pantalla de acceso: PIN de 4 dígitos de la comunidad, como el PIN de un celular. */
export default function Login() {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [help, setHelp] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function submit(value: string) {
    if (busy) return
    setBusy(true)
    setError('')
    const r = await login(value)
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      setPin('')
      input.current?.focus()
    }
  }

  // Al completar los 4 dígitos entra solo, sin botón.
  useEffect(() => {
    if (pin.length === LEN) void submit(pin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0f2d1d] pb-safe pt-safe text-white" style={{ backgroundImage: 'url(/contours.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-between px-8 py-8">
        <div className="flex flex-1 items-center">
          <img src="/chuca-logo-white.png" alt="CHUCA · Cada paso protege el bosque" className="w-[240px] max-w-full select-none" draggable={false} />
        </div>

        <div className="w-full max-w-xs">
          <span className="mb-3 block h-1 w-10 bg-secondary-fixed" />
          <h2 className="text-[30px] font-light leading-tight">Ingresa tu PIN</h2>
          <p className="mt-1 text-[16px] text-primary-fixed">PIN de 4 dígitos de tu comunidad</p>

          <div className="relative mt-6" onClick={() => input.current?.focus()}>
            <div className="flex gap-3">
              {Array.from({ length: LEN }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-[68px] flex-1 items-center justify-center border-b-2 bg-white/10 text-[30px] transition-colors ${error ? 'border-[#ff8389]' : i === pin.length ? 'border-secondary-fixed' : pin[i] ? 'border-white' : 'border-white/40'}`}
                >
                  {pin[i] ? '●' : ''}
                </div>
              ))}
            </div>
            <input
              ref={input}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, LEN))
                setError('')
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={LEN}
              aria-label="PIN de 4 dígitos"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="mt-3 h-6 text-[15px]">
            {busy && (
              <span className="flex items-center gap-2 text-primary-fixed">
                <Icon name="progress_activity" size={20} className="animate-spin" /> Verificando…
              </span>
            )}
            {error && !busy && (
              <p role="alert" className="flex items-center gap-2 font-bold text-[#ff8389]">
                <Icon name="error" size={20} fill /> {error}
              </p>
            )}
          </div>
        </div>

        <button onClick={() => setHelp(!help)} className="mt-4 flex items-center gap-2 text-[14px] text-primary-fixed underline-offset-4 hover:underline">
          <Icon name="contact_support" size={20} />
          {help ? 'Pide tu PIN al equipo AIDER o a tu comité de vigilancia.' : '¿No tienes o olvidaste tu PIN?'}
        </button>
      </main>
    </div>
  )
}

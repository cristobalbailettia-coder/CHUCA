import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui'

const MAX_SEC = 120
const BARS = [35, 60, 85, 45, 90, 70, 30, 95, 65, 80, 40, 90, 55, 75, 50, 85, 35, 65]

/** Pantalla 2.2: nota de voz. Graba apenas se abre; el botón rojo detiene y guarda. */
export default function AudioScreen({ onSave, onCancel }: { onSave: (b: Blob) => void; onCancel: () => void }) {
  const [state, setState] = useState<'starting' | 'recording' | 'error'>('starting')
  const [sec, setSec] = useState(0)
  const [error, setError] = useState('')
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const discard = useRef(false)
  const done = useRef(false)

  useEffect(() => {
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('error')
      setError('Este teléfono no permite grabar audio desde la aplicación.')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        const r = new MediaRecorder(s)
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
        r.onstop = () => {
          s.getTracks().forEach((t) => t.stop())
          if (!discard.current && !done.current && chunks.current.length) {
            done.current = true
            onSave(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }))
          }
        }
        rec.current = r
        r.start()
        setState('recording')
      })
      .catch(() => {
        setState('error')
        setError('No se pudo usar el micrófono. Revise el permiso del navegador.')
      })
    return () => {
      cancelled = true
      discard.current = true
      if (rec.current?.state === 'recording') rec.current.stop()
      stream.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state !== 'recording') return
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [state])

  const stop = () => {
    if (rec.current?.state === 'recording') rec.current.stop()
  }
  useEffect(() => {
    if (sec >= MAX_SEC) stop()
  }, [sec])

  const cancel = () => {
    discard.current = true
    if (rec.current?.state === 'recording') rec.current.stop()
    onCancel()
  }

  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')

  return (
    <div className="relative flex h-full select-none flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0A261D] via-[#061D15] to-[#04120D] text-white">
      <header className="z-20 flex items-center justify-between border-b border-emerald-900/40 bg-[#0A261D]/90 px-5 pb-4 pt-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={cancel} title="Cancelar y volver" className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-800/60 bg-emerald-950/80 text-emerald-200 transition-all active:scale-95">
            <Icon name="chevron_left" size={26} />
          </button>
          <h1 className="text-base font-bold leading-tight text-slate-100">Nota de Voz</h1>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-800/60 bg-emerald-950/80 text-emerald-400 shadow-inner">
          <Icon name="shield_locked" size={22} />
        </div>
      </header>

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
          <span className={`h-2.5 w-2.5 rounded-full ${state === 'recording' ? 'animate-pulse bg-red-500' : 'bg-amber-400'}`} />
          <span>{state === 'recording' ? 'Grabando nota de voz' : state === 'starting' ? 'Preparando micrófono…' : 'Micrófono no disponible'}</span>
        </div>

        <div className="mb-6 text-center">
          <div className="tnum font-mono text-5xl font-extrabold tracking-wider text-white drop-shadow-md">
            {mm}:{ss}
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-300/70">{error || 'Hable claro hacia el micrófono del dispositivo'}</p>
        </div>

        <div className="relative flex h-24 w-full max-w-[280px] items-center justify-between gap-1 overflow-hidden rounded-2xl border border-emerald-800/40 bg-[#0A261D]/70 px-4 py-3 shadow-inner">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="wave-bar w-1.5 rounded-full bg-emerald-400"
              style={{ animationDelay: `${(i * 0.13) % 0.9}s`, height: `${h}%`, animationPlayState: state === 'recording' ? 'running' : 'paused', opacity: state === 'recording' ? 1 : 0.5 }}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            {state === 'recording' && (
              <>
                <div className="pulse-ring absolute h-36 w-36 rounded-full bg-red-600/30" />
                <div className="pulse-ring absolute h-32 w-32 rounded-full bg-red-500/40" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            <button
              onClick={stop}
              disabled={state !== 'recording'}
              aria-label="Detener y guardar"
              className="group relative z-10 flex h-28 w-28 cursor-pointer items-center justify-center rounded-full border-4 border-white/90 bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="h-9 w-9 rounded-lg bg-white shadow-inner" />
            </button>
          </div>
          <p className="mt-4 text-center text-base font-extrabold uppercase tracking-wider text-rose-300">Toca para detener y guardar</p>
        </div>
      </section>

      <div className="z-10 flex flex-col gap-3 bg-gradient-to-t from-[#04120D] via-[#0A261D]/90 to-transparent px-5 pb-6 pt-2">
        <button onClick={cancel} className="flex h-14 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/90 px-6 py-4 text-sm font-bold uppercase tracking-wide text-slate-200 shadow-md transition-all active:scale-[0.98]">
          Descartar Grabación
        </button>
      </div>
    </div>
  )
}

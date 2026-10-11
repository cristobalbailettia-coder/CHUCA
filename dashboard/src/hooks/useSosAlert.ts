import { useEffect, useRef, useState } from 'react'
import type { EventRow } from '../lib/types'

let ctx: AudioContext | null = null

/** Los navegadores solo dejan sonar audio después de una interacción: se prepara en el primer clic. */
export function primeAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* sin audio */
  }
}

/** Sirena corta de tres tonos para avisar de una alerta SOS nueva. */
export function playSosTone() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    ;[880, 660, 880, 660].forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'square'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t0 + i * 0.22)
      g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.22 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.22 + 0.2)
      o.connect(g).connect(ctx!.destination)
      o.start(t0 + i * 0.22)
      o.stop(t0 + i * 0.22 + 0.21)
    })
  } catch {
    /* sin audio */
  }
}

/** Detecta alertas SOS nuevas (que no estaban en la carga anterior) y hace sonar el aviso. */
export function useSosAlert(events: EventRow[] | undefined) {
  const seen = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<string[]>([])

  useEffect(() => {
    window.addEventListener('pointerdown', primeAudio, { once: true })
    return () => window.removeEventListener('pointerdown', primeAudio)
  }, [])

  useEffect(() => {
    if (!events) return
    const ids = new Set(events.filter((e) => e.type === 'sos' && e.sosStatus === 'nuevo').map((e) => e.id))
    if (seen.current) {
      const added = [...ids].filter((id) => !seen.current!.has(id))
      if (added.length) {
        playSosTone()
        setFresh(added)
        setTimeout(() => setFresh([]), 12_000)
      }
    }
    seen.current = ids
  }, [events])

  return fresh
}

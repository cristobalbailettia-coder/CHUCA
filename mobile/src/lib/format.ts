export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

/** "1h 25m" / "42m" */
export function fmtDur(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000))
  return min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`
}

export const fmtKm = (m: number) => `${(m / 1000).toFixed(2)} km`
export const fmtKm1 = (m: number) => `${(m / 1000).toFixed(1)} km`

const LIMA = { timeZone: 'America/Lima' } as const
export const fmtHour = (t: number) => new Date(t).toLocaleTimeString('es-PE', { ...LIMA, hour: '2-digit', minute: '2-digit' })
export const fmtDateLong = (t: number) => {
  const d = new Date(t).toLocaleDateString('es-PE', { ...LIMA, day: 'numeric', month: 'long', year: 'numeric' })
  return d.replace(/\sde\s/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

// Todas las fechas del panel se interpretan en hora de Perú (UTC-5), sin importar la zona del navegador.
const LIMA = 5 * 3600_000
const DAY = 86400_000

export type PeriodKind = 'dia' | 'semana' | 'mes' | 'anio'
export interface Period {
  kind: PeriodKind
  ref: number // instante de referencia (ms)
}

/** Fecha "de pared" en Lima: usar los getters UTC. */
export const lima = (t: number) => new Date(t - LIMA)
export const startOfDay = (t: number) => {
  const d = lima(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + LIMA
}
export const limaMonth = (t: number) => lima(t).getUTCMonth()
export const limaYear = (t: number) => lima(t).getUTCFullYear()
export const limaHour = (t: number) => lima(t).getUTCHours() + lima(t).getUTCMinutes() / 60

export function range(p: Period): [number, number] {
  const d = lima(p.ref)
  if (p.kind === 'dia') {
    const s = startOfDay(p.ref)
    return [s, s + DAY]
  }
  if (p.kind === 'semana') {
    const s = startOfDay(p.ref) - ((d.getUTCDay() + 6) % 7) * DAY // semana de lunes a domingo
    return [s, s + 7 * DAY]
  }
  if (p.kind === 'mes') return [Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) + LIMA, Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) + LIMA]
  return [Date.UTC(d.getUTCFullYear(), 0, 1) + LIMA, Date.UTC(d.getUTCFullYear() + 1, 0, 1) + LIMA]
}

export function shift(p: Period, dir: 1 | -1): Period {
  const d = lima(p.ref)
  if (p.kind === 'dia') return { ...p, ref: p.ref + dir * DAY }
  if (p.kind === 'semana') return { ...p, ref: p.ref + dir * 7 * DAY }
  if (p.kind === 'mes') return { ...p, ref: Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 15) + LIMA }
  return { ...p, ref: Date.UTC(d.getUTCFullYear() + dir, 5, 15) + LIMA }
}

export const inRange = (t: number, [a, b]: [number, number]) => t >= a && t < b

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function isoWeek(t: number) {
  const d = lima(t)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - yearStart) / DAY + 1) / 7)
}

const fmt = (t: number, o: Intl.DateTimeFormatOptions) => new Date(t).toLocaleDateString('es-PE', { timeZone: 'America/Lima', ...o })

export function periodTitle(p: Period) {
  const now = Date.now()
  if (p.kind === 'dia') return startOfDay(p.ref) === startOfDay(now) ? 'Diario (Hoy)' : `Diario (${fmt(p.ref, { day: '2-digit', month: 'short' })})`
  if (p.kind === 'semana') return `Semanal (Sem. ${isoWeek(p.ref)})`
  if (p.kind === 'mes') return `Mensual (${MONTHS[limaMonth(p.ref)]} ${limaYear(p.ref)})`
  return `Anual (${limaYear(p.ref)})`
}

export function rangeText(p: Period) {
  const [a, b] = range(p)
  const f = (t: number) => fmt(t, { day: '2-digit', month: 'short', year: 'numeric' })
  return p.kind === 'dia' ? f(a) : `${f(a)} - ${f(b - 1)}`
}

export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })
export const fmtDate = (t: number) => fmt(t, { day: '2-digit', month: 'short', year: 'numeric' })

/** "hace 5 min", "hace 3 h", "hace 2 d". */
export const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (m < 1) return 'ahora mismo'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`
}

/** Duración legible: "2 h 18 min" o "45 min". */
export const fmtDur = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

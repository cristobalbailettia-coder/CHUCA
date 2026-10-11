import { useEffect, type ReactNode } from 'react'
import { AVATAR_COLORS } from '../lib/colors'
import { initials } from '../lib/stats'

/** Ícono de Material Symbols. */
export function Icon({ name, size = 20, className = '', fill = false }: { name: string; size?: number; className?: string; fill?: boolean }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size, ...(fill ? { fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24' } : {}) }} aria-hidden="true">
      {name}
    </span>
  )
}

/** Logo de CHUCA (la imagen completa) o solo el ícono cuadrado. */
export function Logo({ mode = 'full', size = 120, className = '' }: { mode?: 'full' | 'icon'; size?: number; className?: string }) {
  if (mode === 'full') return <img src="/chuca-logo.jpg" alt="CHUCA · Cada paso protege el bosque" width={size} height={size} className={`rounded-2xl bg-white p-[6%] ${className}`} style={{ width: size, height: size }} />
  // Recorte del cuadrado del ícono dentro de la imagen del logo.
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-[22%] ${className}`} style={{ width: size, height: size }}>
      <img src="/chuca-logo.jpg" alt="CHUCA" className="absolute max-w-none" style={{ width: '200%', left: '-50.3%', top: '-23.9%' }} />
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface ${className}`}>{children}</div>
}

export function SectionTitle({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center bg-gold-soft text-ochre">
            <Icon name={icon} size={20} />
          </span>
        )}
        <div>
          <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
          {hint && <p className="text-[13px] text-ink-2">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/** Etiqueta (chip) pequeña. */
export function Chip({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'ok' | 'gold' | 'danger' | 'neutral' | 'dark'; className?: string }) {
  const t = {
    ok: 'bg-ok-soft text-ok',
    gold: 'bg-gold-soft text-ochre',
    danger: 'bg-danger-soft text-danger',
    neutral: 'bg-surface-2 text-ink-2',
    dark: 'bg-brand text-on-brand',
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${t} ${className}`}>{children}</span>
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const i = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-white" style={{ width: size, height: size, background: AVATAR_COLORS[i], fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

/** Panel lateral que se desliza desde la derecha (detalle de reportes, SOS y custodios). */
export function Drawer({ title, subtitle, icon, onClose, children, width = 'max-w-[760px]', tone = 'brand' }: { title: string; subtitle?: string; icon?: string; onClose: () => void; children: ReactNode; width?: string; tone?: 'brand' | 'danger' }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/45 backdrop-blur-[2px] fade-in" onClick={onClose}>
      <aside role="dialog" aria-label={title} className={`slide-in flex h-full w-full ${width} flex-col border-l border-line bg-page shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <header className={`flex items-center justify-between gap-3 border-b-4 px-5 py-4 text-white ${tone === 'danger' ? 'border-[#fa4d56] bg-[#a2191f]' : 'border-gold bg-side'}`}>
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon name={icon} size={22} />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold leading-tight">{title}</h3>
              {subtitle && <p className="truncate text-[13px] text-white/75">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4 fade-in" onClick={onClose}>
      <div role="dialog" aria-label={title} className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-surface p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
          <Icon name="close" size={20} />
        </button>
        {children}
      </div>
    </div>
  )
}

export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 bg-brand px-4 py-2.5 text-[14px] text-on-brand transition hover:opacity-90 active:opacity-80 disabled:opacity-40'
export const btnGold = 'inline-flex items-center justify-center gap-1.5 bg-gold px-4 py-2.5 text-[14px] font-semibold text-[#103c26] transition hover:brightness-105 disabled:opacity-40'
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 border border-ink-2/60 bg-surface px-3.5 py-2.5 text-[14px] text-ink transition hover:bg-surface-2 disabled:opacity-40'
export const btnDanger = 'inline-flex items-center justify-center gap-1.5 bg-danger px-4 py-2.5 text-[14px] text-on-danger transition hover:opacity-90 disabled:opacity-40'
export const fieldCls = 'w-full border-0 border-b border-ink-2/70 bg-page py-2.5 pl-9 pr-8 text-[14px] text-ink outline-none transition hover:bg-surface-2'

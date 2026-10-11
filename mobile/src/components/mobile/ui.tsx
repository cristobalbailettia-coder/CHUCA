import type { ReactNode } from 'react'

/** Ícono de Material Symbols (el mismo conjunto del diseño). */
export function Icon({ name, size = 24, fill = false, className = '' }: { name: string; size?: number; fill?: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, ...(fill ? { fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24' } : {}) }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

/** Marca superior: logo oficial de CHUCA (sin alteraciones) + barra amarilla como acento. */
export function BrandBar() {
  return (
    <header className="z-40 shrink-0 bg-primary-container pt-safe text-on-primary">
      <div className="flex h-[76px] items-center gap-space-sm px-margin">
        <img src="/chuca-logo.jpg" alt="CHUCA" className="h-[60px] w-[60px] shrink-0 rounded-xl bg-white p-[3px]" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[20px] font-black text-white">Custodio del bosque</p>
          <p className="truncate text-[14px] font-bold text-primary-fixed">Cada paso protege el bosque.</p>
        </div>
      </div>
      <div className="h-1 bg-secondary-fixed" />
    </header>
  )
}

/** Hoja inferior de confirmación con velo oscuro y borde de color según el tipo de alerta. */
export function BottomSheet({ tone, children, onClose }: { tone: 'emergency' | 'warning' | 'primary'; children: ReactNode; onClose: () => void }) {
  const border = tone === 'emergency' ? 'border-[#dc2626]' : tone === 'warning' ? 'border-[#d97706]' : 'border-primary-container'
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/80" onClick={onClose}>
      <div className={`rounded-t-2xl border-t-4 bg-surface px-margin pb-safe pt-space-lg text-on-surface shadow-2xl ${border}`} onClick={(e) => e.stopPropagation()}>
        {children}
        <div className="h-space-lg" />
      </div>
    </div>
  )
}

export function Toast({ text, icon = 'check_circle', tone = 'ok' }: { text: string; icon?: string; tone?: 'ok' | 'error' }) {
  return (
    <div className="pointer-events-none absolute inset-x-margin bottom-28 z-[60] flex items-center gap-space-md rounded-xl bg-inverse-surface p-space-md text-inverse-on-surface shadow-2xl">
      <Icon name={icon} size={32} className={tone === 'error' ? 'text-error-container' : 'text-secondary-fixed'} />
      <span className="text-body-md font-bold">{text}</span>
    </div>
  )
}

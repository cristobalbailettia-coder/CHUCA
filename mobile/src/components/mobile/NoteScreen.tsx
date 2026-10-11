import { useEffect, useRef, useState } from 'react'
import type { NoteCategory } from '../../lib/types'
import { Icon } from './ui'

const CATS: { id: NoteCategory; label: string; icon: string }[] = [
  { id: 'tala', label: 'Tala', icon: 'carpenter' },
  { id: 'incendio', label: 'Incendio', icon: 'local_fire_department' },
  { id: 'pastoreo', label: 'Pastoreo', icon: 'pets' },
  { id: 'fauna', label: 'Fauna', icon: 'cruelty_free' },
]

/** Pantalla 2.3: nota de texto con categoría. */
export default function NoteScreen({
  noteNo,
  accuracy,
  community,
  initial,
  onSave,
  onCancel,
}: {
  noteNo: number
  accuracy: number | null
  community: string
  initial?: { category?: NoteCategory; text: string }
  onSave: (v: { category?: NoteCategory; text: string }) => void
  onCancel: () => void
}) {
  const [category, setCategory] = useState<NoteCategory | undefined>(initial?.category)
  const [text, setText] = useState(initial?.text ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const valid = !!category || text.trim().length > 0

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <header className="shrink-0 bg-surface px-margin pt-safe">
        <div className="flex items-center gap-space-sm py-space-sm">
          <button onClick={onCancel} aria-label="Volver" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface transition-transform active:scale-95">
            <Icon name="arrow_back" size={28} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold uppercase tracking-wide text-secondary">EVIDENCIA DE NOTA</div>
            <h1 className="truncate text-headline-md leading-tight text-on-surface">{initial ? 'Editar Observación' : 'Nueva Observación'}</h1>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-white">
            <Icon name="person" size={20} />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-[12px] font-bold uppercase text-secondary">
            <Icon name="location_on" size={16} /> GPS ACTIVO{accuracy != null ? ` • ±${Math.round(accuracy)}M` : ''}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-[12px] font-bold uppercase text-on-surface-variant">
            <Icon name="shield" size={16} /> PATRULLA {community.toUpperCase()}
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-margin pb-space-md">
        <h2 className="mb-3 text-headline-md text-on-surface">Notas de Recorrido</h2>

        <div className="mb-4 flex gap-0 overflow-hidden rounded-xl bg-surface-container-lowest shadow-md">
          <div className="w-2 shrink-0 bg-primary-container" />
          <div className="flex-1 p-space-md">
            <div className="mb-2 flex items-center gap-2 border-b border-outline-variant/40 pb-2 text-[13px] font-bold uppercase text-secondary">
              <Icon name="edit_note" size={20} /> HOJA #{String(noteNo).padStart(2, '0')} • ENTRADA DE TEXTO
            </div>
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Escriba lo que observó…"
              className="w-full resize-none bg-transparent text-body-lg font-medium leading-snug text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </div>

        <p className="mb-2 text-body-sm font-bold text-on-surface">¿Qué observó?</p>
        <div className="grid grid-cols-2 gap-space-sm">
          {CATS.map((c) => {
            const on = category === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCategory(on ? undefined : c.id)}
                aria-pressed={on}
                className={`flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-[3px] px-3 text-body-md font-bold transition-all active:scale-[0.97] ${
                  on ? 'border-primary-container bg-primary-fixed text-primary-container shadow-md' : 'border-outline-variant bg-surface-container-lowest text-on-surface'
                }`}
              >
                <Icon name={c.icon} size={26} fill={on} /> {c.label}
              </button>
            )
          })}
        </div>
      </main>

      <footer className="flex shrink-0 flex-col gap-space-xs px-margin pb-safe pt-space-sm">
        <button
          disabled={!valid}
          onClick={() => onSave({ category, text: text.trim() })}
          className="flex h-16 w-full items-center justify-center gap-space-sm rounded-xl bg-primary-container text-label-action text-white shadow-lg transition-transform active:translate-y-0.5 disabled:bg-[#4a6a5f] disabled:opacity-90"
        >
          <Icon name="check_circle" size={30} fill /> GUARDAR NOTA
        </button>
        <button onClick={onCancel} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface-container text-body-md font-bold uppercase text-on-surface-variant active:scale-[0.98]">
          <Icon name="arrow_back" size={22} /> DESCARTAR
        </button>
      </footer>
    </div>
  )
}

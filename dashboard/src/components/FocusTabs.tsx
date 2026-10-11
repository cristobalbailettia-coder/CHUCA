import type { Territory } from '../lib/territory'

/** Atajos para acercar el mapa a una comunidad (conmutador de contenido de Carbon). */
export default function FocusTabs({ territories, value, onChange }: { territories: Territory[]; value: string; onChange: (id: string) => void }) {
  const items: [string, string][] = [['all', 'Todas'], ...territories.map((t) => [t.community.id, `Comunidad ${t.community.code}`] as [string, string])]
  return (
    <div className="flex flex-wrap bg-surface-2">
      {items.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} aria-pressed={value === id} className={`px-3.5 py-2 text-[13px] transition ${value === id ? 'bg-side font-semibold text-white' : 'text-ink-2 hover:bg-line hover:text-ink'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

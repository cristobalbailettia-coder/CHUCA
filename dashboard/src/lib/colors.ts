import type { EvidenceType, NoteCategory, SosStatus } from './types'
import type { Theme } from '../hooks/useTheme'

// Colores concretos para librerías que no leen variables CSS (gráficos y mapas).
export const CHART = {
  light: {
    grid: '#e8dfc4',
    tick: '#5f6757',
    text: '#1f2a22',
    surface: '#ffffff',
    bar: '#103c26',
    inc: '#e9a622',
    crit: '#c62828',
    line: '#c88229',
    communities: ['#103c26', '#e9a622', '#c88229'],
    cats: { tala: '#103c26', incendio: '#e9a622', pastoreo: '#c88229', fauna: '#7fb069', otro: '#c9bf9d' } as Record<NoteCategory, string>,
    coverage: '#d9f99d',
  },
  dark: {
    grid: '#2c4636',
    tick: '#b9bfa5',
    text: '#f5e4b6',
    surface: '#14261b',
    bar: '#9bd3a3',
    inc: '#f9cd3b',
    crit: '#ff8a80',
    line: '#e9a622',
    communities: ['#9bd3a3', '#f9cd3b', '#e9a622'],
    cats: { tala: '#9bd3a3', incendio: '#f9cd3b', pastoreo: '#e9a622', fauna: '#7fb069', otro: '#8a9378' } as Record<NoteCategory, string>,
    coverage: '#bef264',
  },
} satisfies Record<Theme, unknown>

export const TYPE_COLOR: Record<EvidenceType, string> = {
  note: '#2d6a3e',
  photo: '#e9a622',
  audio: '#c88229',
  sos: '#dc2626',
}

export const TYPE_LABEL: Record<EvidenceType, string> = {
  note: 'Texto',
  photo: 'Foto',
  audio: 'Audio',
  sos: 'SOS',
}

export const TYPE_ICON: Record<EvidenceType, string> = {
  note: 'edit_note',
  photo: 'photo_camera',
  audio: 'mic',
  sos: 'emergency',
}

export const CATEGORY_NAME: Record<NoteCategory, string> = {
  tala: 'Tala',
  incendio: 'Incendio',
  pastoreo: 'Pastoreo',
  fauna: 'Fauna',
  otro: 'Otro',
}

export const SOS_LABEL: Record<SosStatus, string> = {
  nuevo: 'Nuevo',
  en_atencion: 'En atención',
  resuelto: 'Resuelto',
}

// Un color por vigilante, distinguibles entre sí sobre el mapa satelital.
export const GUARD_COLORS = ['#38bdf8', '#fb923c', '#f472b6', '#2dd4bf', '#facc15', '#a78bfa', '#a3e635', '#f87171', '#22d3ee', '#c084fc', '#fbbf24', '#e2e8f0']

export const AVATAR_COLORS = ['#103c26', '#c88229', '#7a4a1d', '#2d6a3e', '#8a5a2b', '#3d5a2a', '#a3641d', '#4b3621']

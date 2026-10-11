export type SyncStatus = 'pending' | 'synced' | 'error'
export type EvidenceType = 'photo' | 'audio' | 'note' | 'sos'
export type NoteCategory = 'tala' | 'incendio' | 'pastoreo' | 'fauna' | 'otro'

export interface Patrol {
  id: string
  userId: string
  communityId: string
  startedAt: number
  endedAt?: number
  status: 'active' | 'finished'
  distanceM: number
  syncStatus: SyncStatus
  custodianId?: string // custodio elegido en el padrón de la comunidad
  custodianName?: string
  code?: string // código de recorrido (R-XXXXXX), usado en el enlace del dashboard
  pointsSynced?: number // último id de punto GPS ya enviado en vivo
}

export interface TrackPoint {
  id?: number // autoincrement
  patrolId: string
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

export interface Evidence {
  id: string
  patrolId: string
  type: EvidenceType
  category?: NoteCategory
  text?: string
  blob?: Blob // foto o audio, guardado nativamente en IndexedDB
  mimeType?: string
  lat: number | null
  lng: number | null
  timestamp: number
  syncStatus: SyncStatus
}

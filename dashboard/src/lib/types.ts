export type EvidenceType = 'photo' | 'audio' | 'note' | 'sos'
export type SosStatus = 'nuevo' | 'en_atencion' | 'resuelto'
export type ReviewStatus = 'pendiente' | 'aprobada' | 'descartada'
export type NoteCategory = 'tala' | 'incendio' | 'pastoreo' | 'fauna' | 'otro'

export interface Community {
  id: string
  name: string
  code: string
  nearbyReserve?: string
  reportsSince?: number
  population?: number
  lat?: number
  lng?: number
  boundary?: [number, number][] // polígono [lat, lng] del territorio
}

export interface Member {
  id: string
  name: string
  dni?: string
  age?: number
  brigadeRole?: string
  communityId?: string
}

export interface KeyData {
  urgencia?: 'baja' | 'media' | 'alta'
  incidentes?: string[]
  fauna?: string[]
  acciones?: string[]
  modelo?: string
  audios_analizados?: number
  textos_analizados?: number
}

export interface Patrol {
  id: string
  code: string
  userId: string
  userName: string
  communityId: string
  startedAt: number
  endedAt?: number // vacío = recorrido en curso
  active: boolean
  distanceM: number
  summary?: string
  keyData?: KeyData
}

export interface TrackPoint {
  patrolId: string
  lat: number
  lng: number
  accuracy: number | null
  timestamp: number
}

export interface EventRow {
  id: string
  patrolId: string
  type: EvidenceType
  category?: NoteCategory
  text?: string
  lat: number | null
  lng: number | null
  timestamp: number
  hasMedia: boolean
  mimeType?: string
  mediaUrl?: string
  reviewed: boolean
  sosStatus: SosStatus
  sosNote?: string
  sosUpdatedAt?: number
  reviewStatus: ReviewStatus
  reviewNote?: string
  communityId: string
  userId: string
  userName: string
}

export interface DashboardData {
  communities: Community[]
  members: Member[]
  patrols: Patrol[]
  points: TrackPoint[]
  events: EventRow[]
}

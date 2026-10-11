import Dexie, { type EntityTable } from 'dexie'
import type { Evidence, Patrol, TrackPoint } from './types'

class AiderDB extends Dexie {
  patrols!: EntityTable<Patrol, 'id'>
  points!: EntityTable<TrackPoint, 'id'>
  evidences!: EntityTable<Evidence, 'id'>

  constructor() {
    super('aider-db-v2')
    this.version(1).stores({
      patrols: 'id, userId, communityId, status, startedAt, syncStatus',
      points: '++id, patrolId, timestamp, [patrolId+timestamp]',
      evidences: 'id, patrolId, type, timestamp, syncStatus',
    })
  }
}

export const db = new AiderDB()

export const newId = () => crypto.randomUUID()

// Sin letras ni números ambiguos (0/O, 1/I/L) para poder dictar el código por radio o teléfono.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const newCode = () => 'R-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')

/** Patrullaje activo del usuario (si la app se cerró o recargó a mitad de recorrido). */
export function getActivePatrol(userId: string) {
  return db.patrols
    .where('status')
    .equals('active')
    .and((p) => p.userId === userId)
    .first()
}

export async function startPatrol(user: { id: string; communityId: string; custodianId: string; custodianName: string }): Promise<Patrol> {
  const existing = await getActivePatrol(user.id)
  if (existing) return existing
  const patrol: Patrol = {
    id: newId(),
    userId: user.id,
    communityId: user.communityId,
    startedAt: Date.now(),
    status: 'active',
    distanceM: 0,
    syncStatus: 'pending',
    code: newCode(),
    custodianId: user.custodianId,
    custodianName: user.custodianName,
  }
  await db.patrols.add(patrol)
  return patrol
}

export async function finishPatrol(patrolId: string) {
  await db.patrols.update(patrolId, { status: 'finished', endedAt: Date.now(), syncStatus: 'pending' })
}

export async function addEvidence(e: Omit<Evidence, 'id' | 'syncStatus' | 'timestamp'> & { timestamp?: number }) {
  const evidence: Evidence = { ...e, id: newId(), timestamp: e.timestamp ?? Date.now(), syncStatus: 'pending' }
  await db.evidences.add(evidence)
  return evidence
}

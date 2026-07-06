// Project Participants — the PURE model (no I/O). The canonical representation of a person who joined a Project.
// Join Policy only decides how a participant reaches the Project; after joining, every participant is
// represented identically here, with a status. checked-in / attended / no-show are intentionally absent — they
// belong to the future Check-in System.

import type { JoinPolicy } from '@/lib/projects/store'

export type ParticipantStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

/** Canonical status order (used for grouping/display). */
export const PARTICIPANT_STATUSES: ParticipantStatus[] = ['pending', 'approved', 'declined', 'cancelled']

export interface ProjectParticipant {
  id: string
  projectId: string
  accountId: string
  status: ParticipantStatus
  createdAt: string
  updatedAt: string
}

export function isParticipantStatus(v: unknown): v is ParticipantStatus {
  return v === 'pending' || v === 'approved' || v === 'declined' || v === 'cancelled'
}

/**
 * Join Policy → the initial participant status when a participant Joins:
 *   instant  → 'approved'  (joined immediately)
 *   approval → 'pending'   (a join request awaiting organizer action)
 *   ticket   → null        (NO participant is created — ticketing is a future stage)
 */
export function initialParticipantStatus(joinPolicy: JoinPolicy): ParticipantStatus | null {
  if (joinPolicy === 'instant') return 'approved'
  if (joinPolicy === 'approval') return 'pending'
  return null
}

/** Group participants by status — all four buckets always present, in canonical order. */
export function groupByStatus(participants: ProjectParticipant[]): Record<ParticipantStatus, ProjectParticipant[]> {
  const groups: Record<ParticipantStatus, ProjectParticipant[]> = { pending: [], approved: [], declined: [], cancelled: [] }
  for (const p of participants) groups[p.status].push(p)
  return groups
}

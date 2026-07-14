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
  /** The specific Occurrence this registration is for (paid/donation tickets); null = project-level join. */
  occurrenceId: string | null
  accountId: string
  status: ParticipantStatus
  createdAt: string
  updatedAt: string
}

export function isParticipantStatus(v: unknown): v is ParticipantStatus {
  return v === 'pending' || v === 'approved' || v === 'declined' || v === 'cancelled'
}

/**
 * ADMISSION — the participant status the JOIN POLICY assigns to a newly-created participant. This answers only
 * "can this person participate?"; it is TOTAL (always a status) and is the SOLE source of participant status.
 *   approval          → 'pending'   (a join request awaiting organizer action)
 *   instant / ticket  → 'approved'  (admitted — instant on join; ticket once a valid ticket is acquired)
 *
 * It deliberately does NOT decide WHETHER a participant is created. That is a separate concern: for a 'ticket'
 * Join Policy the Ticket System decides ticket acquisition (free → acquired; paid/donation → not yet), and only
 * then is a participant created — at the status this function returns. The Ticket System never assigns status.
 */
export function admissionStatusForJoinPolicy(joinPolicy: JoinPolicy): ParticipantStatus {
  return joinPolicy === 'approval' ? 'pending' : 'approved'
}

/** Group participants by status — all four buckets always present, in canonical order. */
export function groupByStatus(participants: ProjectParticipant[]): Record<ParticipantStatus, ProjectParticipant[]> {
  const groups: Record<ParticipantStatus, ProjectParticipant[]> = { pending: [], approved: [], declined: [], cancelled: [] }
  for (const p of participants) groups[p.status].push(p)
  return groups
}

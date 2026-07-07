// Reviews Eligibility — the SINGLE canonical projection deciding WHETHER a participant may review a completed
// public activity. It implements NO reviews/ratings and owns no business object: it is a pure, read-only rule
// over existing Project + Visibility + Participant state (reusing the shared completed-activity projection). All
// future review / rating / reputation / achievement / trust systems must reuse THIS gate rather than
// re-deriving their own. Attendance is decided by Participants only — ticket ownership never grants review
// permission, so this module never reads the Ticket System.

import { isProjectCompleted, type OccurrenceTimes } from '@/lib/activity-marketplace/completed-public-activities'
import type { ParticipantStatus } from '@/lib/participants/model'

/** Why a participant is NOT eligible (internal use — never UI text). */
export type ReviewIneligibilityReason = 'not_public' | 'activity_not_completed' | 'not_participant' | 'participant_not_approved'

export type ReviewEligibility = { eligible: true } | { eligible: false; reason: ReviewIneligibilityReason }

export interface ReviewEligibilityInput {
  /** Project publication state. */
  isPublished: boolean
  /** Project discovery visibility. */
  visibility: 'private' | 'public'
  /** The Project's occurrences (timestamps) — for the shared completed-activity projection. */
  occurrences: OccurrenceTimes[]
  /** Current time in ms (caller-supplied, deterministic). */
  nowMs: number
  /** The reviewer's participation status, or null if they are not a participant. (Never a ticket.) */
  participantStatus: ParticipantStatus | null
}

/**
 * The canonical review-eligibility rule. A participant is eligible ONLY when ALL hold:
 *   1+2. the activity is PUBLIC (published AND visibility = 'public'),
 *   3.   it is a COMPLETED activity (shared completed-public-activities projection — not re-derived here),
 *   4.   the reviewer IS a participant,
 *   5.   their status is 'approved' (pending / declined / cancelled cannot review).
 * Ticket ownership alone never grants eligibility (there is no ticket input). Returns eligible, or a reason.
 */
export function getReviewEligibility(input: ReviewEligibilityInput): ReviewEligibility {
  if (!input.isPublished || input.visibility !== 'public') return { eligible: false, reason: 'not_public' }
  if (!isProjectCompleted(input.occurrences, input.nowMs)) return { eligible: false, reason: 'activity_not_completed' }
  if (input.participantStatus === null) return { eligible: false, reason: 'not_participant' }
  if (input.participantStatus !== 'approved') return { eligible: false, reason: 'participant_not_approved' }
  return { eligible: true }
}

/** Boolean convenience over getReviewEligibility — eligible or not. */
export function canParticipantReview(input: ReviewEligibilityInput): boolean {
  return getReviewEligibility(input).eligible
}

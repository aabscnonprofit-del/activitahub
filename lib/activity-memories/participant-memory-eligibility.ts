// Participant Memory Eligibility — the SINGLE canonical gate deciding WHETHER a participant may contribute to
// Activity Memories on a completed public activity. It implements NO participant stories / photos / videos /
// uploads / albums and owns no business object: it is a pure, read-only projection.
//
// The rule is IDENTICAL to review eligibility — an APPROVED participant of a PUBLIC + COMPLETED activity — so
// the platform keeps ONE coherent participation-validation layer: this delegates to getReviewEligibility rather
// than re-deriving the conditions (which themselves reuse the shared completed-public-activities projection).
// Attendance is decided by Participants only; ticket ownership never grants permission, so there is no ticket
// input and the Ticket System is never read. Every future participant-generated memory (stories, photos,
// videos, shared albums, documents, links, collaborative memories) must reuse THIS gate.

import { getReviewEligibility, type ReviewEligibilityInput, type ReviewEligibility, type ReviewIneligibilityReason } from '@/lib/reviews/reviews-eligibility'

/** Why a participant may NOT contribute (internal use — never UI text). Shared with review eligibility. */
export type ParticipantMemoryIneligibilityReason = ReviewIneligibilityReason

export type ParticipantMemoryEligibility = ReviewEligibility
export type ParticipantMemoryEligibilityInput = ReviewEligibilityInput

/**
 * The canonical participant-memory-contribution rule. A participant may contribute ONLY when ALL hold:
 *   1+2. the activity is PUBLIC (published AND visibility = 'public'),
 *   3.   it is a COMPLETED activity (shared completed-public-activities projection — not re-derived here),
 *   4.   the reviewer IS a participant,
 *   5.   their status is 'approved' (pending / declined / cancelled cannot contribute).
 * Ticket ownership alone never grants eligibility. Shares the participation rule with review eligibility.
 */
export function getParticipantMemoryEligibility(input: ParticipantMemoryEligibilityInput): ParticipantMemoryEligibility {
  return getReviewEligibility(input)
}

/** Boolean convenience over getParticipantMemoryEligibility — eligible or not. */
export function canContributeActivityMemory(input: ParticipantMemoryEligibilityInput): boolean {
  return getParticipantMemoryEligibility(input).eligible
}

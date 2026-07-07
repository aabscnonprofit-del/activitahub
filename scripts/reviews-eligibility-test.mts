// Reviews Eligibility — canonical projection contract test.
//
// Verifies the single rule that decides whether a participant may review a completed public activity: public +
// completed (shared projection) + an APPROVED participant. No reviews/ratings/entity/UI; tickets never grant
// eligibility. Pure logic (imported) + source analysis. Reads source only.
//
//   Run:  npx tsx scripts/reviews-eligibility-test.mts

import { readFileSync } from 'node:fs'
import { getReviewEligibility, canParticipantReview, type ReviewEligibilityInput } from '../lib/reviews/reviews-eligibility'

const helper = readFileSync(new URL('../lib/reviews/reviews-eligibility.ts', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const NOW = Date.parse('2026-07-01T00:00:00Z')
const past = { starts_at: '2026-06-01T10:00:00Z', ends_at: '2026-06-01T12:00:00Z' }
const future = { starts_at: '2026-08-01T10:00:00Z', ends_at: '2026-08-01T12:00:00Z' }
const base: Omit<ReviewEligibilityInput, 'participantStatus'> = { isPublished: true, visibility: 'public', occurrences: [past], nowMs: NOW }
const reason = (i: ReviewEligibilityInput) => { const r = getReviewEligibility(i); return r.eligible ? 'ELIGIBLE' : r.reason }

// 1. Eligible only when public + completed + approved participant.
check('eligible: published + public + completed + approved', getReviewEligibility({ ...base, participantStatus: 'approved' }).eligible === true)

// 2. Public gate (published AND visibility = public).
check('not eligible: unpublished → not_public', reason({ ...base, isPublished: false, participantStatus: 'approved' }) === 'not_public')
check('not eligible: private → not_public', reason({ ...base, visibility: 'private', participantStatus: 'approved' }) === 'not_public')

// 3. Completion uses the shared completed-public-activities projection.
check('not eligible: has an upcoming occurrence → activity_not_completed', reason({ ...base, occurrences: [past, future], participantStatus: 'approved' }) === 'activity_not_completed')
check('not eligible: no occurrences → activity_not_completed', reason({ ...base, occurrences: [], participantStatus: 'approved' }) === 'activity_not_completed')
check('helper reuses isProjectCompleted (no duplicated completion logic)',
  helper.includes("import { isProjectCompleted") && helper.includes('isProjectCompleted(input.occurrences, input.nowMs)') && !/ends_at \?\? [a-z.]*starts_at/.test(helper.replace(/\/\/.*$/gm, '')))

// 4. Participant must exist.
check('not eligible: not a participant → not_participant', reason({ ...base, participantStatus: null }) === 'not_participant')

// 5. Only APPROVED participants — pending / declined / cancelled cannot review.
check('not eligible: pending → participant_not_approved', reason({ ...base, participantStatus: 'pending' }) === 'participant_not_approved')
check('not eligible: declined → participant_not_approved', reason({ ...base, participantStatus: 'declined' }) === 'participant_not_approved')
check('not eligible: cancelled → participant_not_approved', reason({ ...base, participantStatus: 'cancelled' }) === 'participant_not_approved')

// 6. canParticipantReview boolean matches getReviewEligibility.
check('canParticipantReview: approved true, pending false', canParticipantReview({ ...base, participantStatus: 'approved' }) && !canParticipantReview({ ...base, participantStatus: 'pending' }))

// 7. Ticket ownership never grants eligibility — the helper never reads the Ticket System.
check('helper takes no ticket input + never reads the Ticket System', !/ticket_type|getProjectTicketType|TicketType|ticketType/i.test(helper.replace(/\/\/.*$/gm, '')))

// 8. No reviews/ratings/entity/UI, no DB read, no schema/migration.
check('no Review/Rating entity, no DB read, no UI in the helper',
  !/from\('|createReview|createRating|<[A-Za-z]|useState|CREATE TABLE|export interface Review\b/.test(helper))
check('no new migration for reviews eligibility', (() => { try { readFileSync(new URL('../supabase/migrations/063_reviews.sql', import.meta.url)); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Participant Memory Eligibility — canonical projection contract test.
//
// The single gate deciding whether a participant may contribute to Activity Memories on a completed public
// activity: public + completed (shared projection) + an APPROVED participant. Shares the participation rule
// with Review Eligibility (no duplicated business rules); tickets never grant eligibility; no entity/UI/schema.
// Pure logic (imported) + source analysis. Reads source only.
//
//   Run:  npx tsx scripts/participant-memory-eligibility-test.mts

import { readFileSync } from 'node:fs'
import { getParticipantMemoryEligibility, canContributeActivityMemory, type ParticipantMemoryEligibilityInput } from '../lib/activity-memories/participant-memory-eligibility'

const helper = readFileSync(new URL('../lib/activity-memories/participant-memory-eligibility.ts', import.meta.url), 'utf8')
const reviews = readFileSync(new URL('../lib/reviews/reviews-eligibility.ts', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const NOW = Date.parse('2026-07-01T00:00:00Z')
const past = { starts_at: '2026-06-01T10:00:00Z', ends_at: '2026-06-01T12:00:00Z' }
const future = { starts_at: '2026-08-01T10:00:00Z', ends_at: '2026-08-01T12:00:00Z' }
const base: Omit<ParticipantMemoryEligibilityInput, 'participantStatus'> = { isPublished: true, visibility: 'public', occurrences: [past], nowMs: NOW }
const reason = (i: ParticipantMemoryEligibilityInput) => { const r = getParticipantMemoryEligibility(i); return r.eligible ? 'ELIGIBLE' : r.reason }

// 1. Eligible only when public + completed + approved participant.
check('eligible: published + public + completed + approved', getParticipantMemoryEligibility({ ...base, participantStatus: 'approved' }).eligible === true)

// 2. Public gate.
check('unpublished → not_public', reason({ ...base, isPublished: false, participantStatus: 'approved' }) === 'not_public')
check('private → not_public', reason({ ...base, visibility: 'private', participantStatus: 'approved' }) === 'not_public')

// 3. Completion reuses the shared completed-public-activities projection.
check('upcoming occurrence → activity_not_completed', reason({ ...base, occurrences: [past, future], participantStatus: 'approved' }) === 'activity_not_completed')
check('no occurrences → activity_not_completed', reason({ ...base, occurrences: [], participantStatus: 'approved' }) === 'activity_not_completed')

// 4. Participant must exist.
check('not a participant → not_participant', reason({ ...base, participantStatus: null }) === 'not_participant')

// 5. Only APPROVED participants — pending / declined / cancelled cannot contribute.
check('pending → participant_not_approved', reason({ ...base, participantStatus: 'pending' }) === 'participant_not_approved')
check('declined → participant_not_approved', reason({ ...base, participantStatus: 'declined' }) === 'participant_not_approved')
check('cancelled → participant_not_approved', reason({ ...base, participantStatus: 'cancelled' }) === 'participant_not_approved')

// 6. Boolean convenience.
check('canContributeActivityMemory: approved true, pending false', canContributeActivityMemory({ ...base, participantStatus: 'approved' }) && !canContributeActivityMemory({ ...base, participantStatus: 'pending' }))

// 7. Shares the participation rule (no duplicated business rules) + never reads the Ticket System.
check('delegates to Review Eligibility (shared rule, not re-derived)',
  helper.includes('getReviewEligibility(input)') && !/isProjectCompleted|participantStatus !== 'approved'|visibility !== 'public'/.test(helper.replace(/\/\/.*$/gm, '')))
check('completion reuse is inherited (review eligibility uses isProjectCompleted)', reviews.includes('isProjectCompleted(input.occurrences, input.nowMs)'))
check('no ticket input; never reads the Ticket System', !/ticket_type|getProjectTicketType|TicketType|ticketType/i.test(helper.replace(/\/\/.*$/gm, '')))

// 8. No entity / UI / DB / schema — a pure projection.
check('no entity/UI/DB/story/photo/upload implementation',
  !/from\('|createClient|<[A-Za-z]|useState|CREATE TABLE|ParticipantStory|createMemory|upload/.test(helper.replace(/\/\/.*$/gm, '')))
check('no new migration for participant memory eligibility', (() => { try { readFileSync(new URL('../supabase/migrations/065_participant_memories.sql', import.meta.url)); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

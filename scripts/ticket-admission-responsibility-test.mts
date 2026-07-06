// Ticket acquisition vs Participant admission — responsibility-split contract test.
//
// Ticket System answers "does this person have the required ticket?" (acquisition). Join Policy answers "can
// this person participate?" (admission status). These are independent: the Ticket System must NEVER assign a
// participant status. Pure import + source analysis of the join action. Reads source only.
//
//   Run:  npx tsx scripts/ticket-admission-responsibility-test.mts

import { readFileSync } from 'node:fs'
import { admissionStatusForJoinPolicy } from '../lib/participants/model'

const joinAction = readFileSync(new URL('../lib/actions/project-participants.ts', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. ADMISSION is decided ONLY by the Join Policy — total (never null), independent of any ticket.
check('Join Policy admission: instant → approved', admissionStatusForJoinPolicy('instant') === 'approved')
check('Join Policy admission: approval → pending', admissionStatusForJoinPolicy('approval') === 'pending')
check('Join Policy admission: ticket (once acquired) → approved', admissionStatusForJoinPolicy('ticket') === 'approved')
check('admission is total — it never returns null (the "no participant" decision is not admission)',
  ['instant', 'approval', 'ticket'].every((p) => admissionStatusForJoinPolicy(p as 'instant') !== null))

// 2. In the join action, ADMISSION status comes solely from the Join Policy function (single source).
check('participant status is sourced from admissionStatusForJoinPolicy', joinAction.includes('const status = admissionStatusForJoinPolicy(joinPolicy)'))

// 3. The TICKET SYSTEM (the ticket branch) decides ACQUISITION only — it assigns NO participant status.
const ticketBranch = (joinAction.match(/if \(joinPolicy === 'ticket'\) \{[\s\S]*?\n  \}/) ?? [''])[0]
check('ticket branch exists and gates on the ticket type', ticketBranch.includes('getProjectTicketType'))
check('ticket branch assigns NO participant status (never approved/pending/declined/cancelled)',
  !/status\s*=\s*'(approved|pending|declined|cancelled)'/.test(ticketBranch) && !/'approved'|'pending'|'declined'|'cancelled'/.test(ticketBranch))

// 4. Acquisition outcomes: FREE → falls through to create a participant; PAID / DONATION → no participant yet.
check('FREE ticket → falls through (creates a participant per the Join Policy)', ticketBranch.includes("if (ticketType !== 'free') return"))
check('PAID / DONATION → returns before joinProject (no participant yet)', joinAction.includes("if (ticketType !== 'free') return { ok: true, outcome: ticketType }"))
check('no hardcoded "free ticket → approved" assumption remains', !joinAction.includes("status = 'approved'"))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Participant journey (P3) — Registration → Ticket → Confirmation → History coherence.
//
// The confirmation of a spot must be a clear, self-contained moment (an affordance, not a bare line) with a
// next step, and identity/formatting must stay consistent with the rest of the journey. History must be
// reachable and rendered by the SAME card the participant already knows from Discover.
//
//   Run:  npx tsx scripts/participant-confirmation-coherence-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const code = (p: string) => read(p).replace(/\/\/.*$/gm, '')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const joinBtn = code('../components/participants/JoinButton.tsx')
const publicPage = code('../app/[locale]/p/[projectId]/page.tsx')
const history = code('../app/[locale]/me/history/page.tsx')
const account = code('../app/[locale]/account/page.tsx')

// ── Confirmation is a clear affordance, not a bare status line ───────────────────────────────────────────
check('confirmed state is a bordered confirmation block', /status === 'approved' \|\| status === 'pending'/.test(joinBtn) && joinBtn.includes('rounded-xl border'))
check('confirmation shows a success/pending icon', joinBtn.includes('CheckCircle2') && joinBtn.includes('Clock'))
check('canonical status messages are preserved (regression)',
  joinBtn.includes('You are approved for this activity.') && joinBtn.includes('Request sent. Waiting for organizer approval.'))
check('approved confirmation points to arrival coordination ("Getting there")', joinBtn.includes('Getting there'))

// ── Onward navigation after confirming — to the real (project-world) Discover ────────────────────────────
check('confirmation offers onward navigation to Discover (/activities)', joinBtn.includes('/${locale}/activities') && joinBtn.includes('Browse more activities'))

// ── Honest date heading — no false "choose" affordance (join is per-activity) ───────────────────────────
check('occurrence heading is honest ("Upcoming dates", not "Choose a date")',
  publicPage.includes("'Upcoming dates'") && !publicPage.includes("'Choose a date'"))

// ── History: reachable + consistent with Discover ───────────────────────────────────────────────────────
check('participant can reach history from their account hub', account.includes('/me/history'))
check('history renders the SAME ActivityCard as Discover (one card, consistent identity/date)', history.includes('ActivityCard') && history.includes('listParticipantHistory'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Participant Join-states UX — copy contract test.
//
// Asserts the Activity Page clearly explains each Join Policy, the participant sees a clear status after joining,
// and the organizer roster groups are understandable — copy only, architecture unchanged (ticket stays
// non-functional; no payment/ticket/check-in). Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/participant-join-states-ux-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const joinBtn = read('../components/participants/JoinButton.tsx')
const roster = read('../components/projects/ParticipantsRosterPanel.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Activity Page CTA — button + hint per Join Policy.
check('instant → "Join" + hint "added … immediately"',
  joinBtn.includes("instant: 'Join'") && joinBtn.includes('You will be added to this activity immediately.'))
check('approval → "Request to Join" + hint "organizer will review"',
  joinBtn.includes("approval: 'Request to Join'") && joinBtn.includes('The organizer will review your request.'))
check('ticket → "Get Tickets" + hint "required … future update"',
  joinBtn.includes('Get Tickets') && joinBtn.includes('Tickets are required for this activity. Ticketing will be available in a future update.'))
check('ticket remains NON-functional (no participant, disabled CTA)', joinBtn.includes("joinPolicy === 'ticket'") && joinBtn.includes('aria-disabled'))

// 2. Participant status after joining — clear message per status.
check('pending → "Request sent. Waiting for organizer approval."', joinBtn.includes('Request sent. Waiting for organizer approval.'))
check('approved → "You are approved for this activity."', joinBtn.includes('You are approved for this activity.'))
check('declined → "Your request was declined."', joinBtn.includes('Your request was declined.'))
check('cancelled → "You cancelled your participation."', joinBtn.includes('You cancelled your participation.'))

// 3. Organizer roster — understandable group headings + empty state.
check('empty state "No participants yet."', roster.includes('No participants yet.'))
check('pending group heading "Pending requests"', roster.includes("pending: 'Pending requests'"))
check('approved group heading "Approved participants"', roster.includes("approved: 'Approved participants'"))
check('declined group heading "Declined requests"', roster.includes("declined: 'Declined requests'"))
check('cancelled group heading "Cancelled participation"', roster.includes("cancelled: 'Cancelled participation'"))
check('group headings drive the section titles (GROUP_HEADING used)', roster.includes('{GROUP_HEADING[status]}'))

// 4. Architecture unchanged — copy only; no payment/ticket/check-in introduced.
check('no payment/ticket/check-in implementation added', !/from\('(tickets|payments|check_?ins)'\)|createTicket|createPayment|stripe|qr(code)?/i.test(joinBtn + roster))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

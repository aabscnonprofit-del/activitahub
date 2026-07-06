// Project Ticket System — contract test.
//
// The Ticket System is a Project subsystem on top of Participants, active only when join_policy = 'ticket'. It
// adds a ticket type (free/paid/donation, default free): free → a Participant is created; paid/donation → no
// Participant yet (future Checkout/Donation). Asserts NO payment/checkout/QR/check-in/refund. Source analysis.
//
//   Run:  npx tsx scripts/project-ticket-system-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/062_project_ticket_type.sql')
const store = read('../lib/projects/store.ts')
const projActions = read('../lib/actions/projects.ts')
const joinAction = read('../lib/actions/project-participants.ts')
const cfgPanel = read('../components/projects/TicketConfigPanel.tsx')
const joinBtn = read('../components/participants/JoinButton.tsx')
const activityPage = read('../app/[locale]/p/[projectId]/page.tsx')
const workspace = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const NO_PAYMENT = /stripe|paypal|apple.?pay|google.?pay|refund|coupon|promo|qrcode|check_?in|seat|invoice|checkout\(/i

// 1. Migration 062 — ticket_type config; default free; three values; NO payment/checkout entity.
check('adds ticket_type column (idempotent)', mig.includes('ADD COLUMN IF NOT EXISTS ticket_type'))
check('ticket_type NOT NULL, default free', /ticket_type TEXT NOT NULL/.test(mig) && /DEFAULT 'free'/.test(mig))
check('constrained to free/paid/donation', /CHECK \(ticket_type IN \('free', 'paid', 'donation'\)\)/.test(mig))
check('migration adds only the config attribute — no table, no payment/checkout',
  !/CREATE TABLE/i.test(mig) && !NO_PAYMENT.test(mig.replace(/--.*$/gm, '')))

// 2. Store — ticket type is a Project attribute; tolerant default free; owner-scoped write.
check('TicketType type (free|paid|donation)', store.includes("export type TicketType = 'free' | 'paid' | 'donation'"))
check('getProjectTicketType defaults to free when absent/error', /getProjectTicketType[\s\S]{0,400}return 'free'/.test(store))
check('setProjectTicketType owner-scoped update', store.includes('.update({ ticket_type: ticketType })'))

// 3. Organizer action — validates the three types, owner-gated.
check('setProjectTicketTypeAction validates + owner-gated',
  projActions.includes('export async function setProjectTicketTypeAction') &&
  projActions.includes("ticketType !== 'free' && ticketType !== 'paid' && ticketType !== 'donation'") &&
  projActions.includes('getProject(supabase, projectId)'))

// 4. Join action — the acceptance table for participant creation.
check('join is server-authoritative on the ticket type (reads getProjectTicketType)', joinAction.includes('getProjectTicketType(supabase, projectId)'))
check('FREE ticket → a Participant is created (approved)', joinAction.includes("if (joinPolicy === 'ticket')") && joinAction.includes("status = 'approved'"))
check('PAID / DONATION → NO participant yet (returns before joinProject)', joinAction.includes("if (ticketType !== 'free') return { ok: true, outcome: ticketType }"))
check('instant/approval unchanged (initialParticipantStatus)', joinAction.includes('initialParticipantStatus(joinPolicy)'))
check('join action implements no payment/checkout/qr/check-in', !NO_PAYMENT.test(joinAction))

// 5. Organizer Ticket Configuration — Free / Paid / Donation, with the future-update copy; calls the action.
check('Ticket Configuration offers Free Ticket / Paid Ticket / Donation',
  cfgPanel.includes("title: 'Free Ticket'") && cfgPanel.includes("title: 'Paid Ticket'") && cfgPanel.includes("title: 'Donation'"))
check('Paid = "Payment required. Checkout will be available in a future update."', cfgPanel.includes('Payment required. Checkout will be available in a future update.'))
check('Donation = "Donation support will be available in a future update."', cfgPanel.includes('Donation support will be available in a future update.'))
check('config panel calls the owner-gated action', cfgPanel.includes('setProjectTicketTypeAction(projectId, next, locale)'))

// 6. Activity Page reflects the ticket type — Get Free Ticket / Buy Ticket / Support this Activity.
check('free → "Get Free Ticket" (functional join)', joinBtn.includes('Get Free Ticket') && joinBtn.includes('joinProjectAction(projectId, locale)'))
check('paid → "Buy Ticket" (display only)', joinBtn.includes("label: 'Buy Ticket'") && joinBtn.includes('Payment required. Checkout will be available in a future update.'))
check('donation → "Support this Activity" (display only)', joinBtn.includes("label: 'Support this Activity'") && joinBtn.includes('Donation support will be available in a future update.'))
check('paid/donation are NON-functional (no participant created)', joinBtn.includes("joinPolicy === 'ticket' && ticketType === 'paid'") && joinBtn.includes('aria-disabled'))
check('JoinButton implements no payment/checkout/qr/check-in', !NO_PAYMENT.test(joinBtn))

// 7. Wiring — Activity Page passes ticket type; workspace renders the Ticket Configuration section.
check('Activity Page loads ticket type + passes it to JoinButton', activityPage.includes('getProjectTicketType(supabase, projectId)') && activityPage.includes('ticketType={ticketType}'))
check('workspace renders the Ticket Configuration panel', workspace.includes('getProjectTicketType(supabase, projectId)') && workspace.includes('<TicketConfigPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

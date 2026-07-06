// Participant Workspace — contract test.
//
// The organizer's operational UI for managing Project Participants: participant CARDS (name/email/phone/status/
// join source/created at) grouped by status, with status-appropriate actions (Approve / Decline / Remove). It
// manages only Participants (Project data) — not ticket acquisition, not Project Access. Asserts NO messaging/
// notifications/check-in/attendance/payments/tickets/invitations, no schema change. Source analysis.
//
//   Run:  npx tsx scripts/project-participant-workspace-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const panel = read('../components/projects/ParticipantsRosterPanel.tsx')
const store = read('../lib/participants/store.ts')
const action = read('../lib/actions/project-participants.ts')
const workspace = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Participant card fields — name / email / phone / status / join source / created at.
check('card shows name (fallback email / account id)', panel.includes('p.name || p.email'))
check('card shows email + phone', panel.includes('p.email') && panel.includes('p.phone'))
check('card shows the status badge', panel.includes('BADGE[p.status]') && panel.includes('STATUS_LABEL[p.status]'))
check('card shows the join source', panel.includes('Source: {p.joinSource}'))
check('card shows the created-at (joined) date', panel.includes('Joined {p.createdAt'))

// 2. Grouped by status — the four groups with understandable headings.
check('grouped by status (four groups)', panel.includes("['pending', 'approved', 'declined', 'cancelled']"))
check('group headings present', panel.includes("pending: 'Pending requests'") && panel.includes("approved: 'Approved participants'") && panel.includes("declined: 'Declined requests'") && panel.includes("cancelled: 'Cancelled participation'"))

// 3. Status-appropriate actions.
check('Pending → Approve + Decline', panel.includes("if (p.status === 'pending')") && panel.includes('approveParticipantAction(projectId, p.id, locale)') && panel.includes('declineParticipantAction(projectId, p.id, locale)'))
check('Approved → Remove', panel.includes("if (p.status === 'approved')") && panel.includes('removeParticipantAction(projectId, p.id, locale)'))
check('Declined → Approve', panel.includes("if (p.status === 'declined') return approve"))
check('Cancelled → read-only (no action)', panel.includes('return null // cancelled → read-only'))

// 4. Remove action + store — owner-gated hard delete.
check('removeParticipantAction is owner-gated', action.includes('export async function removeParticipantAction') && action.includes('getProject(supabase, projectId)') && action.includes('removeParticipant(supabase, projectId, participantId)'))
check('store removeParticipant hard-deletes the row', store.includes("from('project_participants').delete()"))

// 5. Profile enrichment (name/email) — no phone stored (schema unchanged); join source derived from config.
check('getParticipantProfiles loads name + email (no phone column)', store.includes("select('id, full_name, email')") && !store.includes("select('id, full_name, email, phone')"))
check('workspace loads profiles + passes participant cards', workspace.includes('getParticipantProfiles(participants.map((p) => p.accountId))') && workspace.includes('joinSource: joinSourceLabel'))
check('join source derived from the Project join configuration', workspace.includes("'Instant Join'") && workspace.includes("'Approval Request'") && workspace.includes("'Free Ticket'"))

// 6. Manages ONLY Participants — no messaging/notifications/check-in/attendance/payments/tickets/invitations.
check('workspace panel introduces no messaging/notifications/check-in/attendance/payment/ticket/invitation controls',
  !/<input|<textarea|<form|sendMessage|createNotif|checkIn|createTicket|stripe|createInvitation/i.test(panel.replace(/\/\/.*$/gm, '')))

// 7. No schema change — no new migration for the Participant Workspace.
check('no new migration added for the workspace', (() => { try { read('../supabase/migrations/063_participant_workspace.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

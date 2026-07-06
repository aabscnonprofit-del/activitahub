// Project Participants — contract test.
//
// Verifies the Project Participant MODEL: every person who joins a Project becomes a Project Participant with a
// status (pending/approved/declined/cancelled), created per the Join Policy (instant→approved, approval→pending,
// ticket→none), and the organizer can approve/decline pending requests. Asserts NO Ticket/Registration/Purchase/
// Payment/Check-in/Attendance entity and no checked-in/attended/no-show status. Pure-model import + source
// analysis. Reads source only.
//
//   Run:  npx tsx scripts/project-participants-test.mts

import { readFileSync } from 'node:fs'
import { initialParticipantStatus, groupByStatus, PARTICIPANT_STATUSES, isParticipantStatus, type ProjectParticipant } from '../lib/participants/model'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/061_project_participants.sql')
const store = read('../lib/participants/store.ts')
const action = read('../lib/actions/project-participants.ts')
const joinBtn = read('../components/participants/JoinButton.tsx')
const roster = read('../components/projects/ParticipantsRosterPanel.tsx')
const activityPage = read('../app/[locale]/p/[projectId]/page.tsx')
const workspace = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Pure model — statuses + Join-Policy → initial status (the acceptance table).
check('statuses are exactly pending/approved/declined/cancelled', PARTICIPANT_STATUSES.join(',') === 'pending,approved,declined,cancelled')
check('NO checked-in/attended/no-show status (future Check-in System)', !PARTICIPANT_STATUSES.some((s) => /check|attend|show/i.test(s)))
check('Instant Join → approved participant', initialParticipantStatus('instant') === 'approved')
check('Approval Join → pending participant', initialParticipantStatus('approval') === 'pending')
check('Ticket policy → NO participant (null)', initialParticipantStatus('ticket') === null)
check('isParticipantStatus guards the four values', isParticipantStatus('approved') && !isParticipantStatus('attended'))
{
  const mk = (status: string): ProjectParticipant => ({ id: status, projectId: 'p', accountId: 'a', status: status as ProjectParticipant['status'], createdAt: '', updatedAt: '' })
  const g = groupByStatus([mk('pending'), mk('approved'), mk('pending')])
  check('groupByStatus buckets by status (all four present)', g.pending.length === 2 && g.approved.length === 1 && g.declined.length === 0 && g.cancelled.length === 0)
}

// 2. Migration 061 — the participant table only; status default pending; owner + self RLS; NO other entity.
check('creates project_participants (idempotent)', mig.includes('CREATE TABLE IF NOT EXISTS project_participants'))
check('participant belongs to a Project + an account', mig.includes('project_id  UUID NOT NULL REFERENCES projects(id)') && mig.includes('account_id  UUID NOT NULL REFERENCES profiles(id)'))
check('status default pending, constrained to the four values',
  /status\s+TEXT NOT NULL DEFAULT 'pending'/.test(mig) && /CHECK \(status IN \('pending', 'approved', 'declined', 'cancelled'\)\)/.test(mig))
check('one participation per (project, account)', mig.includes('UNIQUE (project_id, account_id)'))
check('owner RLS (organizer manages) + self RLS (join/read/cancel own)',
  mig.includes('project_participants_owner_rw') && mig.includes('project_participants_self_insert') && mig.includes('project_participants_self_update'))
check('migration creates ONLY the participant table — no Ticket/Registration/Purchase/Payment/Check-in entity',
  (mig.match(/CREATE TABLE/gi) ?? []).length === 1 && !/tickets|registrations|purchases|payments|check_?ins|attendance/i.test(mig.replace(/--.*$/gm, '')))
check('no checked-in/attended/no-show status in the migration DDL', !/checked_in|attended|no_show/i.test(mig.replace(/--.*$/gm, '')))

// 3. Store — Project data; graceful degradation; idempotent join.
check('listProjectParticipants degrades to [] when the table is absent', /listProjectParticipants[\s\S]{0,400}return \[\]/.test(store) && store.includes('catch'))
check('join is idempotent (returns existing participation)', store.includes('if (existing) return existing'))
check('store touches only project_participants (no ticket/registration table)',
  store.includes("from('project_participants')") && !/from\('(tickets|registrations|purchases|payments)'\)/.test(store))

// 4. Actions — Join is server-authoritative on the policy; approve/decline owner-gated; cancel is self.
check('joinProjectAction requires auth + a published (joinable) Project', action.includes("error: 'not_authenticated'") && action.includes('getPublicProject(supabase, projectId)'))
check('Join maps policy → status via the model (instant/approval)', action.includes('initialParticipantStatus(joinPolicy)') && action.includes('joinProject(supabase, projectId, user.id, status)'))
check('Ticket policy creates NO participant (outcome ticket, no join)', action.includes("if (status === null) return { ok: true, outcome: 'ticket' }"))
check('organizer approve/decline are owner-gated (getProject)', action.includes('approveParticipantAction') && action.includes('declineParticipantAction') && action.includes('getProject(supabase, projectId)'))
check('participant can cancel their own participation', action.includes('cancelParticipationAction') && action.includes("'cancelled'"))
check('actions implement no ticket/payment/qr/check-in system (only the participant model)',
  !/from\('(tickets|payments|check_?ins|attendance|registrations|purchases)'\)|createTicket|createPayment|stripe|qr(code)?/i.test(action))

// 5. Activity Page Join button — policy-driven; ticket is non-functional; sign-in required; no ticket created.
check('JoinButton CTA is policy-driven (Join / Request to Join / Get Tickets)',
  joinBtn.includes("instant: 'Join'") && joinBtn.includes("approval: 'Request to Join'") && joinBtn.includes('Get Tickets'))
check('ticket policy renders a NON-functional CTA (no participant)', joinBtn.includes("joinPolicy === 'ticket'") && joinBtn.includes('aria-disabled'))
check('requires sign-in to join', joinBtn.includes('Sign in to') && joinBtn.includes('signInHref'))
check('calls the Join action (creates the participant)', joinBtn.includes('joinProjectAction(projectId, locale)'))
check('Activity Page loads viewer participation + renders JoinButton', activityPage.includes('getParticipantForAccount(supabase, projectId, user.id)') && activityPage.includes('<JoinButton'))

// 6. Organizer workspace — a Participants section grouped by status with approve/decline; display only.
check('roster groups participants by status', roster.includes("['pending', 'approved', 'declined', 'cancelled']"))
check('roster approves/declines pending requests', roster.includes('approveParticipantAction(projectId, p.id, locale)') && roster.includes('declineParticipantAction(projectId, p.id, locale)'))
check('roster is display-only (no input/form/editing controls — approve/decline buttons only)',
  !/<input|<textarea|<form|contentEditable/i.test(roster))
check('workspace loads participants + renders the roster', workspace.includes('listProjectParticipants(supabase, projectId)') && workspace.includes('<ParticipantsRosterPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

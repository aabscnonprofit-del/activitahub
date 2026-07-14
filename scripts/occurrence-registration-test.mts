// Occurrence Registration — source-locks the occurrence-bound registration flow + the safe
// expand→contract migration rollout. Pure/wiring assertions (no live DB).
//   Run:  npx tsx scripts/occurrence-registration-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}
const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

// ── Migration 070 (EXPAND) is additive + compatible: it must NOT drop the old constraint ──
const m070 = read('supabase/migrations/070_occurrence_registration_expand.sql')
check('070 adds occurrence_id to project_participants', /ADD COLUMN IF NOT EXISTS occurrence_id/.test(m070))
check('070 does NOT drop UNIQUE(project_id, account_id) (keeps live webhook working)', !/DROP CONSTRAINT[^\n]*project_id_account_id/i.test(m070))
check('070 adds the occurrence counting index', /project_participants_occurrence_status_idx/.test(m070))

// ── Migration 071 (CONTRACT) swaps the constraints (applied AFTER code deploy) ──
const m071 = read('supabase/migrations/071_occurrence_registration_contract.sql')
check('071 drops the old (project, account) unique', /DROP CONSTRAINT IF EXISTS project_participants_project_id_account_id_key/.test(m071))
check('071 adds UNIQUE(occurrence_id, account_id)', /project_participants_occurrence_account_uidx/.test(m071))
check('071 keeps project-level dedup for NULL occurrence', /project_account_nullocc_uidx[\s\S]*WHERE occurrence_id IS NULL/.test(m071))
check('071 re-keys arrival preferences per occurrence', /participant_arrival_preferences_occurrence_account_uidx/.test(m071))

// ── Webhook: constraint-agnostic, occurrence-aware admission + organizer notification ──
const wh = read('app/api/stripe/webhook/route.ts')
check('webhook no longer uses onConflict(project_id,account_id) for tickets', !/onConflict:\s*'project_id,account_id'/.test(wh))
check('webhook reads occurrence_id from metadata', /metadata\?\.occurrence_id/.test(wh))
check('webhook writes occurrence_id on the registration', /occurrence_id:\s*occurrenceId/.test(wh))
check('webhook does check-then-write (no ON CONFLICT on the changing keys)', wh.includes('if (existing)') && wh.includes('.insert({ project_id: ticketProjectId, occurrence_id: occurrenceId'))
check('webhook notifies the organizer with occurrence context', /notifyOrganizerTicketPaid/.test(wh) && /occurrence_id: args.occurrenceId/.test(wh))

// ── Checkout action: occurrence-bound + capacity + occurrence_id in metadata ──
const tickets = read('lib/actions/tickets.ts')
check('checkout takes an occurrenceId argument', /occurrenceId:\s*string/.test(tickets))
check('checkout validates the selected occurrence', /occurrences\.find\(\(o\) => o\.id === occurrenceId\)/.test(tickets))
check('checkout blocks a full occurrence', /occ\.full/.test(tickets) && /occurrence_full/.test(tickets))
check('checkout puts occurrence_id in Stripe metadata', /occurrence_id:\s*occurrenceId/.test(tickets))
check('paid price comes from the SELECTED occurrence', /amountCents = occ\.priceCents/.test(tickets))

// ── Context: purchasable occurrences with per-occurrence remaining capacity ──
const ctx = read('lib/tickets/context.server.ts')
check('context returns occurrences with remaining + full', /remaining:/.test(ctx) && /full:/.test(ctx))
check('context computes remaining from capacity − approved registrations', /capacity - approved/.test(ctx))

// ── Store: occurrence-aware reads + capacity count ──
const store = read('lib/participants/store.ts')
check('store selects occurrence_id', /const COLS =[^\n]*occurrence_id/.test(store))
check('store has getOccurrenceParticipant', /export async function getOccurrenceParticipant/.test(store))
check('store has countApprovedForOccurrence', /export async function countApprovedForOccurrence/.test(store))
check('project-level lookup filters occurrence_id IS NULL', /getParticipantForAccount[\s\S]*is\('occurrence_id', null\)/.test(store))

// ── Ride coordination: occurrence-scoped + constraint-agnostic ──
const arrival = read('lib/arrival/store.ts')
check('arrival setPreference no longer uses onConflict', !/onConflict:\s*'project_id,account_id'/.test(arrival))
check('arrival is occurrence-aware', /occurrenceId/.test(arrival) && /is\('occurrence_id', null\)/.test(arrival))

// ── Participant UI: occurrence selector ──
const jb = read('components/participants/JoinButton.tsx')
check('JoinButton takes occurrences (not a single price)', /occurrences\?\:\s*TicketOcc\[\]/.test(jb) && !/priceCents\?\:/.test(jb))
check('JoinButton has an occurrence selector (radiogroup)', /role="radiogroup"/.test(jb) && /setSelectedId/.test(jb))
check('JoinButton shows remaining spots + Full', /spotsLabel/.test(jb))

// ── Organizer roster: grouped by occurrence with capacity ──
const roster = read('components/projects/ParticipantsRosterPanel.tsx')
check('roster groups by occurrence', /occurrenceId/.test(roster) && /OccurrenceSummary/.test(roster))
check('roster shows per-occurrence remaining/full', /Full/.test(roster) && /remaining/.test(roster))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

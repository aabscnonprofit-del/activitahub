// Participant Project Access — Participant View projection + shared-layer access-safety contract test.
//
//   Run:  npx tsx scripts/participant-access-test.mts

import { readFileSync } from 'node:fs'
import { buildParticipantView } from '../lib/participant-access/projection'
import { accessGrantsView, ACCESS_POLICY } from '../lib/project-access/policy'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  experienceDesign: { intendedFeeling: 'A joyful birthday', arc: 'Build-up to cake' },
  structure: { concept: 'Backyard party' },
  itinerary: [{ name: 'Ceremony', purpose: 'Gather everyone' }],
  costEstimate: { low: 1, likely: 2, high: 3, currency: 'USD', basis: 'x' },
  staffing: [{ role: 'DJ', reason: 'music' }], resources: [{ label: 'Chairs' }], logistics: [{ description: 'setup' }],
} as unknown as EventPlanV2
const occ = [{ startsAt: '2026-08-01T18:00:00.000Z', endsAt: null, location: 'Backyard' }]

// 1. Policy: participant is now implemented; a participant grant may render the Participant View (view-scope).
check('participant view implemented in the Access Policy', ACCESS_POLICY.participant.implemented && ACCESS_POLICY.participant.view === 'participant')
check('participant grant → participant view; not client/worker (view-scope)',
  accessGrantsView('participant', 'participant') && !accessGrantsView('participant', 'client') && !accessGrantsView('participant', 'worker'))
check('a client/worker grant may NOT render the participant view', !accessGrantsView('client', 'participant') && !accessGrantsView('worker', 'participant'))

// 2. Participant View projection: event (title/description/timeline) + schedule + public organizer contacts.
{
  const v = buildParticipantView('p', plan, occ, 'Ada Organizer', 'Ben Lead')
  check('participant view: event + schedule + organizer contacts', v.projectId === 'p' && v.event?.intendedExperience === 'A joyful birthday' && v.occurrences.length === 1 && v.organizerName === 'Ada Organizer' && v.leadOrganizerName === 'Ben Lead')
  check('event exposes only public-safe fields (no cost/staffing/resources/logistics)', v.event !== null && Object.keys(v.event).sort().join(',') === 'concept,experienceArc,intendedExperience,itinerary')
  check('schedule is date + location only (no participant contact info)', Object.keys(v.occurrences[0]).sort().join(',') === 'endsAt,location,startsAt')
  check('participant view keys are only event/occurrences/contacts', Object.keys(v).sort().join(',') === 'event,leadOrganizerName,occurrences,organizerName,projectId')
  check('no plan → view with null event; contacts optional', buildParticipantView('p', null, occ, null, null).event === null)
}

// 3. Loader goes through the SHARED access layer (resolve active by token + participant view-scope) — no new stack.
const view = read('../lib/participant-access/view.ts')
check('loadParticipantView resolves via the shared choke point + participant view-scope',
  view.includes('resolveActiveByToken(admin, token, new Date().toISOString())') && view.includes("accessGrantsView(access.access_type, 'participant')"))
check('reuses buildPublicEventProjection + public organizer contacts (no duplicated projection)',
  view.includes('buildPublicEventProjection') && view.includes('getPublicOrganizer') && view.includes("select('starts_at, ends_at, location')"))
check('participant view imports no organizer-only module (budget/delivery/team/etc.)',
  !view.split('\n').filter((l) => l.trim().startsWith('import')).some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace|worker-access|client-access/i.test(l)))

// 4. Participant View page — token-gated, 404s no-access, no organizer-only imports.
const page = read('../app/[locale]/participant/[token]/page.tsx')
check('participant page loads by token and 404s when access is denied', page.includes('loadParticipantView(token)') && page.includes('notFound()'))
{
  const imports = page.split('\n').filter((l) => l.trim().startsWith('import'))
  check('participant page imports NO organizer-only modules', !imports.some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace/i.test(l)))
}

// 5. Actions run on the SHARED layer (create/revoke/regenerate/remove) — no reimplemented token/revocation.
const action = read('../lib/actions/participant-access.ts')
check('participant actions use the shared store (create type participant / revoke / remove / regenerate)',
  action.includes("createAccessRelationship(ctx.supabase, { projectId, accessType: 'participant'") && action.includes('revokeAccess(') && action.includes('removeAccess(') && action.includes('regenerateToken('))
check('participant actions do NOT reimplement token generation or add a new table',
  !action.includes('randomBytes') && !/project_participants|from\('project_/.test(action) && action.includes("reason: 'invalid_contact'"))
check('add / revoke / regenerate / remove present + revalidate', ['addParticipantAction', 'revokeParticipantAction', 'removeParticipantAction', 'regenerateParticipantLinkAction'].every((a) => action.includes(a)) && action.includes('revalidatePath('))

// 6. No new migration / no new access table — shared layer is the single mechanism.
check('no participant-specific migration file exists', (() => { try { read('../supabase/migrations/059_project_participants.sql'); return false } catch { return true } })())
const projPage = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('organizer page lists participants via the shared layer + renders the panel',
  projPage.includes("listAccessByType(supabase, projectId, 'participant')") && projPage.includes('<ParticipantAccessPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

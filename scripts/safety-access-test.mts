// Safety Project Access — Safety View projection (ADR_013) + shared-layer access-safety contract test.
//
//   Run:  npx tsx scripts/safety-access-test.mts

import { readFileSync } from 'node:fs'
import { buildSafetyView, safetyEventFromPlan, safetyProfileFromPlan } from '../lib/safety-access/projection'
import { accessGrantsView, ACCESS_POLICY } from '../lib/project-access/policy'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// A plan with safety considerations + all the internal fields the Safety View must NEVER surface.
const plan = {
  experienceDesign: { intendedFeeling: 'A lakeside festival', arc: 'x' },
  structure: { concept: 'Outdoor music + food' },
  safety: [{ risk: 'Open water nearby', safeguard: 'Two lifeguards + roped swim area' }, { risk: 'Open flames (grills)', safeguard: 'Fire extinguishers + 3m clearance' }],
  costEstimate: { low: 1, likely: 2, high: 3, currency: 'USD', basis: 'x' },
  staffing: [{ role: 'DJ', reason: 'music' }], resources: [{ label: 'Grills' }], logistics: [{ description: 'setup' }],
  assumptions: [{ statement: 'x', reason: 'y' }], feasibility: { verdict: 'planned', notes: 'z' },
} as unknown as EventPlanV2
const occ = [{ startsAt: '2026-08-01T16:00:00.000Z', endsAt: null, location: 'Lake Park' }]

// 1. Policy: safety is now implemented; a safety grant may render the Safety View (view-scope).
check('safety view implemented in the Access Policy', ACCESS_POLICY.safety.implemented && ACCESS_POLICY.safety.view === 'safety')
check('safety grant → safety view only; not other views (view-scope)',
  accessGrantsView('safety', 'safety') && !accessGrantsView('safety', 'client') && !accessGrantsView('safety', 'participant') && !accessGrantsView('safety', 'worker'))
check('non-safety grants may NOT render the safety view', !accessGrantsView('client', 'safety') && !accessGrantsView('worker', 'safety') && !accessGrantsView('participant', 'safety'))

// 2. Extractors — ADR_013 safety subset (title/description + the plan's safety profile).
check('safetyEventFromPlan → title + description only', safetyEventFromPlan(plan).title === 'A lakeside festival' && safetyEventFromPlan(plan).description === 'Outdoor music + food')
check('safetyProfileFromPlan → structured risk/safeguard from the plan', safetyProfileFromPlan(plan).length === 2 && safetyProfileFromPlan(plan)[0].risk === 'Open water nearby' && safetyProfileFromPlan(plan)[1].safeguard === 'Fire extinguishers + 3m clearance')
check('no plan → empty extraction', safetyEventFromPlan(null).title === null && safetyProfileFromPlan(null).length === 0)

// 3. Projection exposes ONLY ADR_013-approved fields — no budget/proposal/planning-internals/etc.
{
  const { title, description } = safetyEventFromPlan(plan)
  const v = buildSafetyView({ projectId: 'p', title, description, occurrences: occ, expectedAttendance: 500, workerCount: 4, safetyProfile: safetyProfileFromPlan(plan), contacts: { organizerName: 'Ada', leadOrganizerName: 'Ben', safetyCoordinatorName: null } })
  check('safety view keys are exactly the ADR_013 subset',
    Object.keys(v).sort().join(',') === 'contacts,description,expectedAttendance,occurrences,projectId,safetyProfile,title,workerCount')
  check('scale = expected attendance + worker count', v.expectedAttendance === 500 && v.workerCount === 4)
  check('safety profile carried; contacts are public names only', v.safetyProfile.length === 2 && v.contacts.organizerName === 'Ada' && v.contacts.safetyCoordinatorName === null)
  const serialized = JSON.stringify(v)
  check('serialized view leaks NO forbidden data (cost/staffing/resources/logistics/assumptions/feasibility)',
    !/cost|likely|staffing|resources|logistics|assumption|feasibility|budget|proposal|contract/i.test(serialized))
}

// 4. Loader goes through the SHARED access layer (resolve active by token + safety view-scope) — no new stack.
const view = read('../lib/safety-access/view.ts')
check('loadSafetyView resolves via the shared choke point + safety view-scope',
  view.includes('resolveActiveByToken(admin, token, new Date().toISOString())') && view.includes("accessGrantsView(access.access_type, 'safety')"))
check('scale reuses canonical sources (participant count + active worker relationships via shared store)',
  view.includes('projectParticipantCount(admin, projectId)') && view.includes("listAccessByType(admin, projectId, 'worker')"))
check('safety view imports no organizer-only workspace module',
  !view.split('\n').filter((l) => l.trim().startsWith('import')).some((l) => /delivery|team|organizer-workspace|worker-access|client-access|participant-access/i.test(l)))

// 5. Safety page — token-gated, 404s no-access, legal notice shown, no organizer-only imports.
const page = read('../app/[locale]/safety/[token]/page.tsx')
check('safety page loads by token and 404s when access is denied', page.includes('loadSafetyView(token)') && page.includes('notFound()'))
check('legal notice is shown whenever a Safety Link is opened (ADR_013)', /authorized public-safety personnel/i.test(page) && /Unauthorized use may violate/i.test(page))
{
  const imports = page.split('\n').filter((l) => l.trim().startsWith('import'))
  check('safety page imports NO organizer-only modules', !imports.some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace/i.test(l)))
}

// 6. Actions on the SHARED layer (create/revoke/regenerate/remove) — no reimplemented token/revocation/table.
const action = read('../lib/actions/safety-access.ts')
check('safety actions use the shared store (create type safety / revoke / remove / regenerate)',
  action.includes("createAccessRelationship(ctx.supabase, { projectId, accessType: 'safety'") && action.includes('revokeAccess(') && action.includes('removeAccess(') && action.includes('regenerateToken('))
check('safety actions do NOT reimplement token generation or add a new table',
  !action.includes('randomBytes') && !/from\('project_/.test(action) && action.includes("reason: 'invalid_contact'"))
check('create / revoke / regenerate / remove present + revalidate', ['addSafetyAccessAction', 'revokeSafetyAccessAction', 'removeSafetyAccessAction', 'regenerateSafetyLinkAction'].every((a) => action.includes(a)) && action.includes('revalidatePath('))

// 7. No new migration / no new access table; organizer page wires it via the shared layer.
check('no safety-specific migration file exists', (() => { try { read('../supabase/migrations/059_project_safety.sql'); return false } catch { return true } })())
const projPage = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('organizer page lists safety grants via the shared layer + renders the panel',
  projPage.includes("listAccessByType(supabase, projectId, 'safety')") && projPage.includes('<SafetyAccessPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

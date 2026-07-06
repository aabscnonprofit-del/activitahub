// Client Project Access — Client View projection + access-safety contract test.
//
//   Run:  npx tsx scripts/client-access-test.mts

import { readFileSync } from 'node:fs'
import { buildClientView } from '../lib/client-access/view'
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
  // internal fields the client must never see:
  costEstimate: { low: 100, likely: 200, high: 300, currency: 'USD', basis: 'x' },
  staffing: [{ role: 'DJ', reason: 'music' }], resources: [{ label: 'Chairs' }], logistics: [{ description: 'setup' }],
} as unknown as EventPlanV2
const occ = [{ startsAt: '2026-08-01T18:00:00.000Z', endsAt: null, location: 'Backyard' }]

// 1. Active/invited relationship → the client-safe projection (event + schedule).
{
  const v = buildClientView('p', 'invited', plan, occ)
  check('invited client → view built with event + schedule', v !== null && v.projectId === 'p' && v.event?.intendedExperience === 'A joyful birthday' && v.occurrences.length === 1)
  check('event exposes only public-safe fields (title/arc/concept/itinerary) — no cost/staffing/resources/logistics',
    v !== null && v.event !== null && Object.keys(v.event).sort().join(',') === 'concept,experienceArc,intendedExperience,itinerary')
  check('schedule is date + location only', v !== null && Object.keys(v.occurrences[0]).sort().join(',') === 'endsAt,location,startsAt')
}
// 2. Revoked relationship → NO access.
check('revoked client → null (no access)', buildClientView('p', 'revoked', plan, occ) === null)
// 3. No plan yet → view with null event (event being prepared), still no crash.
check('no plan → view with null event', buildClientView('p', 'active', null, occ)?.event === null)

// 4. Loader resolves by token, denies revoked, reuses the public-safe projection.
const view = read('../lib/client-access/view.ts')
check('loadClientView resolves by invite token and denies revoked',
  view.includes('getProjectClientByToken(admin, token)') && view.includes("client.status === 'revoked'"))
check('client view reuses buildPublicEventProjection (no duplicated projection) and is date/location for schedule',
  view.includes('buildPublicEventProjection') && view.includes("select('starts_at, ends_at, location')"))

// 5. Client View page exposes ONLY the client projection — no organizer modules imported.
const page = read('../app/[locale]/client/[token]/page.tsx')
check('client page loads by token and 404s a revoked/unknown token', page.includes('loadClientView(token)') && page.includes('notFound()'))
{
  const imports = page.split('\n').filter((l) => l.trim().startsWith('import'))
  check('client page imports NO organizer-only modules (budget/delivery/team/capacity/lead/execution)',
    !imports.some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace/i.test(l)))
}

// 6. Organizer actions: owner-gated, project-scoped secure token, add/revoke/remove/resend, revalidate.
const action = read('../lib/actions/client-access.ts')
check('actions are owner-gated (getProject) + generate a secure project-scoped token',
  action.includes('getProject(supabase, projectId)') && action.includes("randomBytes(24).toString('hex')") && action.includes("reason: 'not_authenticated'"))
check('actions cover add / revoke / remove / resend and revalidate',
  action.includes('addClientAction') && action.includes('revokeClientAction') && action.includes('removeClientAction') && action.includes('resendInvitationAction') && action.includes('revalidatePath('))
check('add requires a contact (email or phone) — invalid_contact otherwise', action.includes("reason: 'invalid_contact'"))
check('revoke sets status revoked; resend issues a fresh token',
  action.includes("updateProjectClientStatus(ctx.supabase, projectId, clientId, 'revoked')") && action.includes('updateProjectClientToken(ctx.supabase, projectId, clientId, newInviteToken())'))

// 7. Invite link is project-scoped (token → one project via one project_clients row); migration is a relationship.
const store = read('../lib/client-access/store.ts')
const mig = read('../supabase/migrations/056_project_clients.sql')
check('token resolves to exactly one project via one relationship row (project-scoped)',
  store.includes("eq('invite_token', token)") && /invite_token +TEXT NOT NULL UNIQUE/.test(mig) && /project_id +UUID NOT NULL REFERENCES projects/.test(mig))
check('relationship, not a new Project model: table carries only the link + status + token',
  /status +TEXT NOT NULL DEFAULT 'invited' CHECK/.test(mig) && !/plan|budget|delivery|execution/i.test(mig))

// 8. Organizer page renders the panel (organizer-only control), never the Client View there.
const projPage = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('organizer page loads clients + renders ClientAccessPanel (owner control)',
  projPage.includes('listProjectClients(supabase, projectId)') && projPage.includes('<ClientAccessPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

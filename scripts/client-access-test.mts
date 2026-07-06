// Client Project Access — Client View projection + shared-layer access-safety contract test.
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
  costEstimate: { low: 100, likely: 200, high: 300, currency: 'USD', basis: 'x' },
  staffing: [{ role: 'DJ', reason: 'music' }], resources: [{ label: 'Chairs' }], logistics: [{ description: 'setup' }],
} as unknown as EventPlanV2
const occ = [{ startsAt: '2026-08-01T18:00:00.000Z', endsAt: null, location: 'Backyard' }]

// 1. Client View projection (public-safe; internal fields never present).
{
  const v = buildClientView('p', plan, occ)
  check('client view: event + schedule', v.projectId === 'p' && v.event?.intendedExperience === 'A joyful birthday' && v.occurrences.length === 1)
  check('event exposes only public-safe fields (no cost/staffing/resources/logistics)', v.event !== null && Object.keys(v.event).sort().join(',') === 'concept,experienceArc,intendedExperience,itinerary')
  check('schedule is date + location only', Object.keys(v.occurrences[0]).sort().join(',') === 'endsAt,location,startsAt')
  check('no plan → view with null event', buildClientView('p', null, occ).event === null)
}

// 2. Loader goes through the SHARED access layer (resolve active by token + view-scope) — no per-type store.
const view = read('../lib/client-access/view.ts')
check('loadClientView resolves via the shared choke point + client view-scope',
  view.includes('resolveActiveByToken(admin, token, new Date().toISOString())') && view.includes("accessGrantsView(access.access_type, 'client')"))
check('client view reuses buildPublicEventProjection (no duplicated projection)', view.includes('buildPublicEventProjection') && view.includes("select('starts_at, ends_at, location')"))
check('client view does not import a per-type store or touch the old table', !/client-access\/store|project_clients/.test(view))

// 3. Client View page — token-gated, 404s no-access, no organizer-only imports.
const page = read('../app/[locale]/client/[token]/page.tsx')
check('client page loads by token and 404s when access is denied', page.includes('loadClientView(token)') && page.includes('notFound()'))
{
  const imports = page.split('\n').filter((l) => l.trim().startsWith('import'))
  check('client page imports NO organizer-only modules', !imports.some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace/i.test(l)))
}

// 4. Organizer actions run on the SHARED layer (create/revoke/remove/resend) — no reimplemented token/revocation.
const action = read('../lib/actions/client-access.ts')
check('client actions use the shared store (createAccessRelationship type client / revoke / remove / regenerate)',
  action.includes("createAccessRelationship(ctx.supabase, { projectId, accessType: 'client'") && action.includes('revokeAccess(') && action.includes('removeAccess(') && action.includes('regenerateToken('))
check('client actions do NOT reimplement token generation or touch the old store/table',
  !action.includes('randomBytes') && !/client-access\/store|project_clients/.test(action) && action.includes("reason: 'invalid_contact'"))
check('add / revoke / remove / resend + revalidate', ['addClientAction', 'revokeClientAction', 'removeClientAction', 'resendInvitationAction'].every((a) => action.includes(a)) && action.includes('revalidatePath('))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

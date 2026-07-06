// Worker Project Access — Worker View projection + role reuse + shared-layer access-safety contract test.
//
//   Run:  npx tsx scripts/worker-access-test.mts

import { readFileSync } from 'node:fs'
import { buildWorkerView, resolveWorkerRole } from '../lib/worker-access/view'
import { buildDeliveryComponentModel } from '../lib/delivery/components'
import { projectRolesFromPlan } from '../lib/team/roles'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  resources: [{ label: 'Chairs' }],
  staffing: [{ role: 'DJ', reason: 'Music for the reception' }, { role: 'Host', reason: 'Run the show' }],
} as unknown as EventPlanV2
const occ = [{ startsAt: '2026-08-01T17:00:00.000Z', endsAt: null, location: 'Garden' }]

// 1. Role resolution REUSES the canonical project roles (Delivery components / Team roles) — no new defs.
{
  const role = resolveWorkerRole(plan, 'role:0')
  check('worker role resolves from the canonical Delivery role component', role?.label === 'DJ' && role?.responsibilities === 'Music for the reception')
  const teamIds = projectRolesFromPlan(plan).map((r) => r.id).join(',')
  const deliveryRoleIds = buildDeliveryComponentModel(plan).components.filter((c) => c.kind === 'role').map((c) => c.id).join(',')
  check('worker role ids are the SAME canonical ids as Team + Delivery (no duplication)', teamIds === deliveryRoleIds && teamIds === 'role:0,role:1')
  check('unknown / no role → null', resolveWorkerRole(plan, 'role:9') === null && resolveWorkerRole(plan, null) === null && resolveWorkerRole(null, 'role:0') === null)
}

// 2. Worker View projection (role + schedule + confirmation).
{
  const v = buildWorkerView('p', resolveWorkerRole(plan, 'role:0'), occ, false)
  check('worker view: role + schedule, not confirmed', v.role?.label === 'DJ' && v.occurrences.length === 1 && v.confirmed === false)
  check('worker view exposes only role/occurrences/confirmed', Object.keys(v).sort().join(',') === 'confirmed,occurrences,projectId,role')
  check('confirmed reflected', buildWorkerView('p', null, occ, true).confirmed === true)
}

// 3. Loader goes through the SHARED access layer (resolve active by token + worker view-scope + metadata).
const view = read('../lib/worker-access/view.ts')
check('loadWorkerView resolves via the shared choke point + worker view-scope',
  view.includes('resolveActiveByToken(admin, token, new Date().toISOString())') && view.includes("accessGrantsView(access.access_type, 'worker')"))
check('role + confirmation come from the relationship metadata; role reuses the canonical projection',
  view.includes('access.metadata') && view.includes('meta.roleId') && view.includes('meta.confirmedAt') && view.includes('buildDeliveryComponentModel(plan)'))
check('worker view does not import a per-type store or touch the old table', !/worker-access\/store|project_workers/.test(view))

// 4. Worker page — token-gated, no organizer-only imports.
const page = read('../app/[locale]/worker/[token]/page.tsx')
check('worker page loads by token + 404s when denied', page.includes('loadWorkerView(token)') && page.includes('notFound()'))
{
  const imports = page.split('\n').filter((l) => l.trim().startsWith('import'))
  check('worker page imports NO organizer-only modules', !imports.some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace/i.test(l)))
}

// 5. Actions on the SHARED layer; worker confirm via the shared resolver + metadata; role in metadata.
const action = read('../lib/actions/worker-access.ts')
check('worker actions use the shared store (create type worker w/ role metadata / revoke / remove / regenerate)',
  action.includes("createAccessRelationship(ctx.supabase, { projectId, accessType: 'worker'") && action.includes('roleId: roleId') && action.includes('revokeAccess(') && action.includes('regenerateToken('))
check('worker confirm goes through the single choke point + writes confirmedAt to metadata',
  action.includes('confirmWorkAction') && action.includes('resolveActiveByToken(admin, token, new Date().toISOString())') && action.includes("accessGrantsView(access.access_type, 'worker')") && action.includes('confirmedAt: new Date().toISOString()') && action.includes('setAccessMetadata('))
check('worker actions do NOT reimplement token generation or touch the old store/table',
  !action.includes('randomBytes') && !/worker-access\/store|project_workers/.test(action))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

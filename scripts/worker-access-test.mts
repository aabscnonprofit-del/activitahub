// Worker Project Access — Worker View projection + role reuse + access-safety contract test.
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

// 1. Role resolution REUSES the canonical project roles (Delivery role components / Team roles) — no new defs.
{
  const role = resolveWorkerRole(plan, 'role:0')
  check('worker role resolves from the canonical Delivery role component (label + responsibilities)',
    role?.label === 'DJ' && role?.responsibilities === 'Music for the reception')
  // same ids Team + Delivery use:
  const teamIds = projectRolesFromPlan(plan).map((r) => r.id).join(',')
  const deliveryRoleIds = buildDeliveryComponentModel(plan).components.filter((c) => c.kind === 'role').map((c) => c.id).join(',')
  check('worker role ids are the SAME canonical ids as Team + Delivery (no duplication)', teamIds === deliveryRoleIds && teamIds === 'role:0,role:1')
  check('unknown / no role → null (not fabricated)', resolveWorkerRole(plan, 'role:9') === null && resolveWorkerRole(plan, null) === null && resolveWorkerRole(null, 'role:0') === null)
}

// 2. Worker View: active/invited → role + schedule + confirmation; revoked → null.
{
  const v = buildWorkerView('p', 'invited', resolveWorkerRole(plan, 'role:0'), occ, false)
  check('invited worker → view built (role + schedule), not confirmed', v !== null && v.role?.label === 'DJ' && v.occurrences.length === 1 && v.confirmed === false)
  check('worker view exposes only role/occurrences/confirmed (no organizer fields)',
    v !== null && Object.keys(v).sort().join(',') === 'confirmed,occurrences,projectId,role')
  check('revoked worker → null (no access)', buildWorkerView('p', 'revoked', resolveWorkerRole(plan, 'role:0'), occ, true) === null)
  check('confirmed reflected', buildWorkerView('p', 'active', null, occ, true)?.confirmed === true)
}

// 3. Loader resolves by token, denies revoked, reuses the canonical role resolution + schedule only.
const view = read('../lib/worker-access/view.ts')
check('loadWorkerView resolves by token, denies revoked, resolves role from canonical projection',
  view.includes('getProjectWorkerByToken(admin, token)') && view.includes("worker.status === 'revoked'") &&
  view.includes('buildDeliveryComponentModel(plan)') && view.includes("select('starts_at, ends_at, location')"))

// 4. Worker page exposes ONLY the worker projection — no organizer modules imported.
const page = read('../app/[locale]/worker/[token]/page.tsx')
check('worker page loads by token + 404s a revoked/unknown token', page.includes('loadWorkerView(token)') && page.includes('notFound()'))
{
  const imports = page.split('\n').filter((l) => l.trim().startsWith('import'))
  check('worker page imports NO organizer-only modules (budget/delivery panel/team/capacity/lead/execution)',
    !imports.some((l) => /delivery|team|budget|capacity|lead-organizer|execution|organizer-workspace/i.test(l)))
}

// 5. Organizer actions: owner-gated, project-scoped token, add/revoke/remove/resend, revalidate; worker confirm.
const action = read('../lib/actions/worker-access.ts')
check('actions owner-gated + secure project-scoped token', action.includes('getProject(supabase, projectId)') && action.includes("randomBytes(24).toString('hex')"))
check('actions cover add / revoke / remove / resend + revalidate', ['addWorkerAction', 'revokeWorkerAction', 'removeWorkerAction', 'resendWorkerInvitationAction'].every((a) => action.includes(a)) && action.includes('revalidatePath('))
check('worker confirm is token-scoped (no login), denied when revoked',
  action.includes('confirmWorkAction') && action.includes('getProjectWorkerByToken(admin, token)') && action.includes("worker.status === 'revoked'") && action.includes('setWorkerConfirmed('))

// 6. Project-scoped invite + relationship-only migration; role is a REFERENCE (Team/Delivery stay canonical).
const store = read('../lib/worker-access/store.ts')
const mig = read('../supabase/migrations/057_project_workers.sql')
check('token resolves to one project via one relationship row (project-scoped)',
  store.includes("eq('invite_token', token)") && /invite_token +TEXT NOT NULL UNIQUE/.test(mig) && /project_id +UUID NOT NULL REFERENCES projects/.test(mig))
check('role is a REFERENCE (role_id TEXT), not a duplicated role/assignment table',
  /role_id +TEXT/.test(mig) && !/plan|budget|delivery|execution|assignment/i.test(mig.replace(/--.*$/gm, '')))

// 7. Organizer page renders the panel with canonical roles; never the Worker View.
const projPage = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('organizer page loads workers + canonical roles (projectRolesFromPlan) + renders WorkerAccessPanel',
  projPage.includes('listProjectWorkers(supabase, projectId)') && projPage.includes('projectRolesFromPlan(workerPlan)') && projPage.includes('<WorkerAccessPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

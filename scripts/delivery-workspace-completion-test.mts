// Delivery Workspace completion — workspace model, persistence, full Planning → Occurrence → Execution →
// Delivery flow, and action/loader/UI/page wiring. Contract test.
//
//   Run:  npx tsx scripts/delivery-workspace-completion-test.mts

import { readFileSync } from 'node:fs'
import { buildDeliveryComponentModel } from '../lib/delivery/components'
import { emptyDeliveryState, withDeliveryStatus, withDeliveryAssignee } from '../lib/delivery/status'
import { getDeliveryStatus } from '../lib/delivery/persistence'
import { buildDeliveryWorkspace } from '../lib/organizer-workspace/delivery-workspace'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import { bindOccurrence } from '../lib/occurrence/binding'
import { buildOccurrenceTimeline } from '../lib/occurrence/timeline'
import { buildExecutionWorkspace } from '../lib/organizer-workspace/execution-workspace'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  experienceDesign: {}, structure: {},
  itinerary: [{ id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30 } }],
  logistics: [],
  resources: [{ label: 'Chairs', forMoment: 'ceremony' }, { label: 'Sound system' }],
  staffing: [{ role: 'DJ', reason: 'music' }],
} as unknown as EventPlanV2

const componentModel = buildDeliveryComponentModel(plan)

// 1. Workspace model — components overlaid with state, readiness + progress.
{
  const ws = buildDeliveryWorkspace(componentModel, emptyDeliveryState())
  check('workspace lists all delivery components (2 resources + 1 role)', ws.components.length === 3)
  check('default: all pending, unassigned, progress 0/3 not complete',
    ws.components.every((c) => c.status === 'pending' && c.assignee === null) && ws.readiness.pending === 3 && ws.progress.delivered === 0 && ws.progress.isComplete === false)
}
// 2. State overlay — status + assignee reflected; readiness tallies.
{
  let s = withDeliveryStatus(emptyDeliveryState(), 'resource:0', 'confirmed')
  s = withDeliveryAssignee(s, 'resource:0', 'Acme Rentals')
  const ws = buildDeliveryWorkspace(componentModel, s)
  const chairs = ws.components.find((c) => c.id === 'resource:0')!
  check('component reflects persisted status + assignee', chairs.status === 'confirmed' && chairs.assignee === 'Acme Rentals')
  check('readiness tallies mixed statuses (1 confirmed, 2 pending)', ws.readiness.confirmed === 1 && ws.readiness.pending === 2)
}
// 3. Completion — every component delivered → progress complete.
{
  let s = emptyDeliveryState()
  for (const id of ['resource:0', 'resource:1', 'role:0']) s = withDeliveryStatus(s, id, 'delivered')
  const ws = buildDeliveryWorkspace(componentModel, s)
  check('all delivered → progress.isComplete', ws.progress.delivered === 3 && ws.progress.total === 3 && ws.progress.isComplete === true)
}
// 4. Restore-after-reload — persisted state is read back into the same shape.
{
  let s = withDeliveryStatus(emptyDeliveryState(), 'role:0', 'assigned')
  s = withDeliveryAssignee(s, 'role:0', 'DJ Mix')
  const ws = buildDeliveryWorkspace(componentModel, s)
  check('reload restores status + assignee for role:0', ws.components.find((c) => c.id === 'role:0')!.status === 'assigned' && ws.components.find((c) => c.id === 'role:0')!.assignee === 'DJ Mix')
}

// 5. Persistence read — reads the byComponentId map; null on missing row AND on error (pre-migration safety).
{
  const okClient = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { state: { 'resource:0': { status: 'delivered', assignee: 'X' } } }, error: null }) }) }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const got = await getDeliveryStatus(okClient as any, 'p', 'occ-1')
  check('getDeliveryStatus reads persisted byComponentId', got?.byComponentId['resource:0'].status === 'delivered')
  const errClient = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('relation does not exist') } }) }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('getDeliveryStatus degrades to null on error (table not migrated yet)', (await getDeliveryStatus(errClient as any, 'p', 'occ-1')) === null)
}

// 6. Full flow: one plan drives Planning → Occurrence → Execution AND Delivery coherently.
{
  const snapshot = buildExecutionSnapshot(plan)
  const execWs = buildExecutionWorkspace(snapshot, buildOccurrenceTimeline(bindOccurrence(snapshot, 'occ-1', '2026-07-05T09:00:00.000Z')))
  const delivWs = buildDeliveryWorkspace(componentModel, emptyDeliveryState())
  check('same plan yields Execution monitoring (ceremony) AND Delivery components (chairs/sound/DJ)',
    execWs.checklist.some((i) => i.id === 'itinerary:ceremony') && delivWs.components.some((c) => c.label === 'Chairs') && delivWs.components.some((c) => c.label === 'DJ'))
  check('execution + delivery are independent read models (execution has no delivery components and vice versa)',
    !execWs.checklist.some((i) => i.id.startsWith('resource:')) && !delivWs.components.some((c) => c.id.startsWith('itinerary:')))
}

// 7. Action / loader / UI / page wiring.
const action = read('../lib/actions/delivery.ts')
const loader = read('../lib/organizer-workspace/load-delivery-workspace.ts')
const comp = read('../components/workspace/DeliveryChecklist.tsx')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('action gates auth + approval, validates status + transition, persists, revalidates',
  action.includes("error: 'not_authenticated'") && action.includes("error: 'not_approved'") &&
  action.includes('isDeliveryStatus(to)') && action.includes('canDeliveryTransition(current, to)') &&
  action.includes('persistDeliveryStatus(') && action.includes('revalidatePath(`/${locale}/dashboard/projects/${projectId}`)'))
check('action supports assignment (assignDeliveryComponentAction persists the assignee)',
  action.includes('assignDeliveryComponentAction') && action.includes('withDeliveryAssignee(ctx.state, componentId, assignee)'))
check('loader resolves plan + current occurrence + persisted delivery state via the explicit resolver',
  loader.includes('getEventPlanV2(supabase, projectId, 1)') && loader.includes('resolveCurrentOccurrence(supabase, projectId, { createAtIfMissing: project.approved_at })') && loader.includes('getDeliveryStatus('))
check('UI island calls the delivery actions and refreshes on success',
  comp.includes("'use client'") && comp.includes('updateDeliveryStatusAction(projectId, item.id, to, locale)') && comp.includes('assignDeliveryComponentAction(projectId, item.id') && comp.includes('router.refresh()'))
check('page loads + renders the Delivery Workspace with progress/completion (page stays read-only itself)',
  page.includes('loadDeliveryWorkspace(supabase, projectId)') && page.includes('<DeliveryChecklist items={deliveryWorkspace.components}') &&
  page.includes('deliveryWorkspace.progress.delivered') && page.includes('Delivery complete') && !page.includes('<button'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

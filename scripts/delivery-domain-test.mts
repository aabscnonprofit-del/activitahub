// Delivery domain — components projection + state model + persistence mapping (pure) contract test.
//
//   Run:  npx tsx scripts/delivery-domain-test.mts

import { buildDeliveryComponentModel } from '../lib/delivery/components'
import {
  canDeliveryTransition, isDeliveryStatus, emptyDeliveryState, stateOf,
  withDeliveryStatus, withDeliveryAssignee, DELIVERY_STATUSES,
} from '../lib/delivery/status'
import { toDeliveryStatusRow } from '../lib/delivery/persistence'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  resources: [{ label: 'Chairs', forMoment: 'ceremony' }, { label: 'Sound system' }],
  staffing: [{ role: 'DJ', reason: 'music for the reception' }],
} as unknown as EventPlanV2

// 1. Projection — resources then roles, stable ids, labels + detail carried through.
{
  const m = buildDeliveryComponentModel(plan)
  check('components projected: 2 resources + 1 role in order', m.components.map((c) => c.id).join(',') === 'resource:0,resource:1,role:0')
  check('resource carries label + moment detail', m.components[0].kind === 'resource' && m.components[0].label === 'Chairs' && m.components[0].detail === 'ceremony')
  check('role carries role + reason detail', m.components[2].kind === 'role' && m.components[2].label === 'DJ' && m.components[2].detail === 'music for the reception')
}
// 2. Empty plan → no components.
check('empty plan → no components', buildDeliveryComponentModel({ resources: [], staffing: [] } as unknown as EventPlanV2).components.length === 0)

// 3. Status set + guard.
check('valid statuses', DELIVERY_STATUSES.join(',') === 'pending,assigned,confirmed,delivered')
check('isDeliveryStatus guards', isDeliveryStatus('delivered') && !isDeliveryStatus('done') && !isDeliveryStatus(3))

// 4. Transition rules — forward + one step back; no skipping / no illegal.
check('pending → assigned allowed; pending → delivered rejected', canDeliveryTransition('pending', 'assigned') && !canDeliveryTransition('pending', 'delivered'))
check('assigned → confirmed / back to pending allowed', canDeliveryTransition('assigned', 'confirmed') && canDeliveryTransition('assigned', 'pending'))
check('confirmed → delivered / back to assigned; delivered → confirmed only', canDeliveryTransition('confirmed', 'delivered') && canDeliveryTransition('delivered', 'confirmed') && !canDeliveryTransition('delivered', 'pending'))

// 5. State model — default, set status, set assignee, immutability.
{
  const s0 = emptyDeliveryState()
  check('default state = pending, unassigned', stateOf(s0, 'resource:0').status === 'pending' && stateOf(s0, 'resource:0').assignee === null)
  const s1 = withDeliveryStatus(s0, 'resource:0', 'assigned')
  const s2 = withDeliveryAssignee(s1, 'resource:0', '  Acme Rentals  ')
  check('status set + assignee set (trimmed), status preserved', stateOf(s2, 'resource:0').status === 'assigned' && stateOf(s2, 'resource:0').assignee === 'Acme Rentals')
  check('empty assignee clears assignment', stateOf(withDeliveryAssignee(s2, 'resource:0', '   '), 'resource:0').assignee === null)
  check('pure — inputs not mutated', stateOf(s0, 'resource:0').status === 'pending' && Object.keys(s0.byComponentId).length === 0)
}

// 6. Persistence mapping — model → row (byComponentId verbatim).
{
  const state = withDeliveryStatus(emptyDeliveryState(), 'role:0', 'delivered')
  const row = toDeliveryStatusRow('p', 'occ-1', state)
  check('toDeliveryStatusRow maps keys + byComponentId verbatim', row.project_id === 'p' && row.occurrence_id === 'occ-1' && row.state['role:0'].status === 'delivered')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

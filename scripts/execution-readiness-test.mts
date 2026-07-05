// Execution readiness — itemActivationReadiness contract test.
//
// Proves the read-model readiness helper agrees with the write path: a pending item is startable only when the
// runtime would accept pending → active; otherwise it reports canStart=false with the same reason (and the
// blocking prerequisite ids). Non-pending items are not activatable. Pure — no clock, no mutation.
//
//   Run:  npx tsx scripts/execution-readiness-test.mts

import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import { initialExecutionStatus, withStatus } from '../lib/execution/status'
import { itemActivationReadiness } from '../lib/execution/readiness'
import { evaluateTransition } from '../lib/actions/execution-transition'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  itinerary: [
    { id: 'itinerary:a', name: 'A', trigger: { kind: 'manual' } },
    { id: 'itinerary:m', name: 'M (manual, needs A)', trigger: { kind: 'manual' }, prerequisiteIds: ['itinerary:a'] },
    { id: 'itinerary:b', name: 'B (after_item, needs A)', trigger: { kind: 'after_item' }, prerequisiteIds: ['itinerary:a'] },
    { id: 'itinerary:t', name: 'T (relative_time)', trigger: { kind: 'relative_time' } },
  ],
  logistics: [],
} as unknown as EventPlanV2
const monitoring = buildExecutionMonitoringModel(plan)
const base = initialExecutionStatus(monitoring)

// 1. Pending, manual, no prerequisites → startable.
{
  const r = itemActivationReadiness(monitoring, base, 'itinerary:a')
  check('pending manual, no prereqs → canStart, no block', r.canStart && r.blockedReason === null && r.status === 'pending')
}
// 2. Pending, manual, incomplete prerequisite → blocked (prerequisites_incomplete + blockedByIds).
{
  const r = itemActivationReadiness(monitoring, base, 'itinerary:m')
  check('pending manual with incomplete prereq → blocked (prerequisites_incomplete, lists A)',
    !r.canStart && r.blockedReason === 'prerequisites_incomplete' && r.blockedByIds.includes('itinerary:a'))
  const ready = withStatus(base, 'itinerary:a', 'completed')
  check('prerequisite completed → startable', itemActivationReadiness(monitoring, ready, 'itinerary:m').canStart)
}
// 3. Pending, after_item, referenced item incomplete → after_item_incomplete.
{
  const r = itemActivationReadiness(monitoring, base, 'itinerary:b')
  check('pending after_item, referenced item incomplete → blocked (after_item_incomplete)',
    !r.canStart && r.blockedReason === 'after_item_incomplete' && r.blockedByIds.includes('itinerary:a'))
}
// 4. Pending, relative_time → trigger_not_bound.
{
  const r = itemActivationReadiness(monitoring, base, 'itinerary:t')
  check('pending relative_time → blocked (trigger_not_bound)', !r.canStart && r.blockedReason === 'trigger_not_bound')
}
// 5. Non-pending items are not activatable (no block reported).
{
  const active = withStatus(base, 'itinerary:a', 'active')
  const r = itemActivationReadiness(monitoring, active, 'itinerary:a')
  check('active item → not activatable, no block (activation not applicable)', !r.canStart && r.blockedReason === null && r.status === 'active')
}
// 6. Readiness agrees with the write path (evaluateTransition) for every pending item.
{
  const agree = ['itinerary:a', 'itinerary:m', 'itinerary:b', 'itinerary:t'].every((id) => {
    const canStart = itemActivationReadiness(monitoring, base, id).canStart
    const accepted = evaluateTransition(monitoring, base, id, 'active').ok
    return canStart === accepted
  })
  check('readiness canStart matches evaluateTransition acceptance for all pending items', agree)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

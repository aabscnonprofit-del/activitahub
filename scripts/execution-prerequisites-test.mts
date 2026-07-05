// Execution Runtime Slice 2 (prerequisite enforcement) — contract test.
//
// Verifies applyTransitionWithPrerequisites: a pending item activates only when all prerequisiteIds are
// completed; otherwise it is rejected with prerequisites_incomplete; items without prerequisites activate
// normally; legacy items work; the base transition rules still apply; and nothing is mutated.
//
//   Run:  npx tsx scripts/execution-prerequisites-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import { initialExecutionStatus, withStatus, statusOf } from '../lib/execution/status'
import { applyTransitionWithPrerequisites, incompletePrerequisites } from '../lib/execution/prerequisites'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Enriched plan: the ceremony moment additionally declares 'itinerary:arrival' as a prerequisite, and a prep
// logistic 'logistic:ceremony' serves it (→ derived prerequisite). So ceremony has TWO prerequisites.
const enriched = {
  itinerary: [
    { id: 'itinerary:ceremony', name: 'Ceremony', prerequisiteIds: ['itinerary:arrival'] },
    { id: 'itinerary:arrival', name: 'Arrival' },
  ],
  logistics: [{ id: 'logistic:ceremony', description: 'Set up', forMomentId: 'itinerary:ceremony' }],
} as unknown as EventPlanV2
const monitoring = buildExecutionMonitoringModel(enriched)
const base = initialExecutionStatus(monitoring) // all pending

check('ceremony has both prerequisites (declared + derived-from-forMomentId)',
  incompletePrerequisites(monitoring, base, 'itinerary:ceremony').sort().join(',') === 'itinerary:arrival,logistic:ceremony')

// 1. Rejected activation when prerequisites incomplete.
const r0 = applyTransitionWithPrerequisites(monitoring, base, 'itinerary:ceremony', 'active')
check('rejected when prerequisites incomplete (prerequisites_incomplete + list)',
  !r0.ok && r0.reason === 'prerequisites_incomplete' &&
  r0.incompletePrerequisiteIds.sort().join(',') === 'itinerary:arrival,logistic:ceremony')

// 2. Still rejected when only SOME prerequisites are complete.
const partial = withStatus(base, 'logistic:ceremony', 'completed')
const r1 = applyTransitionWithPrerequisites(monitoring, partial, 'itinerary:ceremony', 'active')
check('rejected when only some prerequisites complete (lists just the incomplete one)',
  !r1.ok && r1.reason === 'prerequisites_incomplete' && r1.incompletePrerequisiteIds.join(',') === 'itinerary:arrival')

// 3. Allowed activation when ALL prerequisites completed.
const ready = withStatus(withStatus(base, 'logistic:ceremony', 'completed'), 'itinerary:arrival', 'completed')
const r2 = applyTransitionWithPrerequisites(monitoring, ready, 'itinerary:ceremony', 'active')
check('allowed when all prerequisites completed', r2.ok && statusOf(r2.status, 'itinerary:ceremony') === 'active')

// 4. Items without prerequisites activate normally.
check('an item with no prerequisites activates normally',
  (() => { const r = applyTransitionWithPrerequisites(monitoring, base, 'logistic:ceremony', 'active'); return r.ok && statusOf(r.status, 'logistic:ceremony') === 'active' })())

// 5. Prerequisite gate applies ONLY to activation; other transitions defer to base rules.
check('base invalid_transition still wins (completed → active)',
  (() => { const s = withStatus(base, 'itinerary:ceremony', 'completed'); const r = applyTransitionWithPrerequisites(monitoring, s, 'itinerary:ceremony', 'active'); return !r.ok && r.reason === 'invalid_transition' })())
check('non-activation transition is not gated by prerequisites (pending → blocked)',
  (() => { const r = applyTransitionWithPrerequisites(monitoring, base, 'itinerary:ceremony', 'blocked'); return r.ok && statusOf(r.status, 'itinerary:ceremony') === 'blocked' })())

// 6. Immutability — input untouched on success and on rejection.
const before = JSON.stringify(base)
applyTransitionWithPrerequisites(monitoring, base, 'itinerary:ceremony', 'active') // rejected
applyTransitionWithPrerequisites(monitoring, base, 'logistic:ceremony', 'active')  // success
check('input status model is never mutated', JSON.stringify(base) === before)

// 7. Legacy plans (no prerequisites derived) activate normally.
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lsnap = buildExecutionSnapshot(legacy)
check('legacy items have no prerequisites and activate normally',
  incompletePrerequisites(lsnap.monitoring, lsnap.status, 'itinerary:#0').length === 0 &&
  (() => { const r = applyTransitionWithPrerequisites(lsnap.monitoring, lsnap.status, 'itinerary:#0', 'active'); return r.ok && statusOf(r.status, 'itinerary:#0') === 'active' })())

// 8. Depends on nothing in Planning/Occurrence (CODE only).
const src = readFileSync(new URL('../lib/execution/prerequisites.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('prerequisites.ts code imports/uses nothing from Planning or Occurrence',
  !/from '@\/lib\/planning/.test(codeOnly) && !/occurrence/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

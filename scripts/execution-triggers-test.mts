// Execution Runtime Slice 3 (trigger activation rules) — contract test.
//
// Verifies applyTriggerActivation: manual activates normally; after_item activates only when referenced items
// are completed; relative_time / external_event are recognized but rejected as not bound; non-activation
// transitions are ungated; base invalid_transition still wins; models are immutable; legacy/manual default
// works; and nothing in Planning/Occurrence is touched.
//
//   Run:  npx tsx scripts/execution-triggers-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import { initialExecutionStatus, withStatus, statusOf } from '../lib/execution/status'
import { applyTriggerActivation, triggerKindOf } from '../lib/execution/triggers'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Plan with one item per trigger kind. The after_item item references 'itinerary:arrival' via prerequisiteIds.
const plan = {
  itinerary: [
    { id: 'itinerary:arrival', name: 'Arrival', trigger: { kind: 'manual' } },
    { id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'after_item' }, prerequisiteIds: ['itinerary:arrival'] },
    { id: 'itinerary:toast', name: 'Toast', trigger: { kind: 'relative_time' } },
    { id: 'itinerary:fireworks', name: 'Fireworks', trigger: { kind: 'external_event' } },
  ],
  logistics: [],
} as unknown as EventPlanV2
const monitoring = buildExecutionMonitoringModel(plan)
const base = initialExecutionStatus(monitoring) // all pending

// 0. Trigger kinds resolved from monitoring.
check('trigger kinds resolved from the monitoring items',
  triggerKindOf(monitoring, 'itinerary:arrival') === 'manual' &&
  triggerKindOf(monitoring, 'itinerary:ceremony') === 'after_item' &&
  triggerKindOf(monitoring, 'itinerary:toast') === 'relative_time' &&
  triggerKindOf(monitoring, 'itinerary:fireworks') === 'external_event')

// 1. manual activates normally.
const rm = applyTriggerActivation(monitoring, base, 'itinerary:arrival', 'active')
check('manual trigger activates normally', rm.ok && statusOf(rm.status, 'itinerary:arrival') === 'active')

// 2. after_item rejected while referenced item incomplete.
const ra0 = applyTriggerActivation(monitoring, base, 'itinerary:ceremony', 'active')
check('after_item rejected while referenced item incomplete (after_item_incomplete + list)',
  !ra0.ok && ra0.reason === 'after_item_incomplete' && ra0.incompletePrerequisiteIds.join(',') === 'itinerary:arrival')

// 3. after_item allowed once referenced item completed.
const ready = withStatus(base, 'itinerary:arrival', 'completed')
const ra1 = applyTriggerActivation(monitoring, ready, 'itinerary:ceremony', 'active')
check('after_item activates once referenced item completed', ra1.ok && statusOf(ra1.status, 'itinerary:ceremony') === 'active')

// 4. relative_time and external_event: recognized, rejected as not bound.
const rt = applyTriggerActivation(monitoring, base, 'itinerary:toast', 'active')
check('relative_time rejected as trigger_not_bound', !rt.ok && rt.reason === 'trigger_not_bound' && rt.triggerKind === 'relative_time')
const re = applyTriggerActivation(monitoring, base, 'itinerary:fireworks', 'active')
check('external_event rejected as trigger_not_bound', !re.ok && re.reason === 'trigger_not_bound' && re.triggerKind === 'external_event')

// 5. Non-activation transitions are NOT trigger-gated (even for relative_time/external_event).
check('non-activation transition is ungated by trigger (relative_time item: pending → blocked)',
  (() => { const r = applyTriggerActivation(monitoring, base, 'itinerary:toast', 'blocked'); return r.ok && statusOf(r.status, 'itinerary:toast') === 'blocked' })())

// 6. Base invalid_transition still wins.
check('base invalid_transition still wins (completed → active on a manual item)',
  (() => { const s = withStatus(base, 'itinerary:arrival', 'completed'); const r = applyTriggerActivation(monitoring, s, 'itinerary:arrival', 'active'); return !r.ok && r.reason === 'invalid_transition' })())

// 7. Immutability.
const before = JSON.stringify(base)
applyTriggerActivation(monitoring, base, 'itinerary:arrival', 'active') // success
applyTriggerActivation(monitoring, base, 'itinerary:toast', 'active')   // rejected
check('input status model is never mutated', JSON.stringify(base) === before)

// 8. Legacy / manual default: legacy items resolve to manual and activate normally.
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lsnap = buildExecutionSnapshot(legacy)
check('legacy items default to the manual trigger and activate normally',
  triggerKindOf(lsnap.monitoring, 'itinerary:#0') === 'manual' &&
  (() => { const r = applyTriggerActivation(lsnap.monitoring, lsnap.status, 'itinerary:#0', 'active'); return r.ok && statusOf(r.status, 'itinerary:#0') === 'active' })())

// 9. Depends on nothing in Planning/Occurrence (CODE only).
const src = readFileSync(new URL('../lib/execution/triggers.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('triggers.ts code imports/uses nothing from Planning or Occurrence',
  !/from '@\/lib\/planning/.test(codeOnly) && !/occurrence/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Occurrence Binding Slice 1 (relative time binding) — contract test.
//
// Verifies bindOccurrence turns Planning's RELATIVE timing into the Occurrence's ABSOLUTE timeline: relative
// offsets bind correctly (start + deadline/duration), items without temporal stay unbound, after_item /
// external_event are not scheduled, legacy plans work, it is deterministic and clock-free, and it changes
// nothing in Planning / Execution / projections.
//
//   Run:  npx tsx scripts/occurrence-binding-slice-1-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import { bindOccurrence } from '../lib/occurrence/binding'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const START = '2026-07-04T09:00:00.000Z'
const OCC = 'occ-1'

const plan = {
  itinerary: [
    { id: 'itinerary:a', name: 'A (manual, offset+deadline)', trigger: { kind: 'manual' },
      temporal: { offsetFromStartMinutes: 30, deadlineOffsetMinutes: 90 } },
    { id: 'itinerary:b', name: 'B (relative_time, offset+duration)', trigger: { kind: 'relative_time' },
      temporal: { offsetFromStartMinutes: 30, expectedDurationMinutes: 45 } },
    { id: 'itinerary:c', name: 'C (manual, no temporal)', trigger: { kind: 'manual' } },
    { id: 'itinerary:d', name: 'D (after_item)', trigger: { kind: 'after_item' },
      temporal: { offsetFromStartMinutes: 10 } },
    { id: 'itinerary:e', name: 'E (external_event)', trigger: { kind: 'external_event' },
      temporal: { offsetFromStartMinutes: 10 } },
  ],
  logistics: [],
} as unknown as EventPlanV2

const snapshot = buildExecutionSnapshot(plan)
const binding = bindOccurrence(snapshot, OCC, START)
const boundById = Object.fromEntries(binding.bound.map((b) => [b.monitoringItemId, b]))
const unboundById = Object.fromEntries(binding.unbound.map((u) => [u.monitoringItemId, u]))

// 1. Relative offsets bind to absolute correctly.
check('binding carries occurrence id + start', binding.occurrenceId === OCC && binding.occurrenceStartIso === START)
check('A: absoluteStart = start + offset (09:30); absoluteDeadline = start + deadlineOffset (10:30)',
  boundById['itinerary:a']?.absoluteStart === '2026-07-04T09:30:00.000Z' &&
  boundById['itinerary:a']?.absoluteDeadline === '2026-07-04T10:30:00.000Z')
check('B: absoluteStart 09:30; deadline = start + duration (10:15)',
  boundById['itinerary:b']?.absoluteStart === '2026-07-04T09:30:00.000Z' &&
  boundById['itinerary:b']?.absoluteDeadline === '2026-07-04T10:15:00.000Z')
check('bound item carries monitoring id + occurrence id + relative timing',
  boundById['itinerary:a']?.monitoringItemId === 'itinerary:a' &&
  boundById['itinerary:a']?.occurrenceId === OCC &&
  boundById['itinerary:a']?.relative.offsetFromStartMinutes === 30)

// 2. Items without temporal stay unbound.
check('C (manual, no temporal) is unbound with reason no_temporal', unboundById['itinerary:c']?.reason === 'no_temporal')

// 3. after_item / external_event are NOT scheduled (even with temporal present).
check('D (after_item) unbound: trigger_not_time_bound', unboundById['itinerary:d']?.reason === 'trigger_not_time_bound')
check('E (external_event) unbound: trigger_not_time_bound', unboundById['itinerary:e']?.reason === 'trigger_not_time_bound')

// 4. Only the two time-bindable items are bound.
check('exactly the two time-bindable items are bound (A, B)',
  binding.bound.map((b) => b.monitoringItemId).sort().join(',') === 'itinerary:a,itinerary:b')

// 5. Determinism + clock-free.
check('binding is deterministic (same inputs → identical result)',
  JSON.stringify(bindOccurrence(snapshot, OCC, START)) === JSON.stringify(binding))
const srcAll = readFileSync(new URL('../lib/occurrence/binding.ts', import.meta.url), 'utf8')
check('binding reads no clock (no Date.now / no Math.random)',
  !srcAll.includes('Date.now') && !srcAll.includes('Math.random'))

// 6. Legacy plans work — everything unbound, no crash.
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lbind = bindOccurrence(buildExecutionSnapshot(legacy), OCC, START)
check('legacy plan binds without crashing; all items unbound (no_temporal)',
  lbind.bound.length === 0 && lbind.unbound.length === 2 && lbind.unbound.every((u) => u.reason === 'no_temporal'))

// 7. Depends only on Planning TYPE + the Execution snapshot type — changes no Planning/Execution code.
const codeOnly = srcAll.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const externalImports = codeOnly.match(/^import[^\n]*@\/lib\/[^\n]*$/gm) ?? []
check('binding.ts imports only TYPES from Planning/Execution (no value/code imports of them)',
  externalImports.length > 0 && externalImports.every((l) => /^import type /.test(l)))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

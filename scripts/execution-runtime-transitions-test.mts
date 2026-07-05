// Execution Runtime Slice 1 (state transitions) — contract test.
//
// Verifies deterministic, immutable status transitions: the four allowed transitions succeed, every other is
// rejected, models are never mutated, ids stay stable, batches are atomic (all-or-nothing), legacy monitoring
// ids work, and the layer depends on nothing in Planning/Occurrence.
//
//   Run:  npx tsx scripts/execution-runtime-transitions-test.mts

import { readFileSync } from 'node:fs'
import { emptyExecutionStatus, withStatus, statusOf, type MonitoringStatus } from '../lib/execution/status'
import { canTransition, applyTransition, applyTransitions, ALLOWED_TRANSITIONS } from '../lib/execution/runtime'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const ALL: MonitoringStatus[] = ['pending', 'active', 'blocked', 'completed']
const VALID = new Set(['pending>active', 'active>completed', 'pending>blocked', 'blocked>pending'])

// 1. Validation helper: exactly the four allowed transitions.
check('canTransition allows exactly the four documented transitions',
  ALL.every((f) => ALL.every((t) => canTransition(f, t) === VALID.has(`${f}>${t}`))))
check('completed is terminal (no outgoing transitions)', ALLOWED_TRANSITIONS.completed.length === 0)

// helper: a status model where `id` is at `s`
const at = (id: string, s: MonitoringStatus) => withStatus(emptyExecutionStatus(), id, s)

// 2. Valid transitions succeed and set the new status.
check('pending → active', (() => { const r = applyTransition(at('x', 'pending'), 'x', 'active'); return r.ok && statusOf(r.status, 'x') === 'active' })())
check('active → completed', (() => { const r = applyTransition(at('x', 'active'), 'x', 'completed'); return r.ok && statusOf(r.status, 'x') === 'completed' })())
check('pending → blocked', (() => { const r = applyTransition(at('x', 'pending'), 'x', 'blocked'); return r.ok && statusOf(r.status, 'x') === 'blocked' })())
check('blocked → pending', (() => { const r = applyTransition(at('x', 'blocked'), 'x', 'pending'); return r.ok && statusOf(r.status, 'x') === 'pending' })())

// 3. Invalid transitions are rejected (typed, no change).
const invalidCases: [MonitoringStatus, MonitoringStatus][] = [
  ['pending', 'completed'], ['active', 'blocked'], ['active', 'pending'], ['blocked', 'active'],
  ['blocked', 'completed'], ['completed', 'pending'], ['completed', 'active'], ['pending', 'pending'],
]
check('all documented invalid transitions are rejected with invalid_transition',
  invalidCases.every(([f, t]) => { const r = applyTransition(at('x', f), 'x', t); return !r.ok && r.reason === 'invalid_transition' && r.from === f && r.to === t }))

// 4. Immutability — the input model is never mutated.
const base = at('x', 'pending')
const snapshotBefore = JSON.stringify(base)
const r1 = applyTransition(base, 'x', 'active')
check('applyTransition never mutates the input', JSON.stringify(base) === snapshotBefore && (r1.ok && r1.status !== base))
check('rejected transition returns the rejection and leaves input untouched',
  (() => { const r = applyTransition(base, 'x', 'completed'); return !r.ok && JSON.stringify(base) === snapshotBefore })())

// 5. Ids remain stable (only the targeted id changes).
const multi = withStatus(at('a', 'pending'), 'b', 'pending')
const rr = applyTransition(multi, 'a', 'active')
check('only the targeted id changes; other ids stable',
  rr.ok && statusOf(rr.status, 'a') === 'active' && statusOf(rr.status, 'b') === 'pending' &&
  Object.keys(rr.status.byItemId).sort().join(',') === 'a,b')

// 6. Batch is atomic + supports chaining one item; invalid → whole batch rejected.
const chain = applyTransitions(at('x', 'pending'), [{ itemId: 'x', to: 'active' }, { itemId: 'x', to: 'completed' }])
check('batch chains one item (pending→active→completed)', chain.ok && statusOf(chain.status, 'x') === 'completed')
const batchOk = applyTransitions(multi, [{ itemId: 'a', to: 'active' }, { itemId: 'b', to: 'blocked' }])
check('batch applies multiple distinct items', batchOk.ok && statusOf(batchOk.status, 'a') === 'active' && statusOf(batchOk.status, 'b') === 'blocked')
const batchBad = applyTransitions(multi, [{ itemId: 'a', to: 'active' }, { itemId: 'b', to: 'completed' }])
check('batch is all-or-nothing: one invalid → whole batch rejected, input untouched',
  !batchBad.ok && batchBad.reason === 'invalid_transition' && statusOf(multi, 'a') === 'pending' && statusOf(multi, 'b') === 'pending')

// 7. Legacy monitoring ids continue working (fallback ids from a legacy plan).
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const snap = buildExecutionSnapshot(legacy)
const legacyR = applyTransition(snap.status, 'itinerary:#0', 'active')
check('legacy fallback monitoring id transitions correctly',
  legacyR.ok && statusOf(legacyR.status, 'itinerary:#0') === 'active' && statusOf(legacyR.status, 'logistic:#0') === 'pending')

// 8. Runtime depends on nothing in Planning/Occurrence (CODE only).
const src = readFileSync(new URL('../lib/execution/runtime.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('runtime.ts code imports/uses nothing from Planning or Occurrence',
  !/from '@\/lib\/planning/.test(codeOnly) && !/occurrence/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

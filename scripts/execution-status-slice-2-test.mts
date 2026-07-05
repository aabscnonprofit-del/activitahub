// Execution Status Slice 2 — contract test.
//
// Verifies the first execution status layer over Execution Monitoring Slice 1: statuses attach to
// MonitoringItem ids, default to pending, support pending/active/blocked/completed, resolve deterministically,
// work for legacy (fallback-id) plans, and depend on nothing in Planning/Occurrence.
//
//   Run:  npx tsx scripts/execution-status-slice-2-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import {
  DEFAULT_MONITORING_STATUS, MONITORING_STATUSES, emptyExecutionStatus, initialExecutionStatus,
  isMonitoringStatus, statusOf, withStatus, type MonitoringStatus,
} from '../lib/execution/status'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Build a monitoring model to attach statuses to (enriched plan) ──
const enriched = {
  itinerary: [{ id: 'itinerary:ceremony', name: 'Ceremony' }, { id: 'itinerary:meal', name: 'Meal' }],
  logistics: [{ id: 'logistic:ceremony', description: 'Set up', forMomentId: 'itinerary:ceremony' }],
} as unknown as EventPlanV2
const model = buildExecutionMonitoringModel(enriched)

// 1. Default status is pending.
check('DEFAULT_MONITORING_STATUS is pending', DEFAULT_MONITORING_STATUS === 'pending')
check('unrecorded id resolves to pending (empty model)', statusOf(emptyExecutionStatus(), 'itinerary:ceremony') === 'pending')
check('initial status of every monitoring item is pending',
  model.items.every((it) => statusOf(initialExecutionStatus(model), it.id) === 'pending'))

// 2. Status attaches BY monitoring item id.
const s1 = withStatus(initialExecutionStatus(model), 'itinerary:ceremony', 'active')
check('withStatus attaches a status by monitoring item id', statusOf(s1, 'itinerary:ceremony') === 'active')
check('other items are unaffected (still pending)', statusOf(s1, 'itinerary:meal') === 'pending')
check('withStatus is pure — original model unchanged',
  statusOf(initialExecutionStatus(model), 'itinerary:ceremony') === 'pending')

// 3. pending / active / blocked / completed are all valid + attachable.
check('MONITORING_STATUSES = pending, active, blocked, completed',
  MONITORING_STATUSES.length === 4 &&
  (['pending', 'active', 'blocked', 'completed'] as MonitoringStatus[]).every((v) => MONITORING_STATUSES.includes(v)))
check('isMonitoringStatus accepts all four and rejects others',
  MONITORING_STATUSES.every((v) => isMonitoringStatus(v)) && !isMonitoringStatus('done') && !isMonitoringStatus(3))
let s = initialExecutionStatus(model)
for (const st of MONITORING_STATUSES) s = withStatus(s, 'logistic:ceremony', st)
check('blocked/completed/active states set and read back correctly',
  statusOf(withStatus(s, 'logistic:ceremony', 'blocked'), 'logistic:ceremony') === 'blocked' &&
  statusOf(withStatus(s, 'logistic:ceremony', 'completed'), 'logistic:ceremony') === 'completed' &&
  statusOf(withStatus(s, 'logistic:ceremony', 'active'), 'logistic:ceremony') === 'active')

// 4. Determinism.
check('initialExecutionStatus is deterministic',
  JSON.stringify(initialExecutionStatus(model)) === JSON.stringify(initialExecutionStatus(model)))

// 5. Legacy plans (fallback ids) still attach statuses.
const legacy = { itinerary: [{ name: 'Old moment' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lm = buildExecutionMonitoringModel(legacy)
const ls = withStatus(initialExecutionStatus(lm), 'itinerary:#0', 'completed')
check('legacy: status attaches to fallback monitoring ids',
  statusOf(ls, 'itinerary:#0') === 'completed' && statusOf(ls, 'logistic:#0') === 'pending')

// 6. This layer depends on nothing in Planning or Occurrence (Execution-internal only) — CODE only, so the
//    forbidden-word check ignores explanatory comments that mention the boundary.
const src = readFileSync(new URL('../lib/execution/status.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('status.ts code imports/uses nothing from Planning or Occurrence',
  !/from '@\/lib\/planning/.test(codeOnly) && !/occurrence/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

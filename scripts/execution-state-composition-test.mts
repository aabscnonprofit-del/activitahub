// Execution State Composition (Slice 3) — contract test.
//
// Verifies composeExecutionState overlays the Execution Status model onto the Execution Monitoring model:
// one state item per monitoring item carrying id/source/label/trigger/temporal/prerequisiteIds + current
// status; missing statuses default to pending; status overlays correctly; legacy fallback ids compose; and
// the layer depends on nothing in Planning/Occurrence.
//
//   Run:  npx tsx scripts/execution-state-composition-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import { initialExecutionStatus, withStatus, emptyExecutionStatus } from '../lib/execution/status'
import { composeExecutionState } from '../lib/execution/state'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Enriched plan → monitoring model ──
const enriched = {
  itinerary: [
    { id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'relative_time' },
      temporal: { offsetFromStartMinutes: 0 }, prerequisiteIds: ['itinerary:arrival'] },
    { id: 'itinerary:meal', name: 'Meal' },
  ],
  logistics: [{ id: 'logistic:ceremony', description: 'Set up', forMomentId: 'itinerary:ceremony' }],
} as unknown as EventPlanV2
const monitoring = buildExecutionMonitoringModel(enriched)

// 1. Composition works — one state item per monitoring item, carrying all monitoring fields.
const state0 = composeExecutionState(monitoring, emptyExecutionStatus())
check('one state item per monitoring item', state0.items.length === monitoring.items.length)
const cer = state0.items.find((i) => i.id === 'itinerary:ceremony')!
check('state item carries id / source / label',
  cer.id === 'itinerary:ceremony' && cer.source === 'itinerary_moment' && cer.label === 'Ceremony')
check('state item carries trigger / temporal / prerequisiteIds from monitoring',
  cer.trigger.kind === 'relative_time' && cer.temporal?.offsetFromStartMinutes === 0 &&
  cer.prerequisiteIds.includes('itinerary:arrival') && cer.prerequisiteIds.includes('logistic:ceremony'))
check('an item without temporal has temporal undefined',
  state0.items.find((i) => i.id === 'itinerary:meal')!.temporal === undefined)

// 2. Missing statuses default to pending.
check('missing status defaults to pending', state0.items.every((i) => i.status === 'pending'))

// 3. Status overlays monitoring items correctly.
const status = withStatus(withStatus(initialExecutionStatus(monitoring), 'itinerary:ceremony', 'active'), 'logistic:ceremony', 'completed')
const state1 = composeExecutionState(monitoring, status)
const byId = Object.fromEntries(state1.items.map((i) => [i.id, i]))
check('status overlays the matching item', byId['itinerary:ceremony'].status === 'active' && byId['logistic:ceremony'].status === 'completed')
check('unset items still default to pending', byId['itinerary:meal'].status === 'pending')
check('overlay preserves the monitoring fields (id/label/trigger intact under status)',
  byId['itinerary:ceremony'].label === 'Ceremony' && byId['itinerary:ceremony'].trigger.kind === 'relative_time')

// 4. Determinism.
check('composition is deterministic',
  JSON.stringify(composeExecutionState(monitoring, status)) === JSON.stringify(state1))

// 5. Legacy monitoring ids still compose.
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lmon = buildExecutionMonitoringModel(legacy)
const lstate = composeExecutionState(lmon, withStatus(emptyExecutionStatus(), 'itinerary:#0', 'blocked'))
check('legacy fallback ids compose with overlaid status',
  lstate.items.find((i) => i.id === 'itinerary:#0')!.status === 'blocked' &&
  lstate.items.find((i) => i.id === 'logistic:#0')!.status === 'pending')

// 6. The layer depends on nothing in Planning or Occurrence (CODE only — ignore boundary comments).
const src = readFileSync(new URL('../lib/execution/state.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('state.ts code imports/uses nothing from Planning or Occurrence',
  !/from '@\/lib\/planning/.test(codeOnly) && !/occurrence/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

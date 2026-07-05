// Execution Monitoring Slice 1 — contract test.
//
// Verifies the first Execution consumer of the executable Planning metadata: buildExecutionMonitoringModel
// derives a deterministic, monitorable operational structure directly from EventPlanV2 — consuming id /
// trigger / temporal / prerequisiteIds / forMomentId — while defaulting legacy (pre-enrichment) plans through
// the existing compat resolver, keeping RELATIVE timing (no Occurrence/absolute times), and giving every item
// a stable id future status can attach to.
//
//   Run:  npx tsx scripts/execution-monitoring-slice-1-test.mts

import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Enriched plan (Increment 1 metadata present) ──
const enriched = {
  itinerary: [
    { id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'relative_time' },
      temporal: { offsetFromStartMinutes: 0, expectedDurationMinutes: 30 }, prerequisiteIds: ['itinerary:arrival'] },
    { id: 'itinerary:meal', name: 'Meal' }, // no trigger → must default to manual even in an enriched plan
  ],
  logistics: [
    { id: 'logistic:ceremony', description: 'Set up the ceremony', trigger: { kind: 'manual' }, forMomentId: 'itinerary:ceremony' },
  ],
} as unknown as EventPlanV2

const m = buildExecutionMonitoringModel(enriched)
const byId = Object.fromEntries(m.items.map((it) => [it.id, it]))

check('one monitoring item per moment + logistic', m.items.length === 3)
check('items derive stable ids from the plan ids',
  !!byId['itinerary:ceremony'] && !!byId['itinerary:meal'] && !!byId['logistic:ceremony'])
check('source tags are correct',
  byId['itinerary:ceremony'].source === 'itinerary_moment' && byId['logistic:ceremony'].source === 'logistic')
check('trigger consumed (explicit relative_time preserved)', byId['itinerary:ceremony'].trigger.kind === 'relative_time')
check('trigger defaulted to manual when absent (even in an enriched plan)', byId['itinerary:meal'].trigger.kind === 'manual')
check('temporal (RELATIVE) carried through untouched',
  byId['itinerary:ceremony'].temporal?.offsetFromStartMinutes === 0 &&
  byId['itinerary:ceremony'].temporal?.expectedDurationMinutes === 30)
check('moment prerequisiteIds preserved AND forMomentId consumed (prep logistic becomes a moment prerequisite)',
  byId['itinerary:ceremony'].prerequisiteIds.includes('itinerary:arrival') &&
  byId['itinerary:ceremony'].prerequisiteIds.includes('logistic:ceremony'))
check('a logistic item has no prerequisites of its own', byId['logistic:ceremony'].prerequisiteIds.length === 0)

// ── Legacy plan (no enrichment at all) ──
const legacy = {
  itinerary: [{ name: 'Old moment' }],
  logistics: [{ description: 'Old logistic' }],
} as unknown as EventPlanV2

const lm = buildExecutionMonitoringModel(legacy)
check('legacy: deterministic fallback ids when plan ids are absent',
  lm.items[0].id === 'itinerary:#0' && lm.items[1].id === 'logistic:#0')
check('legacy: trigger defaults to manual via the compat resolver',
  lm.items.every((it) => it.trigger.kind === 'manual'))
check('legacy: no prerequisites / no temporal (nothing to derive)',
  lm.items.every((it) => it.prerequisiteIds.length === 0) && lm.items.every((it) => it.temporal === undefined))

// ── Determinism + stable, unique ids (future status can attach) ──
check('deterministic: same plan → identical model',
  JSON.stringify(buildExecutionMonitoringModel(enriched)) === JSON.stringify(m))
check('every item has a non-empty id; ids are unique (attachable)',
  m.items.every((it) => it.id.length > 0) && new Set(m.items.map((it) => it.id)).size === m.items.length)

// ── No Occurrence / absolute times leaked in (timing stays relative) ──
check('no absolute time fields in the model (timing stays RELATIVE)',
  !/startsAt|endsAt|"date"|absolute|clock/i.test(JSON.stringify(m)))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

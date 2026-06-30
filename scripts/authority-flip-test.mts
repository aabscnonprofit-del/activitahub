// Authority Flip — Stage 5f of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md. Verifies (pure / no DB) that EventPlanV2's feasibility verdict is the
// Project-world plan-readiness gate: a normal FED yields 'planned' (the plan is shown), while a
// signal-less FED yields a non-'planned' verdict (falls back to clarification/handoff). The DB-side atomic
// recompute (Budget regenerated before EventPlanV2 persisted) is covered by tsc/build + code inspection.
//
//   Run:  npx tsx scripts/authority-flip-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import type { FutureEventDescription } from '../lib/ope/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const LOC = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

// A normal approved FED → V2 feasibility 'planned' → the Project-world gate shows the prepared plan.
const normal: FutureEventDescription = {
  clientRequest: 'A small conference for 80 people about local startups, with networking.',
  description: 'A one-day conference with sessions and networking for 80 attendees.',
  details: { category: 'networking', guestCount: 80 } as FutureEventDescription['details'],
  location: LOC,
}
const normalPlan = planningEngineV2.plan(normal)
check("normal FED → feasibility 'planned' (gate shows the V2 plan)", normalPlan.feasibility.verdict === 'planned')

// A signal-less FED → V2 feasibility NOT 'planned' → the gate falls back to clarification/handoff.
const empty: FutureEventDescription = {
  clientRequest: 'qwxz',
  description: 'qwxz',
  details: { category: 'workshop', guestCount: 1 } as FutureEventDescription['details'],
  location: LOC,
}
const emptyPlan = planningEngineV2.plan(empty)
check("signal-less FED → feasibility NOT 'planned' (gate does not show a V2 plan)", emptyPlan.feasibility.verdict !== 'planned')

// The gate value is a stable enum field on EventPlanV2 (the authority signal).
check('feasibility verdict is a valid enum value', ['planned', 'uncertain', 'needs_human_decision', 'out_of_scope'].includes(normalPlan.feasibility.verdict))

// Deterministic gate.
check('feasibility gate is deterministic', planningEngineV2.plan(normal).feasibility.verdict === normalPlan.feasibility.verdict)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

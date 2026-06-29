// Plan Review UI ← EventPlanV2 — Stage 5b of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md. The Plan Review UI (EventPlanV2Review) renders the native
// EventPlanV2. React rendering needs no harness here; this test verifies the UI's DATA CONTRACT — that
// the EventPlanV2 produced by Planning Engine V2 carries equivalent, renderable planning information
// for every section the review shows (so the rendered information is equivalent to the legacy review),
// deterministically. The component itself is presentation-only (verified by tsc/build + import check).
//
//   Run:  npx tsx scripts/plan-review-event-plan-v2-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import type { FutureEventDescription } from '../lib/ope/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const FED: FutureEventDescription = {
  clientRequest: 'A relaxing, scenic day for my parents on Waikiki, ~70, with a quiet dinner and a limousine ride home.',
  description: 'A relaxing scenic day ending with a quiet dinner and a ride home, for two older parents.',
  details: { category: 'anniversary', guestCount: 2 } as FutureEventDescription['details'],
  location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
}

const plan = planningEngineV2.plan(FED)

// Every section the Plan Review UI renders has renderable content on the EventPlanV2.
check('experience design present (feeling + arc)', plan.experienceDesign.intendedFeeling.length > 0 && plan.experienceDesign.arc.length > 0)
check('structure concept present', plan.structure.concept.length > 0)
check('itinerary present with named moments', plan.itinerary.length > 0 && plan.itinerary.every((m) => m.name.length > 0 && m.purpose.length > 0))
check('resources renderable (labels)', plan.resources.every((r) => r.label.length > 0))
check('staffing renderable (role + reason)', plan.staffing.every((r) => r.role.length > 0 && r.reason.length > 0))
check('cost estimate renderable (low<=likely<=high + currency + basis)', plan.costEstimate.low <= plan.costEstimate.likely && plan.costEstimate.likely <= plan.costEstimate.high && plan.costEstimate.currency.length > 0 && plan.costEstimate.basis.length > 0)
check('feasibility notes present', plan.feasibility.notes.length > 0)
check('assumptions explicit (statement + reason)', plan.assumptions.every((a) => a.statement.length > 0 && a.reason.length > 0))

// No legacy six-section structure is needed by the UI: the plan is the native EventPlanV2 (no section_*).
const keys = Object.keys(plan as Record<string, unknown>)
check('plan is native EventPlanV2 (no legacy section_* keys)', keys.every((k) => !k.startsWith('section_')))

// Deterministic — identical FED yields identical renderable plan.
check('deterministic', JSON.stringify(planningEngineV2.plan(FED)) === JSON.stringify(plan))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Public Space projection — Stage 5d of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md (Decision A). Verifies the Public Space projection renders the
// prepared event from EventPlanV2, is PUBLIC-SAFE (no internal/operational fields), and is deterministic.
// The admin/published read (getPublicEventPlan) is covered by tsc/build + code inspection; this test
// covers the pure public-safe projection.
//
//   Run:  npx tsx scripts/public-event-projection-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { buildPublicEventProjection } from '../lib/planning/public-event-projection'
import type { FutureEventDescription } from '../lib/domain/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const FED: FutureEventDescription = {
  clientRequest: 'Beach yoga every Sunday morning for a calm, scenic start to the week.',
  description: 'A recurring calm, scenic beach yoga session on Sunday mornings.',
  details: { category: 'fitness_class', guestCount: 12, recurrence: 'weekly' } as FutureEventDescription['details'],
  location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
}

const eventPlan = planningEngineV2.plan(FED)
const pub = buildPublicEventProjection(eventPlan)

// Renders the prepared event from EventPlanV2.
check('experience + concept come from EventPlanV2', pub.intendedExperience === eventPlan.experienceDesign.intendedFeeling && pub.concept === eventPlan.structure.concept && pub.experienceArc === eventPlan.experienceDesign.arc)
check('itinerary projected from EventPlanV2 (name + summary)', pub.itinerary.length === eventPlan.itinerary.length && pub.itinerary.every((m, i) => m.name === eventPlan.itinerary[i].name && m.summary === eventPlan.itinerary[i].purpose))

// PUBLIC-SAFE: only participant-facing fields; no internal/operational data leaks.
const keys = Object.keys(pub as Record<string, unknown>).sort()
const allowed = ['concept', 'experienceArc', 'intendedExperience', 'itinerary']
check('exactly the public-safe fields (no extra keys)', JSON.stringify(keys) === JSON.stringify(allowed))
const internalLeaks = ['costEstimate', 'cost', 'assumptions', 'staffing', 'resources', 'logistics', 'safety', 'contingencies', 'feasibility', 'originalIntention']
check('no internal/operational fields exposed (cost/assumptions/staffing/resources/...)', internalLeaks.every((k) => !(k in (pub as Record<string, unknown>))))

// Deterministic.
check('deterministic projection', JSON.stringify(buildPublicEventProjection(eventPlan)) === JSON.stringify(pub))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

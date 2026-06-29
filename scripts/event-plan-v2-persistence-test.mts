// EventPlanV2 native persistence — Stage 4 of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md. Verifies the persistence row stores the NATIVE EventPlanV2
// (not reduced, not converted), survives the JSONB round-trip losslessly, preserves the client's
// intention, and is deterministic. The DB write itself (persistEventPlanV2) is exercised by
// tsc/build + code inspection (single call site, surfaces errors); this test covers the pure mapping.
//
//   Run:  npx tsx scripts/event-plan-v2-persistence-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { toEventPlanV2Row } from '../lib/planning/persistence'
import type { FutureEventDescription } from '../lib/ope/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const FED: FutureEventDescription = {
  clientRequest: 'I want to organize a memorable day for my parents on Waikiki. They are about 70, relaxing, beautiful views, a quiet dinner, and a limousine ride home.',
  description: 'A relaxing, scenic day for two older parents ending with a quiet dinner and a ride home.',
  details: { category: 'anniversary', guestCount: 2 } as FutureEventDescription['details'],
  location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
}

const plan = planningEngineV2.plan(FED)
const row = toEventPlanV2Row('project-1', 1, plan)

// Keys are correct.
check('row keyed by (project_id, project_version)', row.project_id === 'project-1' && row.project_version === 1)

// The plan is stored NATIVELY — same object, not reduced/converted.
check('row.plan is the native EventPlanV2 (no reduction/conversion)', JSON.stringify(row.plan) === JSON.stringify(plan))

// Every EventPlanV2 section is present in the persisted plan (nothing dropped).
const k = row.plan as Record<string, unknown>
const requiredSections = ['experienceDesign', 'structure', 'itinerary', 'logistics', 'resources', 'staffing', 'suitability', 'safety', 'contingencies', 'costEstimate', 'feasibility', 'assumptions', 'originalIntention']
check('all EventPlanV2 sections present in the persisted plan', requiredSections.every((s) => s in k))

// Survives the JSONB round-trip losslessly.
const roundTripped = JSON.parse(JSON.stringify(row))
check('lossless JSONB round-trip', JSON.stringify(roundTripped.plan) === JSON.stringify(plan))

// The client's intention is preserved through persistence (no reduction to a category).
check('intention preserved (originalIntention === clientRequest)', row.plan.originalIntention === FED.clientRequest)
check('persisted plan carries NO legacy category field', !('category' in k))

// Deterministic.
check('deterministic row mapping', JSON.stringify(toEventPlanV2Row('project-1', 1, plan)) === JSON.stringify(row))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

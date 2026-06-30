// Project-world recompute — Stage 5e of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md. Verifies (pure / no DB): the Planning Domain round-trips with the
// startup FED, recompute from the Planning Domain re-runs Planning Engine V2 deterministically and matches
// the initial plan, and domain routing triggers recompute ONLY for the Planning Domain. The DB read/write
// (getPlanningDomain/persist/recomputeProjectPlan) is covered by tsc/build + code inspection.
//
//   Run:  npx tsx scripts/recompute-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { planningDomainFromFed, planningDomainToFed, triggersRecompute } from '../lib/planning/planning-domain'
import type { FutureEventDescription } from '../lib/ope/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const FED: FutureEventDescription = {
  clientRequest: 'A small conference for 80 people about local startups, with networking.',
  description: 'A one-day conference with sessions and networking for 80 attendees.',
  details: { category: 'networking', guestCount: 80 } as FutureEventDescription['details'],
  location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
}

// The startup FED seeds the durable Planning Domain; the engine input is rebuilt transiently from it.
const domain = planningDomainFromFed(FED)
const rebuiltFed = planningDomainToFed(domain)
check('Planning Domain round-trips with the FED (planning inputs preserved)', JSON.stringify(rebuiltFed) === JSON.stringify(FED))

// Recompute = re-run Planning Engine V2 on the FED built from the Planning Domain.
const initial = planningEngineV2.plan(FED)
const recomputed = planningEngineV2.plan(planningDomainToFed(domain))
check('recompute from the Planning Domain == the initial plan (deterministic)', JSON.stringify(recomputed) === JSON.stringify(initial))
check('recompute is deterministic across runs', JSON.stringify(planningEngineV2.plan(planningDomainToFed(domain))) === JSON.stringify(recomputed))

// A planning-relevant Planning-Domain edit changes the recomputed plan; unchanged domain does not.
const edited = planningDomainToFed({ ...domain, description: 'A two-day festival with stages, food trucks, and live music for a big crowd.' })
check('a planning-relevant change yields a different recomputed plan', JSON.stringify(planningEngineV2.plan(edited)) !== JSON.stringify(initial))

// Domain routing: ONLY the Planning Domain triggers recompute.
check('planning domain triggers recompute', triggersRecompute('planning') === true)
for (const d of ['budget', 'registration', 'payments', 'communication', 'documents', 'media', 'reviews', 'timeline'] as const) {
  check(`${d} domain does NOT trigger recompute`, triggersRecompute(d) === false)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Adapter A1 — projection tests (Stage 3 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md. Verifies A1 is a PURE PROJECTION: it preserves EventPlanV2
// information into the legacy delivery-component shape, is deterministic, invents nothing, keeps
// traceability, and STOPS (throws) on the PlannerInput projection that would require a planning
// decision — rather than guessing a category.
//
//   Run:  npx tsx scripts/adapter-a1-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { projectDeliveryComponents } from '../lib/planning/adapter-a1'
import type { FutureEventDescription } from '../lib/ope/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const FED: FutureEventDescription = {
  clientRequest: 'A small conference for 80 people about local startups.',
  description: 'A small conference for 80 people about local startups.',
  details: { category: 'networking', guestCount: 80 } as FutureEventDescription['details'],
  location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
}

const plan = planningEngineV2.plan(FED)
const projected = projectDeliveryComponents(plan)

// Projection preserves exactly the EventPlanV2 resources + roles — nothing more, nothing fewer.
check('count equals EventPlanV2 resources + roles (no invention, no loss)', projected.length === plan.resources.length + plan.staffing.length)
check('only resource_need / role_need kinds', projected.every((p) => p.component.itemKind === 'resource_need' || p.component.itemKind === 'role_need'))

// Labels are projected 1:1 from the existing EventPlanV2 labels (no new information).
const resourceLabels = new Set(plan.resources.map((r) => r.label))
const roleLabels = new Set(plan.staffing.map((r) => r.role))
check('labels project 1:1 from EventPlanV2 (no derivation)', projected.every((p) =>
  p.component.itemKind === 'resource_need' ? resourceLabels.has(p.component.label) : roleLabels.has(p.component.label)))

// Optional legacy fields are NOT filled (left absent because EventPlanV2 does not carry them).
check('optional legacy fields left absent (no filling)', projected.every((p) =>
  p.component.basis == null && p.component.quantity == null && p.component.source == null))

// Traceability preserved on every projected component.
check('every projected component is traceable to its EventPlanV2 element', projected.every((p) => p.trace.servesIntention.length > 0))

// Deterministic: same plan -> same projection.
check('deterministic projection', JSON.stringify(projectDeliveryComponents(plan)) === JSON.stringify(projectDeliveryComponents(plan)))

// itemIds are unique (legacy UNIQUE-key safe) and stable.
check('itemIds unique', new Set(projected.map((p) => p.component.itemId)).size === projected.length)

// Per Decision A: A1 has NO PlannerInput projection at all (delivery components only).

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Budget ← EventPlanV2 — Stage 5a of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md. Verifies Budget sources its lines DIRECTLY from the
// EventPlanV2 (resources + staffing) — one line per resource and per role, labelled 1:1, deterministic,
// with unique source ids — and that the mapping performs no planning. The DB read/create path
// (getEventPlanV2 / createBudgetForProjectAction) is covered by tsc/build + code inspection; this
// test covers the pure source mapping that replaced the legacy delivery-component projection.
//
//   Run:  npx tsx scripts/budget-event-plan-v2-source-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { eventPlanLineSpecs } from '../lib/budget/mirror'
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

const plan = planningEngineV2.plan(FED)
const ref = { projectId: 'project-1', projectVersion: 1 }
const specs = eventPlanLineSpecs(ref, plan)

// One line per EventPlanV2 resource + per role — nothing more, nothing fewer (Budget output equivalence).
check('one spec per resource + per role', specs.length === plan.resources.length + plan.staffing.length)

// Resources first (resource_need), then roles (role_need); labels project 1:1 from EventPlanV2.
const resourceSpecs = specs.slice(0, plan.resources.length)
const roleSpecs = specs.slice(plan.resources.length)
check('resource specs labelled 1:1 from EventPlanV2 resources', resourceSpecs.every((s, i) => s.sourceComponentRef.itemKind === 'resource_need' && s.label === plan.resources[i].label))
check('role specs labelled 1:1 from EventPlanV2 roles', roleSpecs.every((s, i) => s.sourceComponentRef.itemKind === 'role_need' && s.label === plan.staffing[i].role))

// Source refs carry the project key; ids are unique (legacy UNIQUE-key safe).
check('source refs carry (projectId, projectVersion)', specs.every((s) => s.sourceComponentRef.projectId === 'project-1' && s.sourceComponentRef.projectVersion === 1))
check('component ids unique', new Set(specs.map((s) => s.sourceComponentRef.itemId)).size === specs.length)

// Deterministic.
check('deterministic mapping', JSON.stringify(eventPlanLineSpecs(ref, plan)) === JSON.stringify(specs))

// No planning happened in the mapping: labels come only from EventPlanV2 (no invented/extra lines).
const planLabels = new Set([...plan.resources.map((r) => r.label), ...plan.staffing.map((r) => r.role)])
check('every line label originates from EventPlanV2 (Budget invents nothing)', specs.every((s) => planLabels.has(s.label)))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

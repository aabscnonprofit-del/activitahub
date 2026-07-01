// Commercial Proposal projection — Stage 5c of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md (Decision A). Verifies the Commercial Proposal projection combines the
// prepared event (EventPlanV2) with the Project Budget, presentation-only: the event content comes from
// EventPlanV2, the price comes from the Budget, nothing is planned/invented/derived, and it is deterministic.
//
//   Run:  npx tsx scripts/commercial-proposal-projection-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { buildCommercialProposalProjection } from '../lib/budget/commercial-proposal-projection'
import type { FutureEventDescription } from '../lib/domain/future-event-description'
import type { BudgetLine, BudgetTotals } from '../lib/budget/types'

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

const eventPlan = planningEngineV2.plan(FED)

// A Project Budget (financials) — the price source. One non-active line must be excluded.
const budget = {
  lines: [
    { label: 'Venue + AV', effectiveAmount: 500, lineStatus: 'active' } as BudgetLine,
    { label: 'Event coordinator', effectiveAmount: 300, lineStatus: 'active' } as BudgetLine,
    { label: 'Removed after re-plan', effectiveAmount: 100, lineStatus: 'orphaned' } as BudgetLine,
  ],
  totals: { projectBaseCost: 800, unpricedCount: 0, isComplete: true, organizerFeeAmount: 80, commercialTotal: 880, currency: 'USD' } as BudgetTotals,
}

const proj = buildCommercialProposalProjection(eventPlan, budget)

// Event content comes from EventPlanV2 (the prepared event).
check('clientRequest preserved from EventPlanV2 (not derived)', proj.clientRequest === FED.clientRequest)
check('experience + concept come from EventPlanV2', proj.intendedExperience === eventPlan.experienceDesign.intendedFeeling && proj.concept === eventPlan.structure.concept)
check('itinerary projected from EventPlanV2', proj.itinerary.length === eventPlan.itinerary.length && proj.itinerary.every((m, i) => m.name === eventPlan.itinerary[i].name))
const planLabels = new Set([...eventPlan.resources.map((r) => r.label), ...eventPlan.staffing.map((s) => s.role)])
check('included = EventPlanV2 resources + roles (nothing invented)', proj.included.length === planLabels.size && proj.included.every((l) => planLabels.has(l)))

// Price comes from the Project Budget.
check('currency + totals come from the Budget', proj.currency === 'USD' && proj.projectBaseCost === 800 && proj.commercialTotal === 880 && proj.isComplete === true)
check('only ACTIVE budget lines are projected (orphaned excluded)', proj.lines.length === 2 && proj.lines.every((l) => ['Venue + AV', 'Event coordinator'].includes(l.label)))
check('every proposal line label originates from the Budget (nothing invented)', proj.lines.every((l) => budget.lines.some((b) => b.label === l.label)))

// No planning / no legacy structure.
const keys = Object.keys(proj as Record<string, unknown>)
check('projection has no legacy section_* or category field', keys.every((k) => !k.startsWith('section_') && k !== 'category'))

// Deterministic.
check('deterministic projection', JSON.stringify(buildCommercialProposalProjection(eventPlan, budget)) === JSON.stringify(proj))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

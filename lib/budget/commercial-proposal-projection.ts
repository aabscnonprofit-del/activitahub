// Commercial Proposal — project projection (Stage 5c of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md, docs/PLANNING_LAYER_MIGRATION_ROADMAP.md (Decision A), and the
// PROJECT_AS_PLACE / PROJECT_STATE_MODEL principles: the Commercial Proposal is a PROJECTION of the same
// Project — the prepared event (from EventPlanV2) priced by the Project Budget. This is the project-keyed
// proposal; it is NOT the legacy plan-keyed proposal document.
//
// PRESENTATION ONLY. Pure + deterministic. It performs NO planning, reconstructs NO PlannerInput, invokes
// NO planning engine (V2 or legacy), and derives NO missing information — it only re-presents fields that
// already exist on the EventPlanV2 and the Project Budget.

import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import type { BudgetLine, BudgetTotals } from '@/lib/budget/types'

/** One priced line on the client-facing proposal — reflected from the Project Budget. */
export interface ProposalProjectionLine {
  label: string
  amount: number | null
}

/** The Commercial Proposal as a projection of the Project: prepared event (EventPlanV2) + price (Budget). */
export interface CommercialProposalProjection {
  // ── From EventPlanV2 (the prepared event the client receives) ──
  /** What the client originally asked for (preserved, not derived). */
  clientRequest: string
  intendedExperience: string
  experienceArc: string
  concept: string
  /** What is included = the EventPlanV2 resources + roles (labels only). */
  included: string[]
  itinerary: { name: string; summary: string }[]
  // ── From the Project Budget (the price) ──
  currency: string
  lines: ProposalProjectionLine[]
  projectBaseCost: number
  organizerFeeAmount: number
  commercialTotal: number
  isComplete: boolean
  unpricedCount: number
}

/**
 * Build the Commercial Proposal projection by combining the prepared event (EventPlanV2) with the Project
 * Budget. Pure projection: the event content is the EventPlanV2's own fields; the price is the Budget's own
 * totals/lines. Nothing is planned, invented, or derived.
 */
export function buildCommercialProposalProjection(
  eventPlan: EventPlanV2,
  budget: { lines: BudgetLine[]; totals: BudgetTotals },
): CommercialProposalProjection {
  const included = [
    ...eventPlan.resources.map((r) => r.label),
    ...eventPlan.staffing.map((s) => s.role),
  ]
  const itinerary = eventPlan.itinerary.map((m) => ({ name: m.name, summary: m.purpose }))
  const lines: ProposalProjectionLine[] = budget.lines
    .filter((l) => l.lineStatus === 'active')
    .map((l) => ({ label: l.label, amount: l.effectiveAmount }))

  return {
    clientRequest: eventPlan.originalIntention,
    intendedExperience: eventPlan.experienceDesign.intendedFeeling,
    experienceArc: eventPlan.experienceDesign.arc,
    concept: eventPlan.structure.concept,
    included,
    itinerary,
    currency: budget.totals.currency,
    lines,
    projectBaseCost: budget.totals.projectBaseCost,
    organizerFeeAmount: budget.totals.organizerFeeAmount,
    commercialTotal: budget.totals.commercialTotal,
    isComplete: budget.totals.isComplete,
    unpricedCount: budget.totals.unpricedCount,
  }
}

// Public Space — public-safe projection of the prepared event (Stage 5d of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md, docs/PLANNING_LAYER_MIGRATION_ROADMAP.md (Decision A), and the
// PROJECT_AS_PLACE / PROJECT_STATE_MODEL principles: Public Space is a read-only PROJECTION of the same
// Project for public participants. It presents the already-prepared event from EventPlanV2.
//
// PRESENTATION ONLY. Pure + deterministic. It performs NO planning, reconstructs NO PlannerInput, invokes
// NO planning engine, and derives NO information. It deliberately exposes a PUBLIC-SAFE SUBSET of the
// EventPlanV2 — what a participant should see (the experience and what happens) — and NEVER the internal
// fields (cost estimate, assumptions, staffing reasons, resource needs, logistics, feasibility).

import type { EventPlanV2 } from './event-plan-v2'

/** The public-safe view of the prepared event. Participant-facing fields only — no internal/operational data. */
export interface PublicEventProjection {
  intendedExperience: string
  experienceArc: string
  concept: string
  itinerary: { name: string; summary: string }[]
}

/**
 * Project an EventPlanV2 into its public-safe view. Only participant-facing fields are included; internal
 * fields (cost, assumptions, staffing, resources, logistics, safety, feasibility) are intentionally omitted.
 */
export function buildPublicEventProjection(eventPlan: EventPlanV2): PublicEventProjection {
  return {
    intendedExperience: eventPlan.experienceDesign.intendedFeeling,
    experienceArc: eventPlan.experienceDesign.arc,
    concept: eventPlan.structure.concept,
    itinerary: eventPlan.itinerary.map((m) => ({ name: m.name, summary: m.purpose })),
  }
}

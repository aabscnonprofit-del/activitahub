// Quick Activity — the minimal, VALID EventPlanV2 for the "I already know what I'm creating" entry.
//
// NO AI, NO planning engine, NO OPE. The organizer already knows the activity; this simply carries their title
// and description into the SAME canonical operational contract (EventPlanV2) that the assisted (BIG/OPE) path
// produces — so a Quick Activity is a fully canonical Project: approvable, publishable, and discoverable through
// the exact same pipeline. The public projection (buildPublicEventProjection) reads
// experienceDesign.intendedFeeling as the public title and structure.concept as the public summary.
//
// Pure + deterministic (no clock/randomness). Introduces no new Project type and no second public model.

import type { EventPlanV2 } from './event-plan-v2'

/** Build the canonical EventPlanV2 for a Quick Activity from the organizer's title + description. */
export function quickActivityEventPlan(input: { title: string; description: string }): EventPlanV2 {
  const title = input.title.trim()
  const description = input.description.trim()
  const trace = { servesIntention: 'Organizer-defined activity', derivedFrom: title }

  return {
    experienceDesign: { intendedFeeling: title, arc: '', trace },
    structure: { concept: description, trace },
    itinerary: [],
    logistics: [],
    resources: [],
    staffing: [],
    suitability: [],
    safety: [],
    contingencies: [],
    costEstimate: {
      low: 0,
      likely: 0,
      high: 0,
      currency: 'USD',
      basis: 'Quick activity — the organizer sets the price directly (no estimate).',
    },
    feasibility: {
      verdict: 'planned',
      notes: 'Quick activity created directly by the organizer (no assisted planning).',
    },
    assumptions: [],
    originalIntention: description || title,
  }
}

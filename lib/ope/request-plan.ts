// Customer Request → OPE Plan mapping + deterministic assessment (OPE Task #1).
// Plain module (NOT 'use server'): pure functions a server action can import.
// No LLM — request fields map straight into the existing PlannerInput, and the
// assessment is derived deterministically from the input + generated plan.

import type { PlannerInput, OpeAssessment, ClarificationQuestion } from './types'
import type { PlanGenerationResult } from './index'

/** The customer_requests fields the mapping needs. */
export type RequestLike = {
  event_type: string
  city: string | null
  country: string | null
  participant_count: number | null
  budget_cents: number | null
  notes: string | null
}

/**
 * Maps a request's event_type (the broad `activity_category` taxonomy) onto the
 * narrower set of categories OPE V1 actually plans. Anything not listed here is
 * outside OPE V1 scope → no plan is generated (the action returns a coverage
 * response). `food` covers BBQ/cookout requests (the planner's `bbq` module);
 * `activity_category` has no dedicated `bbq` value.
 */
export const REQUEST_TO_PLANNER_CATEGORY: Record<string, PlannerInput['category']> = {
  birthday: 'birthday',
  kids_party: 'birthday',
  anniversary: 'anniversary',
  graduation: 'graduation',
  reunion: 'family_reunion',
  workshop: 'workshop',
  food: 'bbq',
  language_meetup: 'networking',
}

/**
 * Alternative approaches for a request (Alternative Event Approaches, 2026-06-15).
 * The engine is deterministic, so distinct approaches come from planning the same
 * request against different content categories — each yields its own timeline,
 * priced budget and risks. The FIRST entry is the primary mapping (it matches
 * REQUEST_TO_PLANNER_CATEGORY, preserving single-plan behaviour); the rest are
 * alternatives. Event types absent here have no alternatives → no approaches.
 */
export const REQUEST_TO_PLANNER_APPROACHES: Record<string, PlannerInput['category'][]> = {
  birthday: ['birthday', 'bbq'],
  kids_party: ['birthday', 'bbq'],
  anniversary: ['anniversary', 'bbq'],
  graduation: ['graduation', 'bbq'],
  reunion: ['family_reunion', 'bbq'],
  workshop: ['workshop', 'networking'],
  food: ['bbq', 'networking'],
  language_meetup: ['networking', 'language_class'],
}

/**
 * Map a customer request to a set of alternative PlannerInputs — one per candidate
 * category — that the organizer chooses between before approving a plan. Returns []
 * when the event type is outside OPE V1 scope. Every variant shares the request's
 * mapped fields (guests/budget/location/notes) and differs only by `category`;
 * categories are de-duplicated with their order preserved.
 */
export function mapRequestToApproaches(req: RequestLike): PlannerInput[] {
  const categories = REQUEST_TO_PLANNER_APPROACHES[req.event_type]
  if (!categories?.length) return []

  const base = mapRequestToPlannerInput(req)
  if (!base) return []

  const seen = new Set<PlannerInput['category']>()
  return categories
    .filter((c) => (seen.has(c) ? false : (seen.add(c), true)))
    .map((category) => ({ ...base, category }))
}

/**
 * Build a PlannerInput from a customer request, or return null when the request
 * category is outside OPE V1 scope. Budget converts cents → whole units (the
 * PlannerInput.budget contract). Lossy fields with no planner equivalent
 * (desired_date, age_min/max) are intentionally dropped.
 */
export function mapRequestToPlannerInput(req: RequestLike): PlannerInput | null {
  const category = REQUEST_TO_PLANNER_CATEGORY[req.event_type]
  if (!category) return null

  return {
    category,
    guestCount: Math.max(1, req.participant_count ?? 1),
    venueType: null,
    budget: req.budget_cents != null ? Math.round(req.budget_cents / 100) : null,
    specialRequirements: req.notes ? [req.notes.slice(0, 120)] : [],
    location: {
      city: (req.city ?? '').trim(),
      country: (req.country ?? '').trim(),
    },
  }
}

/**
 * A request assessment is generated automatically — there is no customer in the
 * loop to answer clarification questions — so fill exactly the gaps the engine
 * flagged with conservative, plan-completing defaults, then the organizer refines
 * them via the normal Edit Inputs surface. Only the asked fields are touched.
 */
export function fillClarificationDefaults(input: PlannerInput, questions: ClarificationQuestion[]): PlannerInput {
  const next: PlannerInput = { ...input }
  for (const q of questions) {
    switch (q.field) {
      case 'venueType': next.venueType = next.venueType ?? 'backyard_home'; break
      case 'kids': next.kids = next.kids ?? 0; break
      case 'instructor': next.instructor = next.instructor ?? 'need'; break
      case 'materials': next.materials = next.materials ?? 'provided'; break
      case 'budget': next.budget = next.budget ?? 0; break
    }
  }
  return next
}

/**
 * Deterministic preliminary assessment. Complexity scales with guest count
 * (aligned with the coverage thresholds), budget range comes straight from the
 * deterministic cost engine when priced, automation coverage reflects how complete
 * the generated plan is, and risk level is read off the plan's risk register.
 */
export function buildAssessment(input: PlannerInput, result: PlanGenerationResult): OpeAssessment {
  const guests = input.guestCount
  const complexity: OpeAssessment['complexity'] = guests > 60 ? 'high' : guests > 25 ? 'medium' : 'low'

  const plan = result.status === 'plan_ready' ? result.plan : null
  const budget = plan?.section_c_budget
  const priced = !!budget?.is_priced && !!budget.estimate

  const automation_coverage: OpeAssessment['automation_coverage'] = !plan ? 'none' : priced ? 'full' : 'partial'

  const estimated_budget = priced
    ? {
        low: budget!.estimate!.low,
        likely: budget!.estimate!.likely,
        high: budget!.estimate!.high,
        currency: budget!.currency ?? 'USD',
      }
    : null

  let risk_level: OpeAssessment['risk_level'] = 'low'
  if (plan) {
    const risks = plan.section_d_key_risks.risks
    const criticalHigh = risks.some((r) => r.never_drop && r.severity === 'high')
    const anyHigh = risks.some((r) => r.severity === 'high')
    risk_level = criticalHigh ? 'high' : anyHigh || risks.length >= 4 ? 'medium' : 'low'
  }

  return { complexity, estimated_budget, automation_coverage, risk_level }
}

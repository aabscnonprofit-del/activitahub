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
  /** When (date/timing). Optional so existing callers that don't select it still type. */
  desired_date?: string | null
}

/**
 * Minimum Planning Inputs gate (MASTER 2026-06-15). Before OPE begins detailed Event
 * Planning it must establish five signals: When / Where / Who / Budget / Expected
 * Outcome. Any that is still UNKNOWN becomes a clarification question (UNKNOWN → ASK,
 * never INVENT) — the caller blocks approach generation until uncertainty is resolved.
 * These are request-level signals; the planner's own assessClarification still runs
 * later on the mapped PlannerInput for category-specific gaps. Reuses the existing
 * ClarificationQuestion shape — no new types. Expected Outcome is currently read from
 * the request's free-text notes as an INTERIM PROXY (see the outcome check below) — a
 * presence test only, not a true outcome check — so no new column / migration is
 * required yet. This is scaffolding, not the final product model.
 */
export function assessRequestReadiness(req: RequestLike): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = []

  // When — date / timing.
  if (!(req.desired_date ?? '').trim()) {
    questions.push({
      id: 'when', field: 'when', kind: 'date', reason: 'timeline',
      question: 'When should the event take place? A target date sets the planning timeline.',
    })
  }

  // Where — location / venue.
  if (!(req.city ?? '').trim()) {
    questions.push({
      id: 'where', field: 'where', kind: 'text', reason: 'location',
      question: 'Where will the event be held? The location drives venue, logistics and several costs.',
      placeholder: 'City',
    })
  }

  // Who — guests / participants.
  if (req.participant_count == null || req.participant_count <= 0) {
    questions.push({
      id: 'who', field: 'participants', kind: 'number', reason: 'pattern+resources',
      question: 'About how many people will attend? Headcount shapes the plan, resources and budget.',
      placeholder: '20',
    })
  }

  // Budget.
  if (req.budget_cents == null) {
    questions.push({
      id: 'budget', field: 'budget', kind: 'number', reason: 'budget',
      question: 'What is the budget for this event? We plan and price approaches against it.',
      placeholder: '1500',
    })
  }

  // Expected Outcome — what success looks like.
  // INTERIM PROXY: `notes` is used temporarily to stand in for Expected Outcome. This is
  // only a presence test — non-empty notes satisfy the gate. But `notes` may instead hold
  // constraints (e.g. "no alcohol, must end by 9pm") or logistics (e.g. "backyard, I'll
  // bring the cake") that contain NO actual outcome, so this can pass while the outcome is
  // still genuinely unknown. A dedicated `expected_outcome` field (or structured capture)
  // should replace this later; until then, treat `notes` here as an approximation.
  if (!(req.notes ?? '').trim()) {
    questions.push({
      id: 'outcome', field: 'outcome', kind: 'text', reason: 'outcome',
      question: 'What does a successful event look like? A short description of the desired outcome guides the approaches.',
    })
  }

  return questions
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
 *
 * `baseOverride` (optional) lets the AI Request-Understanding layer supply an
 * enriched base PlannerInput (better guests/budget/venue/requirements). When given,
 * it replaces the deterministic mapping for every variant's shared fields; the
 * candidate CATEGORY set stays deterministic (priceable 11) so pricing is unaffected.
 * Omit it (or pass undefined) for byte-identical deterministic behaviour.
 */
export function mapRequestToApproaches(req: RequestLike, baseOverride?: PlannerInput): PlannerInput[] {
  const categories = REQUEST_TO_PLANNER_APPROACHES[req.event_type]
  if (!categories?.length) return []

  const base = baseOverride ?? mapRequestToPlannerInput(req)
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

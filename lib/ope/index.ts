import { classifyActivity } from './classify'
import { assessClarification } from './clarification'
import { evaluateCoverage, type CoverageDecision } from './coverage'
import { runEngine } from './engine'
import type { ClarificationQuestion, PlannerInput, PlannerOutput, Scenario } from './types'

export type { PlannerInput, PlannerOutput, PlannerLocation, OpePattern, PricingCategory, ClarificationQuestion, Recurrence, RecurrenceFrequency, OpeAssessment } from './types'
export type { CoverageDecision, CoverageStatus } from './coverage'

export type PlanStatus = CoverageDecision['status'] | 'needs_clarification'

/**
 * Result of a planning request. The Coverage / Complexity Gate runs first; if
 * supported, the Clarification loop may ask for a few high-value facts before
 * planning. Only `plan_ready` carries a `plan`; `needs_clarification` carries
 * `questions`. Every other status is an honest refusal/handoff (`plan` is null,
 * no silent fallback). `questions` is omitted unless status is needs_clarification,
 * so plan/refusal envelopes are unchanged.
 */
export interface PlanGenerationResult {
  status: PlanStatus
  coverage: CoverageDecision
  plan: PlannerOutput | null
  questions?: ClarificationQuestion[]
}

/**
 * Public entry point. Gate → (if supported) clarify → (if complete) classify,
 * build the Scenario, and run the pipeline. Pattern + pricing reference are
 * resolved by the Activity Classification Engine and carried internally on the
 * Scenario (not serialized in OUTPUTS_V1).
 */
export function generatePlan(input: PlannerInput): PlanGenerationResult {
  const coverage = evaluateCoverage(input)
  if (coverage.status !== 'plan_ready') {
    return { status: coverage.status, coverage, plan: null }
  }

  // Supported path: ask for any missing high-value info before planning.
  const questions = assessClarification(input)
  if (questions.length) {
    return { status: 'needs_clarification', coverage, plan: null, questions }
  }

  const classification = classifyActivity(input)
  const kids = input.kids ?? 0
  const adults = input.adults ?? Math.max(0, input.guestCount - kids)

  const scenario: Scenario = {
    category: input.category,
    pattern: classification.pattern,
    pricing_category: classification.pricingCategory,
    activity_type: classification.activity_type,
    guest_count: input.guestCount,
    guest_breakdown: input.kids != null || input.adults != null ? { kids, adults } : null,
    kid_count: input.kids ?? null,
    age_group: classification.age_group,
    venue_type: input.venueType ?? null,
    region: input.location.city,
    location: input.location,
    budget: input.budget ?? null,
    currency: 'USD',
    special_requirements: input.specialRequirements ?? [],
    recurrence: input.recurrence ?? null,
    instructor: input.instructor ?? null,
    materials: input.materials ?? null,
  }

  const plan = runEngine(classification.modules, scenario)
  return { status: 'plan_ready', coverage, plan }
}

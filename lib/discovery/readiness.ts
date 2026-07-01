// OPE V2 — Discovery Engine — Planning Readiness Evaluation (Step 4).
//
// Implements the Planning Readiness Contract from docs/OPE_V2_IMPLEMENTATION_SPEC.md §9. Pure:
// given the session's ContextElements and OpenQuestions, it returns a ReadinessDecision.
//
//   Readiness = `sufficient` IFF:
//     1. every Required element is present and confirmed/assumed;
//     2. no ContextElement is contradicted;
//     3. no OpenQuestion with planningEssential = true remains.
//
// Required elements: event_nature, desired_result, audience_scale, location, and
// (constraint and/or mandatory_moment, OR an explicit "none stated").
//
// EXCLUDED from readiness (their absence must NEVER make a FED not_sufficient): date/time,
// schedule, budget/cost, vendors, staffing, resources, logistics. These are not even
// ContextElement types, so they cannot be required — readiness ignores them entirely.
//
// Step 4 scope: readiness evaluation ONLY. No clarification loop, FED drafting, approval, or
// events (later steps).

import { findContradictions } from './fed-invariants'
import type { ContextElement, ContextElementType, OpenQuestion, ReadinessDecision } from './types'

/** The four singular required elements (exactly one effective value each). */
export const REQUIRED_SINGULAR: readonly ContextElementType[] = [
  'event_nature',
  'desired_result',
  'audience_scale',
  'location',
] as const

/** The fifth required slot is satisfied by any of these element types (or the explicit-none sentinel). */
export const CONSTRAINT_TYPES: readonly ContextElementType[] = ['constraint', 'mandatory_moment'] as const

/**
 * Canonical value Discovery records (as a `constraint` ContextElement) when the client explicitly
 * states there are NO special constraints/mandatory moments. Recording it (with provenance)
 * satisfies the constraints/moments requirement; its ABSENCE — i.e. no constraint/mandatory_moment
 * element at all — leaves readiness not_sufficient.
 */
export const NONE_STATED = 'none stated'

const isUsable = (e: ContextElement): boolean =>
  (e.confidence === 'confirmed' || e.confidence === 'assumed') && typeof e.value === 'string' && e.value.trim() !== ''

/**
 * Evaluate planning readiness. Returns `sufficient` only when all three conditions hold; otherwise
 * `not_sufficient` with a diagnostic reason listing every missing/blocking item.
 */
export function evaluateReadiness(
  contextElements: ContextElement[],
  openQuestions: OpenQuestion[],
  meta: { at?: string; evaluatedAtTurn?: string | null } = {},
): ReadinessDecision {
  const reasons: string[] = []

  // (1) Required singular elements present (confirmed/assumed, non-empty).
  for (const type of REQUIRED_SINGULAR) {
    if (!contextElements.some((e) => e.elementType === type && isUsable(e))) {
      reasons.push(`missing required element: ${type}`)
    }
  }

  // (1) Constraints / mandatory moments present, OR an explicit "none stated".
  const hasConstraintSlot = contextElements.some((e) => CONSTRAINT_TYPES.includes(e.elementType) && isUsable(e))
  if (!hasConstraintSlot) {
    reasons.push('missing required element: constraints/mandatory_moments (or an explicit "none stated")')
  }

  // (2) No contradictions among singular ContextElements.
  reasons.push(...findContradictions(contextElements))

  // (3) No planning-essential open questions remain.
  const essentialOpen = openQuestions.filter((q) => q.planningEssential).length
  if (essentialOpen > 0) reasons.push(`${essentialOpen} planning-essential open question(s) remain`)

  const sufficient = reasons.length === 0
  return {
    readiness: sufficient ? 'sufficient' : 'not_sufficient',
    reason: sufficient
      ? 'all required elements present; no contradictions; no planning-essential open questions'
      : reasons.join('; '),
    at: meta.at ?? '',
    evaluatedAtTurn: meta.evaluatedAtTurn ?? null,
  }
}

// OPE V2 — Discovery Engine — FED Invariants + versioning/immutability (Step 3).
//
// Implements the lock-time FED Invariants from docs/OPE_V2_IMPLEMENTATION_SPEC.md §5, reusing the
// Step 1 structural shape validator. Step 3 covers: required fields + enums (via shape),
// locked⇒matching approval (via shape), no planning-essential open questions at lock, every
// ContextElement has source_refs (via shape), no prohibited content, no contradictions, and
// versioning/immutability behaviour.
//
// OUT OF SCOPE here (per Step 3 instructions): readiness evaluation. FED Invariant #2
// ("planning-ready" = satisfies the Planning Readiness Contract) is enforced at lock time by
// COMBINING this validator with Step 4's readiness check; it is intentionally NOT duplicated here.

import { validateFedShape } from './fed'
import type { ContextElement, ContextElementType, FED } from './types'

export interface InvariantResult {
  valid: boolean
  errors: string[]
}

// Deterministic, CONSERVATIVE guard that flags OBVIOUS prohibited content — planning artifacts
// that must never appear in a WSH/FED (§10). Pattern-based and intentionally tight to limit false
// positives; sophisticated semantic detection is out of scope (would require judgment). Scans the
// `description` and each ContextElement `value`.
const PROHIBITED: { label: string; pattern: RegExp }[] = [
  { label: 'budget/cost figure', pattern: /\$\s?\d|\b\d[\d,]*\s?(usd|eur|gbp|dollars|euros)\b|\bbudget of\b|\bcost(?:s|ing)?\b|\bpriced?\b|\bquote\b/i },
  { label: 'timeline/schedule', pattern: /\btimeline\b|\bschedule\b|run-?of-?show|\bagenda\b|\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i },
  { label: 'tasks/phases', pattern: /\btasks?\b|\bphases?\b|\bchecklist\b|\bto-?do\b/i },
  { label: 'staffing', pattern: /\bstaffing\b|\bcrew\b|\bwaiters?\b|\bbartenders?\b/i },
  { label: 'vendor selection', pattern: /\bvendors?\b|\bsuppliers?\b|\bbook (?:the )?(?:venue|caterer|dj|photographer)\b/i },
  { label: 'logistics', pattern: /\blogistics\b|\bload-?in\b|\bload-?out\b/i },
  { label: 'resource list', pattern: /\b(resource|equipment|shopping|supplies) list\b/i },
]

// Singular elements: at most one CONFIRMED value each. Two confirmed, differing values is a
// structural contradiction. constraint / mandatory_moment may legitimately repeat, so are excluded.
const SINGULAR_TYPES: readonly ContextElementType[] = ['event_nature', 'desired_result', 'audience_scale', 'location'] as const

export function findContradictions(elements: ContextElement[]): string[] {
  const errors: string[] = []
  for (const type of SINGULAR_TYPES) {
    const confirmed = new Set(
      elements
        .filter((e) => e.elementType === type && e.confidence === 'confirmed')
        .map((e) => e.value.trim().toLowerCase()),
    )
    if (confirmed.size > 1) errors.push(`contradiction: ${confirmed.size} differing confirmed '${type}' values`)
  }
  return errors
}

/**
 * Validate a FED against the Step-3 FED Invariants. Returns every problem found. A `draft` FED is
 * checked for shape, source_refs, prohibited content, and contradictions; a `locked` FED adds the
 * lock-time guarantees (matching approval — via shape — and zero planning-essential open questions).
 */
export function validateFedInvariants(fed: FED): InvariantResult {
  const errors: string[] = []

  // (1) Shape: required fields, enums, ContextElement source_refs ≥1, locked⇒matching approval.
  const shape = validateFedShape(fed)
  if (!shape.valid) errors.push(...shape.errors)

  // (7) No prohibited content in description or any ContextElement value.
  const texts = [fed.description, ...fed.statedContext.map((c) => c.value)].filter((t) => typeof t === 'string')
  for (const { label, pattern } of PROHIBITED) {
    if (texts.some((t) => pattern.test(t))) errors.push(`prohibited content: ${label}`)
  }

  // (4) No contradictions among singular ContextElements.
  errors.push(...findContradictions(fed.statedContext))

  // (3) Lock-time: no planning-essential open questions remain.
  if (fed.lockStatus === 'locked') {
    const essentialOpen = fed.openQuestions.filter((q) => q.planningEssential).length
    if (essentialOpen > 0) errors.push(`locked FED: ${essentialOpen} planning-essential open question(s) remain`)
  }

  const unique = [...new Set(errors)]
  return { valid: unique.length === 0, errors: unique }
}

/**
 * Versioning: produce a new DRAFT version from an existing FED — the ONLY legitimate way to change
 * a FED. Keeps `fedId` (the FED's identity), increments `version`, resets `lockStatus` to 'draft',
 * and clears `approval`. (Approval workflow itself is Step 6; this is the versioning primitive.)
 */
export function reviseFed(fed: FED, at: string): FED {
  return { ...fed, version: fed.version + 1, lockStatus: 'draft', approval: null, updatedAt: at }
}

/**
 * Immutability: a `locked` FED version may never change in place. If `next` carries the same
 * `fedId` and `version` as a locked `prev` but differs in any field, that is an illegal mutation.
 * A change with a different `version` (e.g. via reviseFed) is allowed.
 */
export function checkImmutability(prev: FED, next: FED): InvariantResult {
  if (prev.lockStatus !== 'locked') return { valid: true, errors: [] }
  if (next.fedId === prev.fedId && next.version === prev.version && JSON.stringify(next) !== JSON.stringify(prev)) {
    return { valid: false, errors: [`locked FED ${prev.fedId} v${prev.version} is immutable; create a new version via reviseFed()`] }
  }
  return { valid: true, errors: [] }
}

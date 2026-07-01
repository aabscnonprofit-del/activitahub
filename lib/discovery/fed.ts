// OPE V2 — Discovery Engine — FED structural shape validation (Step 1).
//
// Validates the FED Data Contract SHAPE only: required fields present, enum values in range,
// each ContextElement carries ≥1 source_refs, OpenQuestion carries a planning_essential flag,
// and a locked FED references a matching 'approved' ApprovalRecord.
//
// NOT in scope of this file (implemented in Step 3 — validateFedInvariants):
//   prohibited content, contradictions, "no planning-essential open question at lock",
//   immutability, and versioning behaviour. Those are the FED Invariants, separate from shape.

import {
  CONFIDENCE_VALUES,
  CONTEXT_ELEMENT_TYPES,
  LOCK_STATUSES,
  type FutureEventDescription,
} from './types'

export interface ShapeResult {
  valid: boolean
  errors: string[]
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isInteger = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

/**
 * Structural validation of a FED against the data contract (shape only — see Step 3 for the
 * full FED Invariants). Returns every problem found, not just the first.
 */
export function validateFedShape(fed: FutureEventDescription): ShapeResult {
  const errors: string[] = []

  if (!isNonEmptyString(fed.fedId)) errors.push('fedId: required non-empty Identifier')
  if (!isInteger(fed.version) || fed.version < 1) errors.push('version: required integer ≥ 1')
  if (!LOCK_STATUSES.includes(fed.lockStatus)) errors.push('lockStatus: must be draft|locked')
  if (!isNonEmptyString(fed.clientRequest)) errors.push('clientRequest: required non-empty Text')
  if (!isNonEmptyString(fed.description)) errors.push('description: required non-empty Text')
  if (!isNonEmptyString(fed.createdAt)) errors.push('createdAt: required Timestamp')
  if (!isNonEmptyString(fed.updatedAt)) errors.push('updatedAt: required Timestamp')

  // stated_context: ≥1 element; each element shaped correctly with ≥1 source_refs.
  if (!Array.isArray(fed.statedContext) || fed.statedContext.length < 1) {
    errors.push('statedContext: required, must contain ≥1 ContextElement')
  } else {
    fed.statedContext.forEach((c, i) => {
      if (!isNonEmptyString(c?.id)) errors.push(`statedContext[${i}].id: required`)
      if (!CONTEXT_ELEMENT_TYPES.includes(c?.elementType)) errors.push(`statedContext[${i}].elementType: invalid`)
      if (!isNonEmptyString(c?.value)) errors.push(`statedContext[${i}].value: required non-empty`)
      if (!CONFIDENCE_VALUES.includes(c?.confidence)) errors.push(`statedContext[${i}].confidence: must be confirmed|assumed`)
      if (!Array.isArray(c?.sourceRefs) || c.sourceRefs.length < 1) {
        errors.push(`statedContext[${i}].sourceRefs: required, must contain ≥1 reference`)
      }
    })
  }

  // open_questions: array; each has text + boolean planningEssential.
  if (!Array.isArray(fed.openQuestions)) {
    errors.push('openQuestions: required (may be empty)')
  } else {
    fed.openQuestions.forEach((q, i) => {
      if (!isNonEmptyString(q?.text)) errors.push(`openQuestions[${i}].text: required`)
      if (typeof q?.planningEssential !== 'boolean') errors.push(`openQuestions[${i}].planningEssential: required boolean`)
    })
  }

  // locked ⇒ approval present, action 'approved', referencing this exact version.
  if (fed.lockStatus === 'locked') {
    if (!fed.approval) {
      errors.push('locked FED: approval is required')
    } else {
      if (fed.approval.action !== 'approved') errors.push("locked FED: approval.action must be 'approved'")
      if (fed.approval.fedVersion !== fed.version) errors.push('locked FED: approval.fedVersion must equal version')
    }
  }

  return { valid: errors.length === 0, errors }
}

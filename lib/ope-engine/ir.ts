// OPE V2 — Module 2: OPE Engine — IR structural validation helpers (Step 1).
//
// LOGICAL/STRUCTURAL validation only, per the IR Data Contract (§12) and the structural parts of
// the IR Invariants (§5: required fields, enums, cardinality, provenance, internal consistency,
// CostEstimate shape, versioning). NO business logic, NO planning logic, NO engine logic.
//
// Out of scope for Step 1 (deferred to IR generation/validation): content-level IR Invariants
// 3–7 (no live vendors/people/availability, no payments/Stripe, no execution state, no real
// quote/charge, no engine-specific fields) — those are checked when an IR is produced from a FED.

import {
  COST_ESTIMATE_STATUSES,
  DEPENDENCY_TYPES,
  NEED_BASES,
  OPE_STATUSES,
  PHASES,
  PROVENANCE_SOURCES,
  REFUSAL_REASONS,
  RISK_SEVERITIES,
  type CostEstimate,
  type FedReference,
  type ImplementationRequirements,
  type ProvenanceReference,
  type ProviderReference,
  type Refusal,
} from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isInteger = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isOptNumberOrNull = (v: unknown): boolean => v == null || isNumber(v)
const isOptStringOrNull = (v: unknown): boolean => v == null || typeof v === 'string'

/** Validate a FedReference. */
export function validateFedReference(fr: FedReference): ValidationResult {
  const errors: string[] = []
  if (!isNonEmptyString(fr?.fedId)) errors.push('fedRef.fedId: required')
  if (!isInteger(fr?.fedVersion) || fr.fedVersion < 1) errors.push('fedRef.fedVersion: integer ≥ 1')
  return { valid: errors.length === 0, errors }
}

/** Validate a ProviderReference. */
export function validateProviderReference(pr: ProviderReference): ValidationResult {
  const errors: string[] = []
  if (!isNonEmptyString(pr?.providerId)) errors.push('providerRef.providerId: required')
  if (!isNonEmptyString(pr?.providerVersion)) errors.push('providerRef.providerVersion: required')
  return { valid: errors.length === 0, errors }
}

/** Validate a list of provenance references; `min` is the minimum required (≥1 for substantive elements). */
export function validateProvenance(refs: ProvenanceReference[] | undefined, where: string, min = 1): string[] {
  const errors: string[] = []
  if (!Array.isArray(refs) || refs.length < min) {
    errors.push(`${where}.derivedFrom: required, must contain ≥${min} provenance reference(s)`)
    return errors
  }
  refs.forEach((r, i) => {
    if (!isInteger(r?.fedVersion) || r.fedVersion < 1) errors.push(`${where}.derivedFrom[${i}].fedVersion: integer ≥ 1`)
    if (!PROVENANCE_SOURCES.includes(r?.source)) errors.push(`${where}.derivedFrom[${i}].source: must be description|context_element`)
    if (r?.source === 'context_element' && !isNonEmptyString(r?.contextElementId)) {
      errors.push(`${where}.derivedFrom[${i}].contextElementId: required when source = context_element`)
    }
  })
  return errors
}

/** Validate a CostEstimate: status enum, range present iff estimated, line-item shape. */
export function validateCostEstimate(ce: CostEstimate): ValidationResult {
  const errors: string[] = []
  if (!COST_ESTIMATE_STATUSES.includes(ce?.status)) {
    errors.push('costEstimate.status: must be estimated|unpriced')
  } else if (ce.status === 'estimated') {
    const r = ce.range
    if (!r || !isNumber(r.low) || !isNumber(r.likely) || !isNumber(r.high)) {
      errors.push('costEstimate: status=estimated requires a numeric range {low,likely,high}')
    } else if (!(r.low <= r.likely && r.likely <= r.high)) {
      errors.push('costEstimate.range: must satisfy low ≤ likely ≤ high')
    }
  } else if (ce.status === 'unpriced' && ce.range != null) {
    errors.push('costEstimate: status=unpriced must not carry a range')
  }
  if (!Array.isArray(ce?.lineItems)) {
    errors.push('costEstimate.lineItems: required (may be empty)')
  } else {
    ce.lineItems.forEach((li, i) => {
      if (!isNonEmptyString(li?.key)) errors.push(`costEstimate.lineItems[${i}].key: required`)
      if (!isNumber(li?.amount)) errors.push(`costEstimate.lineItems[${i}].amount: required number`)
      if (!isNonEmptyString(li?.basis)) errors.push(`costEstimate.lineItems[${i}].basis: required`)
    })
  }
  if (!isOptStringOrNull(ce?.currency)) errors.push('costEstimate.currency: Text or null')
  if (!isOptStringOrNull(ce?.note)) errors.push('costEstimate.note: Text or null')
  return { valid: errors.length === 0, errors }
}

/** Validate a Refusal: reason ∈ enum; message optional. */
export function validateRefusal(r: Refusal): ValidationResult {
  const errors: string[] = []
  if (!REFUSAL_REASONS.includes(r?.reason)) errors.push('refusal.reason: must be one of the six RefusalReason values')
  if (r?.message != null && typeof r.message !== 'string') errors.push('refusal.message: Text when present')
  return { valid: errors.length === 0, errors }
}

/**
 * Structural validation of an IR against the Data Contract (§12): required fields, enums,
 * cardinality, provenance, internal consistency (dependencies reference existing requirements;
 * each requirement.phase matches a declared timeline phase), and CostEstimate shape.
 */
export function validateImplementationRequirements(ir: ImplementationRequirements): ValidationResult {
  const errors: string[] = []

  if (!isNonEmptyString(ir?.ir_id)) errors.push('ir_id: required Identifier')
  if (!isInteger(ir?.version) || ir.version < 1) errors.push('version: required integer ≥ 1')
  if (!OPE_STATUSES.includes(ir?.status)) errors.push('status: must be current|superseded')
  if (!isNonEmptyString(ir?.createdAt)) errors.push('createdAt: required Timestamp')

  errors.push(...validateFedReference(ir?.fedRef ?? ({} as FedReference)).errors)
  errors.push(...validateProviderReference(ir?.providerRef ?? ({} as ProviderReference)).errors)

  // requirements: ≥1, shaped, provenance ≥1
  const reqIds = new Set<string>()
  if (!Array.isArray(ir?.requirements) || ir.requirements.length < 1) {
    errors.push('requirements: required, must contain ≥1 Requirement')
  } else {
    ir.requirements.forEach((r, i) => {
      if (!isNonEmptyString(r?.id)) errors.push(`requirements[${i}].id: required`)
      else reqIds.add(r.id)
      if (!isNonEmptyString(r?.description)) errors.push(`requirements[${i}].description: required`)
      if (!PHASES.includes(r?.phase)) errors.push(`requirements[${i}].phase: must be preparation|day_of|after`)
      errors.push(...validateProvenance(r?.derivedFrom, `requirements[${i}]`))
    })
  }

  // resourceNeeds (≥0)
  if (!Array.isArray(ir?.resourceNeeds)) errors.push('resourceNeeds: required (may be empty)')
  else ir.resourceNeeds.forEach((n, i) => {
    if (!isNonEmptyString(n?.id)) errors.push(`resourceNeeds[${i}].id: required`)
    if (!isNonEmptyString(n?.kind)) errors.push(`resourceNeeds[${i}].kind: required`)
    if (!NEED_BASES.includes(n?.basis)) errors.push(`resourceNeeds[${i}].basis: invalid`)
    if (!isOptNumberOrNull(n?.quantity)) errors.push(`resourceNeeds[${i}].quantity: Number or null`)
    errors.push(...validateProvenance(n?.derivedFrom, `resourceNeeds[${i}]`))
  })

  // roleNeeds (≥0)
  if (!Array.isArray(ir?.roleNeeds)) errors.push('roleNeeds: required (may be empty)')
  else ir.roleNeeds.forEach((n, i) => {
    if (!isNonEmptyString(n?.id)) errors.push(`roleNeeds[${i}].id: required`)
    if (!isNonEmptyString(n?.role)) errors.push(`roleNeeds[${i}].role: required`)
    if (!NEED_BASES.includes(n?.basis)) errors.push(`roleNeeds[${i}].basis: invalid`)
    if (!isOptNumberOrNull(n?.count)) errors.push(`roleNeeds[${i}].count: Number or null`)
    errors.push(...validateProvenance(n?.derivedFrom, `roleNeeds[${i}]`))
  })

  // risks (≥0)
  if (!Array.isArray(ir?.risks)) errors.push('risks: required (may be empty)')
  else ir.risks.forEach((r, i) => {
    if (!isNonEmptyString(r?.id)) errors.push(`risks[${i}].id: required`)
    if (!isNonEmptyString(r?.description)) errors.push(`risks[${i}].description: required`)
    if (!RISK_SEVERITIES.includes(r?.severity)) errors.push(`risks[${i}].severity: must be low|medium|high`)
    if (!isNonEmptyString(r?.mitigation)) errors.push(`risks[${i}].mitigation: required`)
    errors.push(...validateProvenance(r?.derivedFrom, `risks[${i}]`))
  })

  // timeline: ≥1
  const timelinePhases = new Set<string>()
  if (!Array.isArray(ir?.timeline) || ir.timeline.length < 1) {
    errors.push('timeline: required, must contain ≥1 TimelineElement')
  } else {
    ir.timeline.forEach((t, i) => {
      if (!isNonEmptyString(t?.id)) errors.push(`timeline[${i}].id: required`)
      if (!PHASES.includes(t?.phase)) errors.push(`timeline[${i}].phase: invalid`)
      else timelinePhases.add(t.phase)
      if (!isNonEmptyString(t?.name)) errors.push(`timeline[${i}].name: required`)
      if (!isOptStringOrNull(t?.relativeWindow)) errors.push(`timeline[${i}].relativeWindow: Text or null`)
    })
  }

  // dependencies: shaped + internal consistency (ids reference existing requirements)
  if (!Array.isArray(ir?.dependencies)) errors.push('dependencies: required (may be empty)')
  else ir.dependencies.forEach((d, i) => {
    if (!DEPENDENCY_TYPES.includes(d?.type)) errors.push(`dependencies[${i}].type: invalid`)
    if (!isNonEmptyString(d?.fromRequirementId) || !reqIds.has(d.fromRequirementId)) errors.push(`dependencies[${i}].fromRequirementId: must reference an existing Requirement`)
    if (!isNonEmptyString(d?.toRequirementId) || !reqIds.has(d.toRequirementId)) errors.push(`dependencies[${i}].toRequirementId: must reference an existing Requirement`)
  })

  // internal consistency: every requirement.phase must match a declared timeline phase
  if (Array.isArray(ir?.requirements) && timelinePhases.size > 0) {
    ir.requirements.forEach((r, i) => {
      if (PHASES.includes(r?.phase) && !timelinePhases.has(r.phase)) {
        errors.push(`requirements[${i}].phase '${r.phase}' has no matching TimelineElement`)
      }
    })
  }

  // costEstimate
  errors.push(...validateCostEstimate(ir?.costEstimate ?? ({} as CostEstimate)).errors)

  return { valid: errors.length === 0, errors }
}

// IR Invariants §5 #3–#7 — CONTENT-LEVEL prohibited content. Conservative, pattern-based; scans the
// IR's free-text content fields only (NOT enum/id metadata, NOT numeric estimate amounts). Targets
// CONCRETE leaks (named vendors / contacts / availability, payments, execution state, real
// charges/quotes, engine internals) without flagging abstract task wording like "book a venue".
const IR_PROHIBITED: { label: string; pattern: RegExp }[] = [
  { label: 'live vendor / person / availability', pattern: /[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\bavailab(?:le|ility)\b|\bcontact:|\b(?:LLC|Inc\.?|Ltd\.?|GmbH)\b/i },
  { label: 'payments / Stripe', pattern: /\bstripe\b|\bpayment\b|\bcheckout\b|\binvoice(?:d|s)?\b|\bcredit[- ]?card\b/i },
  { label: 'real quote / charge', pattern: /\$\s?\d|\bquote[ds]?\b|\bcharged \$|\bcharged to\b/i },
  { label: 'execution state', pattern: /\bcompleted\b|\bin progress\b|\bevidence\b|\bchecked off\b|\bmarked complete\b|\bstatus:/i },
  { label: 'engine-specific field', pattern: /\bitem_key\b|section_[a-f]\b|_module\b|window_days_before|PlannerInput|\bScenario\b|pricing_source|\bUCD\d\b|\b[A-Z]{2,3}-(?:T|RK|CD|TPL)\d{2}\b/ },
]

/** Collect the IR's free-text content fields (excludes ids handled separately, enums, amounts, refs). */
function collectIrTexts(ir: ImplementationRequirements): string[] {
  const t: (string | null | undefined)[] = []
  for (const r of ir.requirements ?? []) t.push(r.id, r.description)
  for (const n of ir.resourceNeeds ?? []) t.push(n.id, n.kind)
  for (const n of ir.roleNeeds ?? []) t.push(n.id, n.role)
  for (const r of ir.risks ?? []) t.push(r.id, r.description, r.mitigation)
  for (const e of ir.timeline ?? []) t.push(e.id, e.name, e.relativeWindow)
  t.push(ir.costEstimate?.note)
  for (const li of ir.costEstimate?.lineItems ?? []) t.push(li.key, li.basis)
  return t.filter((s): s is string => typeof s === 'string')
}

/** Context about the verified FED that a valid IR must trace to. */
export interface FedTraceContext {
  fedId: string
  fedVersion: number
  contextElementIds: ReadonlySet<string>
}

/**
 * Enforce the IR Invariants (§5 #1, #3–#7) of a candidate IR against the verified input FED:
 * FED↔IR traceability + content-level prohibitions. Runs AFTER structural validation. Engine- and
 * provider-agnostic; this is the "safe for downstream" guarantee the contract enforces for ANY
 * provider, not just the frozen adapter.
 */
export function validateIrInvariants(ir: ImplementationRequirements, fed: FedTraceContext): ValidationResult {
  const errors: string[] = []

  // ── Traceability (§5 #1) ──────────────────────────────────────────────────────────────
  if (ir?.fedRef?.fedId !== fed.fedId) errors.push('traceability: ir.fedRef.fedId does not match the input FED')
  if (ir?.fedRef?.fedVersion !== fed.fedVersion) errors.push('traceability: ir.fedRef.fedVersion does not match the input FED version')

  const substantive: { kind: string; id: string; refs: ProvenanceReference[] | undefined }[] = [
    ...(ir.requirements ?? []).map((e) => ({ kind: 'requirement', id: e.id, refs: e.derivedFrom })),
    ...(ir.resourceNeeds ?? []).map((e) => ({ kind: 'resourceNeed', id: e.id, refs: e.derivedFrom })),
    ...(ir.roleNeeds ?? []).map((e) => ({ kind: 'roleNeed', id: e.id, refs: e.derivedFrom })),
    ...(ir.risks ?? []).map((e) => ({ kind: 'risk', id: e.id, refs: e.derivedFrom })),
  ]
  for (const { kind, id, refs } of substantive) {
    if (!Array.isArray(refs) || refs.length < 1) {
      errors.push(`traceability: ${kind} '${id}' has no derivedFrom provenance`)
      continue
    }
    for (const r of refs) {
      if (r?.fedVersion !== fed.fedVersion) errors.push(`traceability: ${kind} '${id}' provenance fedVersion (${r?.fedVersion}) ≠ FED version (${fed.fedVersion})`)
      if (r?.source === 'context_element' && !(typeof r.contextElementId === 'string' && fed.contextElementIds.has(r.contextElementId))) {
        errors.push(`traceability: ${kind} '${id}' provenance references unknown ContextElement '${r?.contextElementId}'`)
      }
    }
  }

  // ── Content-level prohibitions (§5 #3–#7) ─────────────────────────────────────────────
  const texts = collectIrTexts(ir)
  for (const { label, pattern } of IR_PROHIBITED) {
    if (texts.some((s) => pattern.test(s))) errors.push(`prohibited content: ${label}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Version / current semantics (§12): across a set of IRs, at most one `current` per (fedId,
 * fedVersion) lineage, and no duplicate versions within a lineage. Logical helper; no business logic.
 */
export function validateCurrentInvariant(irs: ImplementationRequirements[]): ValidationResult {
  const errors: string[] = []
  const groups = new Map<string, ImplementationRequirements[]>()
  for (const ir of irs) {
    const key = `${ir.fedRef?.fedId}@${ir.fedRef?.fedVersion}`
    const arr = groups.get(key) ?? []
    arr.push(ir)
    groups.set(key, arr)
  }
  for (const [key, group] of groups) {
    const current = group.filter((x) => x.status === 'current').length
    if (current > 1) errors.push(`lineage ${key}: ${current} 'current' IRs (at most 1 allowed)`)
    const versions = group.map((x) => x.version)
    if (new Set(versions).size !== versions.length) errors.push(`lineage ${key}: duplicate IR versions`)
  }
  return { valid: errors.length === 0, errors }
}

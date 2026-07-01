// OPE V2 — Module 2: OPE Engine — Implementation Requirements (IR) domain model (Step 1).
//
// Logical entities + enums from docs/OPE_V2_MODULE2_IMPLEMENTATION_SPEC.md (§4, §8, §9, §12, §13).
// TYPES and allowed ENUMS only — no workflow, no provider behavior, no engine, no mapping, no IR
// generation, no event emission. Engine-agnostic: no field references any engine structure.
//
// Boundary: this is the OPE Engine module's output contract (IR) + contract envelope types
// (Refusal / Provider*). It does NOT import or reference the frozen engine, Discovery, Marketplace,
// Workspace, or Execution.

// ── Allowed enums (also exported as runtime arrays for validation) ──────────────────────

/** IR lifecycle status (§12). */
export const OPE_STATUSES = ['current', 'superseded'] as const
export type OpeStatus = (typeof OPE_STATUSES)[number]

/** Typed refusal reasons (§4). */
export const REFUSAL_REASONS = [
  'invalid_fed',
  'fed_not_locked',
  'fed_not_planning_ready',
  'unsupported_fed_content',
  'provider_failed',
  'provider_output_invalid',
] as const
export type RefusalReason = (typeof REFUSAL_REASONS)[number]

/** Relative phase grouping for Requirements / TimelineElements (§12) — NOT real dates. */
export const PHASES = ['preparation', 'day_of', 'after'] as const
export type Phase = (typeof PHASES)[number]

/** Scaling basis for abstract resource / role needs (§12). */
export const NEED_BASES = ['per_guest', 'per_kid', 'flat', 'unspecified'] as const
export type NeedBasis = (typeof NEED_BASES)[number]

/** Dependency relationship type (§12). */
export const DEPENDENCY_TYPES = ['finish_to_start', 'requires'] as const
export type DependencyType = (typeof DEPENDENCY_TYPES)[number]

/** Risk severity (§12). */
export const RISK_SEVERITIES = ['low', 'medium', 'high'] as const
export type RiskSeverity = (typeof RISK_SEVERITIES)[number]

/** Where a provenance reference points into the FED (§12). */
export const PROVENANCE_SOURCES = ['description', 'context_element'] as const
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number]

/** CostEstimate status (§12) — an estimate, never a price/charge. */
export const COST_ESTIMATE_STATUSES = ['estimated', 'unpriced'] as const
export type CostEstimateStatus = (typeof COST_ESTIMATE_STATUSES)[number]

/** OPE domain event types (§13) — defined here; emission is NOT implemented in this step. */
export const OPE_EVENT_TYPES = [
  'ope.requirements_requested',
  'ope.fed_rejected',
  'ope.requirements_assembled',
  'ope.requirements_validated',
  'ope.requirements_ready',
  'ope.requirements_failed',
] as const
export type OpeEventType = (typeof OPE_EVENT_TYPES)[number]

// ── References ──────────────────────────────────────────────────────────────────────────

/** The locked FED + version this IR derives from (§12). */
export interface FedReference {
  fedId: string
  fedVersion: number
}

/** The provider + version that produced the IR (§9, §12). */
export interface ProviderReference {
  providerId: string
  providerVersion: string
}

/** A provenance link from an IR element to FED content (§12). */
export interface ProvenanceReference {
  fedVersion: number
  source: ProvenanceSource
  /** Present when source = context_element. */
  contextElementId?: string | null
}

// ── IR sub-entities ─────────────────────────────────────────────────────────────────────

export interface Requirement {
  id: string
  /** What to do (not who/when). */
  description: string
  phase: Phase
  /** Provenance — ≥1 required. */
  derivedFrom: ProvenanceReference[]
}

/** An abstract resource need — never a named vendor. */
export interface ResourceNeed {
  id: string
  kind: string
  quantity?: number | null
  basis: NeedBasis
  derivedFrom: ProvenanceReference[]
}

/** An abstract role need — never a named person. */
export interface RoleNeed {
  id: string
  role: string
  count?: number | null
  basis: NeedBasis
  derivedFrom: ProvenanceReference[]
}

export interface Dependency {
  fromRequirementId: string
  toRequirementId: string
  type: DependencyType
}

export interface Risk {
  id: string
  description: string
  severity: RiskSeverity
  mitigation: string
  derivedFrom: ProvenanceReference[]
}

/** A relative phase/window — never a real date. */
export interface TimelineElement {
  id: string
  phase: Phase
  name: string
  relativeWindow?: string | null
}

/** One abstract estimate line. */
export interface CostLine {
  key: string
  amount: number
  basis: string
}

/** An estimate (range or status) — never a quote/charge/Stripe data (§10/§12). */
export interface CostEstimate {
  status: CostEstimateStatus
  /** Present iff status = 'estimated'. */
  range?: { low: number; likely: number; high: number } | null
  /** Accounting unit of the estimate; NOT a charge. */
  currency?: string | null
  lineItems: CostLine[]
  note?: string | null
}

// ── IR root ─────────────────────────────────────────────────────────────────────────────

/** Implementation Requirements — the OPE Engine's single output (§5, §12). Engine-independent. */
export interface ImplementationRequirements {
  ir_id: string
  version: number
  status: OpeStatus
  fedRef: FedReference
  providerRef: ProviderReference
  requirements: Requirement[]
  resourceNeeds: ResourceNeed[]
  roleNeeds: RoleNeed[]
  dependencies: Dependency[]
  risks: Risk[]
  timeline: TimelineElement[]
  costEstimate: CostEstimate
  createdAt: string
}

// ── Contract envelope types (§4, §8, §9) ────────────────────────────────────────────────

/** A typed refusal returned by the OPE Contract instead of an IR (§4, §8). */
export interface Refusal {
  reason: RefusalReason
  message?: string
}

/** How a provider failed — lets OPE distinguish a ready FED it cannot plan from a hard failure. */
export const PROVIDER_FAILURE_REASONS = ['failed', 'unsupported'] as const
export type ProviderFailureReason = (typeof PROVIDER_FAILURE_REASONS)[number]

/**
 * Provider failure marker (§9). `reason` maps in OPE: 'unsupported' → `unsupported_fed_content`
 * (a ready FED the provider cannot plan), anything else → `provider_failed`.
 */
export interface ProviderFailure {
  kind: 'provider_failure'
  reason?: ProviderFailureReason
  message?: string
}

/**
 * A successful provider result (§9). `raw` is the provider-specific realization data — it is
 * OPAQUE and OUT OF THE OPE CONTRACT; OPE maps it into an IR in a later step. No engine shape is
 * defined here.
 */
export interface ProviderOutput {
  kind: 'provider_output'
  providerRef: ProviderReference
  raw?: unknown
}

export type ProviderResult = ProviderOutput | ProviderFailure

/** A logical OPE domain event (§13). Defined here; emission is implemented in a later step. */
export interface OpeEvent {
  type: OpeEventType
  projectId: string
  at: string
  payload?: Record<string, unknown>
}

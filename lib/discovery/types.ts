// OPE V2 — Module 1: Discovery Engine — domain model (Step 1).
//
// Logical entities from docs/OPE_V2_IMPLEMENTATION_SPEC.md. This file defines TYPES and
// allowed ENUMS only — no workflow, no readiness logic, no event emission (later steps).
// Implementation-agnostic: no storage, transport, AI, or technology is implied here.
//
// Boundary: this is the Discovery module only. It does NOT reference or implement OPE Engine,
// Workspace, Marketplace, pricing, scheduling, execution, or payments.

// ── Allowed enums (also exported as runtime arrays for validation) ──────────────────────

export const DISCOVERY_STATUSES = [
  'created',
  'in_discovery',
  'readiness_sufficient',
  'fed_drafted',
  'fed_presented',
  'fed_approved',
  'fed_locked',
  'handed_off',
  'fed_rejected',
  'paused',
  'abandoned',
] as const
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number]

export const LOCK_STATUSES = ['draft', 'locked'] as const
export type LockStatus = (typeof LOCK_STATUSES)[number]

export const CONTEXT_ELEMENT_TYPES = [
  'event_nature',
  'desired_result',
  'audience_scale',
  'location',
  'constraint',
  'mandatory_moment',
] as const
export type ContextElementType = (typeof CONTEXT_ELEMENT_TYPES)[number]

export const CONFIDENCE_VALUES = ['confirmed', 'assumed'] as const
export type Confidence = (typeof CONFIDENCE_VALUES)[number]

export const READINESS_VALUES = ['sufficient', 'not_sufficient'] as const
export type Readiness = (typeof READINESS_VALUES)[number]

export const APPROVAL_ACTIONS = ['approved', 'rejected', 'revision_requested'] as const
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number]

// Canonical, deduplicated event set (Step 7). One concept per event; consistent naming
// (session_* for lifecycle, fed_* for FED). Removed: duplicate turn_recorded/answer_received
// (→ turn_received), assumption_* (no Assumption entity/source), question_asked and
// fed_revision_requested (no distinct source — a revision emits fed_drafted for the new version).
// `discovery.input_rejected` is RESERVED and is NOT emitted yet — input-rejection logic is
// implemented in Step 8.
export const DISCOVERY_EVENT_TYPES = [
  'discovery.session_started',
  'discovery.turn_received',
  'discovery.context_updated',
  'discovery.readiness_evaluated',
  'discovery.fed_drafted',
  'discovery.fed_presented',
  'discovery.fed_approved',
  'discovery.fed_locked',
  'discovery.fed_rejected',
  'discovery.handoff_ready',
  'discovery.session_paused',
  'discovery.session_resumed',
  'discovery.session_abandoned',
  // Reserved — defined but NOT emitted until input rejection is implemented (Step 8):
  'discovery.input_rejected',
] as const
export type DiscoveryEventType = (typeof DISCOVERY_EVENT_TYPES)[number]

export type TurnRole = 'client' | 'discovery'

// ── Logical entities ────────────────────────────────────────────────────────────────────

export interface ClientRequest {
  /** Stable id of the request entity. */
  id: string
  /** The client's original intent, verbatim. */
  text: string
  /** Optional context the client supplied up front (stated facts, never decisions). */
  prefilledContext?: string | null
  submittedAt: string
}

export interface ConversationTurn {
  id: string
  role: TurnRole
  content: string
  createdAt: string
  /** Discovery turns may carry these; client turns leave them null/undefined. */
  interpretation?: string | null
  offeredAlternatives?: string[]
  question?: string | null
}

export interface ContextElement {
  id: string
  elementType: ContextElementType
  /** Captured from the client; never invented. */
  value: string
  confidence: Confidence
  /** Provenance: references to ConversationTurn ids and/or the ClientRequest id. ≥1 required. */
  sourceRefs: string[]
}

export interface OpenQuestion {
  id: string
  text: string
  /** Whether resolving it is required for planning-sufficiency. */
  planningEssential: boolean
}

export interface ApprovalRecord {
  /** Identity reference of the approving client (logical; identity mechanism is out of scope). */
  approvedBy: string
  action: ApprovalAction
  /** Which FED version this action applies to. */
  fedVersion: number
  at: string
}

/**
 * The Future Event Description (FED) — Discovery's single output. See §5 FED Data Contract.
 *
 * DORMANT OPE-V2 COMPATIBILITY TYPE (Phase 0.2 — Single FED Declaration): this FED belongs to the dormant
 * OPE V2 lineage and is to be reconciled later. The SINGLE canonical FED the product uses is
 * lib/domain/future-event-description.ts — do not treat this type as the canonical FED.
 */
export interface FutureEventDescription {
  fedId: string
  version: number
  lockStatus: LockStatus
  /** The client's original intent, verbatim. */
  clientRequest: string
  /** The WSH: what should happen + what people experience + the desired result. */
  description: string
  statedContext: ContextElement[]
  openQuestions: OpenQuestion[]
  /** Present iff lockStatus === 'locked'. */
  approval?: ApprovalRecord | null
  createdAt: string
  updatedAt: string
}

/** Convenience alias matching the spec's short name. */
export type FED = FutureEventDescription

export interface ReadinessDecision {
  readiness: Readiness
  /** Short, human-readable reason (machine/diagnostic, not client copy). */
  reason: string
  at: string
  /** The conversation turn id at which it was computed, if applicable. */
  evaluatedAtTurn?: string | null
}

export interface DiscoveryEvent {
  type: DiscoveryEventType
  sessionId: string
  at: string
  payload?: Record<string, unknown>
}

export interface DiscoverySession {
  id: string
  /** The Project this session belongs to. Project internals are out of scope here. */
  projectId: string
  /** The client identity within the Project. Identity mechanism is out of scope here. */
  clientId: string
  status: DiscoveryStatus
  /** When paused, the status to return to on resume. */
  pausedFrom?: DiscoveryStatus | null
  clientRequest: ClientRequest | null
  conversation: ConversationTurn[]
  contextElements: ContextElement[]
  openQuestions: OpenQuestion[]
  /** FED version history; at most one entry may have lockStatus 'locked'. */
  fedVersions: FED[]
  readiness: ReadinessDecision | null
  events: DiscoveryEvent[]
  createdAt: string
  updatedAt: string
}

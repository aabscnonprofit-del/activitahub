// OPE V2 — Module 4: Organizer Workspace — Foundation domain model (Phase 1).
//
// Logical entities for the Workspace Foundation, per OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md and
// PHASE0_CONTRACT_DECISIONS.md. FOUNDATION SUBSET ONLY: workspace creation from an immutable
// Project, the initial append-only lineage (Decision 1), basic activity state (status), consumed
// criticality (Decision 2), and an append-only change journal. NO marketplace, procurement,
// communications, documents, payments, AI, enterprise, portfolio, learning, execution, or
// notifications (explicitly out of scope).
//
// Module 4 depends ONLY on the Project contract from lib/project (types + validateProject +
// computeCriticality). It never imports the OPE engine/provider/contract or the frozen engine, and
// never modifies the Project.

import type { Project } from '@/lib/project/types'
import type { CriticalityAnnotation } from '@/lib/project/criticality'

// ── Enums ───────────────────────────────────────────────────────────────────────────────

/** Lifecycle phase (M4 spec). Phase 1 only opens at `planning`; transitions are a later phase. */
export const WORKSPACE_PHASES = ['planning', 'preparation', 'ready'] as const
export type WorkspacePhase = (typeof WORKSPACE_PHASES)[number]

/** Pre-execution working status of an activity (= WorkPackageState.status, M4 spec). */
export const ACTIVITY_STATUSES = ['not_started', 'in_progress', 'blocked', 'done'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

/** Re-plan triggers (PHASE0 Decision 1). The origin entry (v1) carries no trigger (null). */
export const REPLAN_TRIGGERS = ['ir_revised', 'fed_revised', 'organizer_requested', 'rollback'] as const
export type ReplanTrigger = (typeof REPLAN_TRIGGERS)[number]

/** Lineage entry status (PHASE0 Decision 1); monotonic forward, ≤1 `current` per Workspace. */
export const LINEAGE_STATUSES = ['current', 'superseded'] as const
export type LineageStatus = (typeof LINEAGE_STATUSES)[number]

/** Open-time refusal reasons (M4 §4.3 / PHASE0). */
export const WORKSPACE_REFUSAL_REASONS = ['invalid_project', 'project_not_assembled'] as const
export type WorkspaceRefusalReason = (typeof WORKSPACE_REFUSAL_REASONS)[number]

/** Operation-time rejection reasons. */
export const OPERATION_REJECTION_REASONS = [
  // Phase 1 — foundation
  'unknown_activity',
  'invalid_status',
  'invalid_project',
  'project_not_assembled',
  'invalid_trigger',
  // Phase 2 — lifecycle & gates
  'phase_locked',
  'invalid_transition',
  'gate_not_approved',
  'unknown_gate',
  'invalid_decision_outcome',
  'decision_not_human',
] as const
export type OperationRejectionReason = (typeof OPERATION_REJECTION_REASONS)[number]

// ── Go / No-Go gates (Phase 2) ──────────────────────────────────────────────────────────

/** Gate decision outcomes (the task's three records). */
export const GATE_DECISION_OUTCOMES = ['approved', 'blocked', 'needs_change'] as const
export type GateDecisionOutcome = (typeof GATE_DECISION_OUTCOMES)[number]

/**
 * Who made a decision. Gate decisions are HUMAN-OWNED (M4 spec / PHASE0): the final go/no-go is a
 * human decision — AI/automation can never approve or decide a gate. `kind` is captured so the
 * human-only rule is structurally enforced.
 */
export const DECIDER_KINDS = ['human', 'ai', 'automation'] as const
export type DeciderKind = (typeof DECIDER_KINDS)[number]

export interface GateDecider {
  id: string
  kind: DeciderKind
}

/** A recorded human decision on a gate. */
export interface GateDecision {
  outcome: GateDecisionOutcome
  decidedBy: GateDecider
  at: string
  note?: string
}

/** A Go / No-Go gate: must be `approved` (by a human) before the Workspace may enter `guardsPhase`. */
export interface Gate {
  id: string
  name: string
  /** The phase this gate guards; entry to `guardsPhase` requires this gate `approved`. */
  guardsPhase: WorkspacePhase
  required: boolean
  /** The latest decision (the journal holds the append-only history); null = undecided. */
  decision: GateDecision | null
}

// ── References ──────────────────────────────────────────────────────────────────────────

/** Reference to the snapshot's Project. */
export interface WorkspaceProjectRef {
  projectId: string
  version: number
}

/** A `{ id, version }` reference (used for irRef/fedRef, carried from the Project). */
export interface VersionedRef {
  id: string
  version: number
}

// ── Lineage (PHASE0 Decision 1) — M4-owned, append-only ─────────────────────────────────

export interface LineageEntry {
  /** M4-assigned, monotonic from 1. */
  lineageVersion: number
  projectRef: WorkspaceProjectRef
  irRef: VersionedRef
  fedRef: VersionedRef
  /** Prior version this replaces; null for the origin (v1). */
  supersedes: number | null
  /** Why a new version exists; null for the origin (no re-plan occurred). */
  trigger: ReplanTrigger | null
  /** Human/system explanation; "initial assembly" for the origin. */
  reason: string | null
  status: LineageStatus
  createdAt: string
}

// ── Basic activity state (overlay) ──────────────────────────────────────────────────────

/** Per-activity (work package) working state. Foundation: status only. */
export interface ActivityState {
  /** References a Project work package (read-only). */
  workPackageId: string
  status: ActivityStatus
  updatedAt: string
}

// ── Change journal — append-only ────────────────────────────────────────────────────────

export interface JournalEntry {
  /** Monotonic sequence from 1. */
  seq: number
  type: string
  at: string
  payload?: Record<string, unknown>
}

// ── Workspace aggregate root ────────────────────────────────────────────────────────────

export interface Workspace {
  workspace_id: string
  projectRef: WorkspaceProjectRef
  /** Immutable Project snapshot (deep-frozen; never modified by the Workspace). */
  project: Project
  /** Lifecycle phase (planning → preparation → ready; monotonic; frozen at ready). */
  phase: WorkspacePhase
  /** Go / No-Go gates guarding lifecycle transitions (Phase 2). */
  gates: Gate[]
  /** Append-only lineage (PHASE0 Decision 1). */
  lineage: LineageEntry[]
  /** One per Project work package (foundation: status only). */
  activityStates: ActivityState[]
  /** Consumed from the Project domain (read-only); never recalculated here (PHASE0 Decision 2). */
  criticality: CriticalityAnnotation
  /** Append-only change journal. */
  journal: JournalEntry[]
  createdAt: string
}

// ── Contract envelope types ─────────────────────────────────────────────────────────────

export interface WorkspaceRefusal {
  reason: WorkspaceRefusalReason
  message?: string
}

export interface OperationRejection {
  reason: OperationRejectionReason
  message?: string
}

/** Result of a foundation operation: the new Workspace + appended journal entries, or a rejection. */
export type OperationResult =
  | { ok: true; workspace: Workspace; journal: JournalEntry[] }
  | { ok: false; rejection: OperationRejection }

export type { Project, CriticalityAnnotation }

// OPE V2 — Module 4: Organizer Workspace — Lifecycle & Go/No-Go gates (Phase 2).
//
// Adds the monotonic lifecycle transitions (planning → preparation → ready) and the human-owned
// Go/No-Go gate decisions that guard them, per OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md and
// PHASE0_CONTRACT_DECISIONS.md. Every lifecycle/gate change is journaled (append-only). NO
// marketplace/procurement/payments/execution/completion/learning/enterprise/AI-automation.
//
// Boundary: depends only on this module's own types (no Project import needed; no OPE engine).
// Gate decisions are HUMAN-OWNED — AI/automation can never decide a gate. Never touches the Project
// or the append-only lineage.

import {
  GATE_DECISION_OUTCOMES,
  WORKSPACE_PHASES,
  type Gate,
  type GateDecider,
  type GateDecision,
  type GateDecisionOutcome,
  type JournalEntry,
  type OperationRejectionReason,
  type OperationResult,
  type Workspace,
  type WorkspacePhase,
} from './types'

const reject = (reason: OperationRejectionReason, message: string): OperationResult => ({ ok: false, rejection: { reason, message } })

function nextEntry(workspace: Workspace, type: string, at: string, payload: Record<string, unknown>): JournalEntry {
  return { seq: workspace.journal.length + 1, type, at, payload }
}

function commit(workspace: Workspace, patch: Partial<Workspace>, entry: JournalEntry): OperationResult {
  return { ok: true, workspace: { ...workspace, ...patch, journal: [...workspace.journal, entry] }, journal: [entry] }
}

/** Required gates guarding entry to `phase`. */
export function requiredGatesFor(workspace: Workspace, phase: WorkspacePhase): Gate[] {
  return workspace.gates.filter((g) => g.required && g.guardsPhase === phase)
}

/** Whether a gate's current decision is `approved`. */
export function isGateApproved(gate: Gate): boolean {
  return gate.decision?.outcome === 'approved'
}

/**
 * Record a HUMAN decision on a gate (approved / blocked / needs_change). Gate decisions are
 * human-owned: AI/automation cannot decide a gate (rejected `decision_not_human`) — the final
 * go/no-go is a human decision. Append-only: the gate holds the latest decision while the journal
 * preserves the full history (a gate may be re-decided, e.g. needs_change → approved). Rejected once
 * the workspace is frozen at `ready`. Never touches the Project or the lineage.
 */
export function recordGateDecision(
  workspace: Workspace,
  gateId: string,
  opts: { outcome: GateDecisionOutcome; decidedBy: GateDecider; at?: string; note?: string },
): OperationResult {
  if (workspace.phase === 'ready') return reject('phase_locked', 'workspace is frozen at ready')
  const idx = workspace.gates.findIndex((g) => g.id === gateId)
  if (idx < 0) return reject('unknown_gate', gateId)
  if (!GATE_DECISION_OUTCOMES.includes(opts.outcome)) return reject('invalid_decision_outcome', String(opts.outcome))
  if (!opts.decidedBy || opts.decidedBy.kind !== 'human') {
    return reject('decision_not_human', 'gate decisions are human-owned; AI/automation cannot approve or decide a gate')
  }

  const at = opts.at ?? ''
  const decision: GateDecision = { outcome: opts.outcome, decidedBy: opts.decidedBy, at, ...(opts.note ? { note: opts.note } : {}) }
  const gates = workspace.gates.map((g, i) => (i === idx ? { ...g, decision } : g))
  const entry = nextEntry(workspace, 'gate.decision_recorded', at, { gateId, outcome: opts.outcome, decidedBy: opts.decidedBy.id })
  return commit(workspace, { gates }, entry)
}

/**
 * Advance the lifecycle one monotonic step forward (planning → preparation → ready). Cannot skip,
 * cannot go backward, and `ready` is terminal. Entry to a phase requires every required gate guarding
 * it to be `approved` (the human go/no-go) — else `gate_not_approved`, which is the structural
 * "cannot move to ready without required gates approved" and "cannot bypass human decision" rule.
 * Never touches the Project or the lineage; appends a journal entry.
 */
export function advancePhase(workspace: Workspace, toPhase: WorkspacePhase, opts: { at?: string } = {}): OperationResult {
  const from = workspace.phase
  if (from === 'ready') return reject('invalid_transition', 'ready is terminal; cannot advance from a frozen workspace')

  const fromIdx = WORKSPACE_PHASES.indexOf(from)
  const toIdx = WORKSPACE_PHASES.indexOf(toPhase)
  if (toIdx !== fromIdx + 1) return reject('invalid_transition', `${from} → ${toPhase} is not a single monotonic forward step`)

  const unmet = requiredGatesFor(workspace, toPhase).filter((g) => !isGateApproved(g))
  if (unmet.length) return reject('gate_not_approved', `cannot enter '${toPhase}' — required gate(s) not approved: ${unmet.map((g) => g.id).join(', ')}`)

  const at = opts.at ?? ''
  const entry = nextEntry(workspace, 'workspace.phase_advanced', at, { from, to: toPhase })
  return commit(workspace, { phase: toPhase }, entry)
}

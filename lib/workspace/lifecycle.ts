import type { OpePlanPhase } from '@/lib/types'

// ── WP8 — Lifecycle & Freeze (workspace, NOT the engine) ─────────────────────
// Pure, deterministic rules for the approved lifecycle:
//   Draft → Planning → Ready → In Progress → Completed → Closed
// Single source of truth for: which transitions are legal, which surfaces are
// editable in each phase (the freeze model), and whether a phase counts toward
// active-project billing. No engine call, no I/O. Server actions and UI both read
// from here so they never disagree.

export const PHASE_ORDER: OpePlanPhase[] = [
  'draft', 'planning', 'ready', 'in_progress', 'completed', 'closed',
]

export type TransitionKind = 'forward' | 'unfreeze' | 'reopen' | 'abandon'

export interface Transition {
  to: OpePlanPhase
  kind: TransitionKind
  forced: boolean // backward / reopen / abandon overrides are forced (warn + audit)
  warnKey?: string // workspace i18n key for the confirmation warning
}

// Legal user-initiated transitions out of each phase. Draft → Planning is NOT here:
// it is performed automatically by the server when the engine returns plan_ready,
// never via a manual control.
const TRANSITIONS: Record<OpePlanPhase, Transition[]> = {
  draft: [],
  planning: [
    { to: 'ready', kind: 'forward', forced: false },
    { to: 'closed', kind: 'abandon', forced: true, warnKey: 'warnAbandon' },
  ],
  ready: [
    { to: 'in_progress', kind: 'forward', forced: false },
    { to: 'planning', kind: 'unfreeze', forced: true, warnKey: 'warnUnfreeze' },
    { to: 'closed', kind: 'abandon', forced: true, warnKey: 'warnAbandon' },
  ],
  in_progress: [
    { to: 'completed', kind: 'forward', forced: false },
    { to: 'ready', kind: 'reopen', forced: true, warnKey: 'warnReopen' },
    { to: 'closed', kind: 'abandon', forced: true, warnKey: 'warnAbandon' },
  ],
  completed: [
    { to: 'closed', kind: 'forward', forced: false, warnKey: 'warnClose' },
    { to: 'in_progress', kind: 'reopen', forced: true, warnKey: 'warnReopen' },
  ],
  closed: [
    { to: 'completed', kind: 'reopen', forced: true, warnKey: 'warnReopenClosed' },
  ],
}

/** All legal user transitions out of `from` (excludes the auto Draft → Planning). */
export function allowedTransitions(from: OpePlanPhase): Transition[] {
  return TRANSITIONS[from] ?? []
}

/** The specific transition `from → to`, or null if it is not allowed. */
export function findTransition(from: OpePlanPhase, to: OpePlanPhase): Transition | null {
  return (TRANSITIONS[from] ?? []).find((t) => t.to === to) ?? null
}

/** The primary forward step out of `from` (the next phase), or null at a terminal. */
export function forwardNext(from: OpePlanPhase): Transition | null {
  return (TRANSITIONS[from] ?? []).find((t) => t.kind === 'forward') ?? null
}

// ── Freeze model (approved) ──────────────────────────────────────────────────
//   Ready     → freeze plan definition (inputs + budget corrections)
//   Completed → freeze preparation state (tasks / risks / resources)
//   Closed    → full read-only
// Editing a frozen plan-definition requires the explicit, warned Ready → Planning
// unfreeze; there is no per-field unlock.

/** Inputs are editable only before the plan is locked at Ready. */
export function canEditInputs(phase: OpePlanPhase): boolean {
  return phase === 'draft' || phase === 'planning'
}

/** Budget corrections share the plan-definition gate (frozen at Ready). */
export function canEditBudget(phase: OpePlanPhase): boolean {
  return canEditInputs(phase)
}

/** Preparation progress stays editable through In Progress; frozen at Completed. */
export function canEditPrep(phase: OpePlanPhase): boolean {
  return phase !== 'completed' && phase !== 'closed'
}

/** Closed is fully read-only. */
export function isReadOnly(phase: OpePlanPhase): boolean {
  return phase === 'closed'
}

// ── Billing ──────────────────────────────────────────────────────────────────
/** Active project = Planning…Completed. Draft and Closed are not billed. */
export function isBillingActive(phase: OpePlanPhase): boolean {
  return phase !== 'draft' && phase !== 'closed'
}

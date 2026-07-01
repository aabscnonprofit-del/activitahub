// OPE V2 — Discovery Engine — lifecycle state machine (Step 2).
//
// Pure status transitions over DiscoverySession.status per docs/OPE_V2_IMPLEMENTATION_SPEC.md §13.
// Step 2 implements TRANSITIONS ONLY — no readiness logic, no FED invariants, no approval
// workflow, no event emission (those are later steps). All functions are PURE: they return a new
// session and never mutate the input. Timestamps and persistence are managed by callers.
//
// One active DiscoverySession per Project is represented LOGICALLY via isActiveStatus()
// (a session occupies the slot while non-terminal); enforcement belongs to the Project layer —
// Project internals are NOT implemented here.

import type { DiscoverySession, DiscoveryStatus } from './types'

export const TERMINAL_STATUSES: readonly DiscoveryStatus[] = ['handed_off', 'abandoned'] as const

// Static transition graph (excludes the cross-cutting pause / abandon and the resume-restore,
// which are handled explicitly below). `fed_locked → handed_off` only: once the FED is locked the
// lifecycle cannot return to drafting/discovery — this REPRESENTS locked-FED immutability at the
// lifecycle level (object-level FED immutability is Step 3 / Step 6).
const ALLOWED: Record<DiscoveryStatus, readonly DiscoveryStatus[]> = {
  created: ['in_discovery', 'readiness_sufficient'],
  in_discovery: ['readiness_sufficient'],
  readiness_sufficient: ['fed_drafted', 'in_discovery'],
  fed_drafted: ['fed_presented', 'in_discovery'],
  fed_presented: ['fed_approved', 'fed_rejected', 'readiness_sufficient', 'in_discovery'],
  fed_approved: ['fed_locked'],
  fed_locked: ['handed_off'],
  handed_off: [],
  fed_rejected: ['in_discovery'],
  paused: [],
  abandoned: [],
}

export type TransitionResult =
  | { ok: true; session: DiscoverySession }
  | { ok: false; error: string }

export const isTerminalStatus = (s: DiscoveryStatus): boolean => TERMINAL_STATUSES.includes(s)
/** A session is "active" (occupies the one-active-per-Project slot) while non-terminal. */
export const isActiveStatus = (s: DiscoveryStatus): boolean => !isTerminalStatus(s)

const withStatus = (
  session: DiscoverySession,
  status: DiscoveryStatus,
  pausedFrom: DiscoveryStatus | null,
): DiscoverySession => ({ ...session, status, pausedFrom })

/** Whether `to` is a legal next status from the session's current status. */
export function canTransition(session: DiscoverySession, to: DiscoveryStatus): boolean {
  const from = session.status
  if (isTerminalStatus(from)) return false
  if (to === 'paused') return from !== 'paused'
  if (to === 'abandoned') return true // allowed from any non-terminal status (including paused)
  if (from === 'paused') return false // leave 'paused' only via resume() (or abandon, handled above)
  return ALLOWED[from].includes(to)
}

/**
 * Move the session to `to`. Pure: returns a new session or an error; never mutates the input.
 * Use resume() to leave 'paused'.
 */
export function transition(session: DiscoverySession, to: DiscoveryStatus): TransitionResult {
  const from = session.status
  if (!canTransition(session, to)) {
    if (isTerminalStatus(from)) return { ok: false, error: `terminal: no transitions allowed from '${from}'` }
    if (from === 'paused') return { ok: false, error: 'paused: use resume() to continue (or abandon)' }
    return { ok: false, error: `invalid transition: '${from}' → '${to}'` }
  }
  if (to === 'paused') return { ok: true, session: withStatus(session, 'paused', from) }
  if (to === 'abandoned') return { ok: true, session: withStatus(session, 'abandoned', null) }
  return { ok: true, session: withStatus(session, to, null) }
}

/** Pause the session, remembering the status to return to on resume. */
export function pause(session: DiscoverySession): TransitionResult {
  return transition(session, 'paused')
}

/** Resume a paused session, restoring the remembered status. */
export function resume(session: DiscoverySession): TransitionResult {
  if (session.status !== 'paused') {
    return { ok: false, error: `resume: session is not paused (status '${session.status}')` }
  }
  const restore = session.pausedFrom
  if (!restore) return { ok: false, error: 'resume: no paused-from status recorded' }
  return { ok: true, session: withStatus(session, restore, null) }
}

/** Abandon the session (allowed from any non-terminal status). */
export function abandon(session: DiscoverySession): TransitionResult {
  return transition(session, 'abandoned')
}

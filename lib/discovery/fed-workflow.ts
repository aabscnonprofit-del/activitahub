// OPE V2 — Discovery Engine — FED drafting / presentation / approval workflow (Step 6).
//
// Drives the lifecycle from "readiness sufficient" to a locked, handoff-ready FED. REUSES:
//   - state machine (transition)            lib/discovery/state-machine.ts
//   - readiness decision (mayDraftFed)       lib/discovery/clarification-loop.ts
//   - FED validation (validateFedInvariants) lib/discovery/fed-invariants.ts
//   - versioning primitive (reviseFed)        lib/discovery/fed-invariants.ts
// No logic is duplicated. All functions are PURE (return a new session; never mutate input);
// ids/timestamps are supplied by callers.
//
// NOT implemented here: event emission, Discovery Agent reasoning, OPE/Workspace/Marketplace/
// Stripe/scheduling/pricing/execution/monitoring. The FED `description` is composed
// DETERMINISTICALLY from the typed ContextElements (a mechanical template — NOT AI prose); every
// drafted/locked FED is validated, so no schedule/tasks/pricing/resources/vendors/logistics/
// staffing/execution content can enter.

import { transition } from './state-machine'
import { mayDraftFed } from './clarification-loop'
import { validateFedInvariants, reviseFed } from './fed-invariants'
import { recordEvent } from './events'
import type { DiscoverySession, FED } from './types'

export type FedOpResult =
  | { ok: true; session: DiscoverySession; fed: FED }
  | { ok: false; error: string }

/** The latest FED version held by the session, or null. */
export function currentFed(session: DiscoverySession): FED | null {
  if (session.fedVersions.length === 0) return null
  return session.fedVersions.reduce((a, b) => (b.version > a.version ? b : a))
}

// Deterministic, mechanical composition of the WSH description from the typed ContextElements.
// NOT reasoning/AI: it concatenates the client-stated singular elements. (A later Discovery Agent
// may produce richer prose; the validator guarantees no prohibited content either way.)
function composeDescription(session: DiscoverySession): string {
  const valueOf = (type: string) => session.contextElements.find((e) => e.elementType === type)?.value
  const nature = valueOf('event_nature') ?? 'the event'
  const parts = [`What should happen: ${nature}.`]
  const result = valueOf('desired_result')
  if (result) parts.push(`What people should experience / desired result: ${result}.`)
  const audience = valueOf('audience_scale')
  if (audience) parts.push(`For: ${audience}.`)
  const where = valueOf('location')
  if (where) parts.push(`Where: ${where}.`)
  return parts.join(' ')
}

/**
 * Draft a FED from the current Discovery state. Allowed ONLY when mayDraftFed(session) is true
 * (readiness sufficient). Builds the FED from current context (no planning), validates it against
 * the FED Invariants, appends it as a new version, and moves the lifecycle to `fed_drafted`.
 */
export function draftFed(session: DiscoverySession, opts: { fedId: string; at: string; description?: string }): FedOpResult {
  if (!mayDraftFed(session)) {
    return { ok: false, error: `cannot draft FED: session is not draft-ready (status '${session.status}')` }
  }
  const nextVersion = session.fedVersions.reduce((m, f) => Math.max(m, f.version), 0) + 1
  const fed: FED = {
    fedId: opts.fedId,
    version: nextVersion,
    lockStatus: 'draft',
    clientRequest: session.clientRequest?.text ?? '',
    description: opts.description ?? composeDescription(session),
    statedContext: session.contextElements,
    openQuestions: session.openQuestions,
    approval: null,
    createdAt: opts.at,
    updatedAt: opts.at,
  }
  const inv = validateFedInvariants(fed)
  if (!inv.valid) return { ok: false, error: `drafted FED invalid: ${inv.errors.join('; ')}` }

  const moved = transition(session, 'fed_drafted')
  if (!moved.ok) return { ok: false, error: moved.error }
  const s = { ...moved.session, fedVersions: [...session.fedVersions, fed], updatedAt: opts.at }
  return { ok: true, session: recordEvent(s, 'discovery.fed_drafted', opts.at, { fedId: fed.fedId, version: fed.version }), fed }
}

/** Present the current FED logically (status fed_drafted → fed_presented). */
export function presentFed(session: DiscoverySession, opts: { at?: string } = {}): FedOpResult {
  if (session.status !== 'fed_drafted') return { ok: false, error: `cannot present: status is '${session.status}', expected 'fed_drafted'` }
  const fed = currentFed(session)
  if (!fed) return { ok: false, error: 'cannot present: no FED drafted' }
  const moved = transition(session, 'fed_presented')
  if (!moved.ok) return { ok: false, error: moved.error }
  const at = opts.at ?? session.updatedAt
  return { ok: true, session: recordEvent(moved.session, 'discovery.fed_presented', at, { fedId: fed.fedId, version: fed.version }), fed }
}

/** Approve the presented FED: attach the approval, lock it, and move to `fed_locked`. */
export function approveFed(session: DiscoverySession, opts: { approvedBy: string; at: string }): FedOpResult {
  if (session.status !== 'fed_presented') return { ok: false, error: `cannot approve: status is '${session.status}', expected 'fed_presented'` }
  const fed = currentFed(session)
  if (!fed) return { ok: false, error: 'cannot approve: no FED presented' }
  const locked: FED = {
    ...fed,
    lockStatus: 'locked',
    approval: { approvedBy: opts.approvedBy, action: 'approved', fedVersion: fed.version, at: opts.at },
    updatedAt: opts.at,
  }
  const inv = validateFedInvariants(locked)
  if (!inv.valid) return { ok: false, error: `cannot approve: locked FED invalid: ${inv.errors.join('; ')}` }

  const fedVersions = session.fedVersions.map((f) => (f.fedId === fed.fedId && f.version === fed.version ? locked : f))
  let s: DiscoverySession = { ...session, fedVersions, updatedAt: opts.at }
  const a = transition(s, 'fed_approved')
  if (!a.ok) return { ok: false, error: a.error }
  s = a.session
  const l = transition(s, 'fed_locked')
  if (!l.ok) return { ok: false, error: l.error }
  let out = recordEvent(l.session, 'discovery.fed_approved', opts.at, { fedId: locked.fedId, version: locked.version })
  out = recordEvent(out, 'discovery.fed_locked', opts.at, { fedId: locked.fedId, version: locked.version })
  return { ok: true, session: out, fed: locked }
}

/** Reject the presented FED. The FED is never locked and never handed off (status → fed_rejected). */
export function rejectFed(session: DiscoverySession, opts: { at: string }): FedOpResult {
  if (session.status !== 'fed_presented') return { ok: false, error: `cannot reject: status is '${session.status}', expected 'fed_presented'` }
  const fed = currentFed(session)
  if (!fed) return { ok: false, error: 'cannot reject: no FED presented' }
  const moved = transition(session, 'fed_rejected')
  if (!moved.ok) return { ok: false, error: moved.error }
  const s = { ...moved.session, updatedAt: opts.at }
  return { ok: true, session: recordEvent(s, 'discovery.fed_rejected', opts.at, { fedId: fed.fedId, version: fed.version }), fed }
}

/**
 * Revise the presented FED: create a NEW draft version via the versioning primitive and return the
 * lifecycle to `fed_drafted` so the new version can be presented again. The prior (rejected/old)
 * version is retained in history; a locked FED is never modified in place.
 */
export function revise(session: DiscoverySession, opts: { at: string }): FedOpResult {
  if (session.status !== 'fed_presented') return { ok: false, error: `cannot revise: status is '${session.status}', expected 'fed_presented'` }
  const fed = currentFed(session)
  if (!fed) return { ok: false, error: 'cannot revise: no FED presented' }
  const next = reviseFed(fed, opts.at) // version+1, draft, approval cleared (existing versioning mechanism)

  // fed_presented → readiness_sufficient → fed_drafted (the new version becomes the current draft).
  const a = transition(session, 'readiness_sufficient')
  if (!a.ok) return { ok: false, error: a.error }
  const b = transition(a.session, 'fed_drafted')
  if (!b.ok) return { ok: false, error: b.error }
  const s = { ...b.session, fedVersions: [...session.fedVersions, next], updatedAt: opts.at }
  return { ok: true, session: recordEvent(s, 'discovery.fed_drafted', opts.at, { fedId: next.fedId, version: next.version, revision: true }), fed: next }
}

/** Handoff-ready ONLY after approval and lock: an approved, locked FED at status `fed_locked`. */
export function handoffReady(session: DiscoverySession): boolean {
  const fed = currentFed(session)
  return session.status === 'fed_locked' && !!fed && fed.lockStatus === 'locked' && fed.approval?.action === 'approved'
}

/** Hand off the locked FED to the downstream consumer (status fed_locked → handed_off, terminal). */
export function handoff(session: DiscoverySession, opts: { at: string }): FedOpResult {
  if (!handoffReady(session)) return { ok: false, error: 'handoff not ready: requires an approved, locked FED at fed_locked' }
  const fed = currentFed(session) as FED
  const moved = transition(session, 'handed_off')
  if (!moved.ok) return { ok: false, error: moved.error }
  const s = { ...moved.session, updatedAt: opts.at }
  return { ok: true, session: recordEvent(s, 'discovery.handoff_ready', opts.at, { fedId: fed.fedId, version: fed.version }), fed }
}

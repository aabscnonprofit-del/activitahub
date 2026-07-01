// OPE V2 — Discovery Engine — domain event recording (Step 7).
//
// Logical/DOMAIN events only, appended to DiscoverySession.events. NO queues, buses, transports,
// or external subscriptions. Pure and deterministic — callers supply timestamps. Every state
// change records its event exactly once; a failed/no-op operation records nothing.
//
// Most events are recorded inside the existing operations (clarification-loop.ts, fed-workflow.ts).
// The session-lifecycle events (pause/resume/abandon) are recorded by the wrappers below, because
// the low-level state machine (Step 2) is intentionally pure and timestamp-free.

import { pause, resume, abandon, type TransitionResult } from './state-machine'
import type { DiscoveryEvent, DiscoveryEventType, DiscoverySession } from './types'

/** Append one domain event to the session. Pure. */
export function recordEvent(
  session: DiscoverySession,
  type: DiscoveryEventType,
  at: string,
  payload?: Record<string, unknown>,
): DiscoverySession {
  const event: DiscoveryEvent = { type, sessionId: session.id, at, ...(payload ? { payload } : {}) }
  return { ...session, events: [...session.events, event] }
}

/** Pause the session and record `discovery.session_paused`. */
export function pauseSession(session: DiscoverySession, at: string): TransitionResult {
  const r = pause(session)
  if (!r.ok) return r
  return { ok: true, session: recordEvent(r.session, 'discovery.session_paused', at, { from: session.status }) }
}

/** Resume the session and record `discovery.session_resumed`. */
export function resumeSession(session: DiscoverySession, at: string): TransitionResult {
  const r = resume(session)
  if (!r.ok) return r
  return { ok: true, session: recordEvent(r.session, 'discovery.session_resumed', at, { to: r.session.status }) }
}

/** Abandon the session and record `discovery.session_abandoned`. */
export function abandonSession(session: DiscoverySession, at: string): TransitionResult {
  const r = abandon(session)
  if (!r.ok) return r
  return { ok: true, session: recordEvent(r.session, 'discovery.session_abandoned', at, { from: session.status }) }
}

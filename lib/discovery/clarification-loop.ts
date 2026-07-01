// OPE V2 — Discovery Engine — Clarification Loop framework (Step 5).
//
// Deterministic STATE-MUTATION framework for the clarification loop. It provides the explicit
// operations the loop performs and recomputes readiness after every change:
//   - receive a ClientRequest (startSession)
//   - add a ConversationTurn (addClientTurn / addDiscoveryTurn)
//   - add/update a ContextElement (addOrUpdateContextElement)
//   - add/resolve an OpenQuestion (addOpenQuestion / resolveOpenQuestion)
//   - recompute readiness after every turn (via evaluateReadiness, Step 4)
//   - decide whether the session stays in_discovery or may draft the FED (mayDraftFed)
//
// NOT IN SCOPE / NOT AI: interpreting raw client text into ContextElements/OpenQuestions is a
// LATER reasoning step (the Discovery Agent) and is intentionally NOT implemented here — callers
// supply the typed ContextElement/OpenQuestion. This module performs NO planning, scheduling,
// pricing, marketplace, execution, FED drafting, approval, or event emission. All functions are
// PURE (return a new session; never mutate input); timestamps/ids are supplied by callers.

import { canTransition, transition } from './state-machine'
import { evaluateReadiness } from './readiness'
import { recordEvent } from './events'
import type { ContextElement, ConversationTurn, DiscoverySession, OpenQuestion } from './types'

export type LoopResult =
  | { ok: true; session: DiscoverySession }
  | { ok: false; error: string }

/** The lifecycle statuses in which the clarification loop may operate. */
const LOOP_STATUSES = ['created', 'in_discovery', 'readiness_sufficient'] as const
const isLoopActive = (s: DiscoverySession): boolean => (LOOP_STATUSES as readonly string[]).includes(s.status)

/**
 * Recompute readiness from the session's ContextElements + OpenQuestions and move the lifecycle to
 * `readiness_sufficient` (sufficient) or `in_discovery` (not sufficient), via the state machine.
 * Pure. This is the single point that keeps status and readiness in sync after every change.
 */
function applyReadiness(session: DiscoverySession, evaluatedAtTurn: string | null = null): DiscoverySession {
  const decision = evaluateReadiness(session.contextElements, session.openQuestions, {
    at: session.updatedAt,
    evaluatedAtTurn,
  })
  let s: DiscoverySession = { ...session, readiness: decision }
  const target = decision.readiness === 'sufficient' ? 'readiness_sufficient' : 'in_discovery'
  if (s.status !== target && canTransition(s, target)) {
    const r = transition(s, target)
    if (r.ok) s = r.session
  }
  // Every readiness recomputation records exactly one readiness_evaluated event.
  return recordEvent(s, 'discovery.readiness_evaluated', s.updatedAt, { readiness: decision.readiness, status: s.status })
}

/**
 * Receive a ClientRequest and start a Discovery session. The request is evaluated immediately:
 * a sufficient initial request lands in `readiness_sufficient` (Path A); otherwise the session
 * enters the clarification loop in `in_discovery` (Path B). Optional initial context/questions let
 * callers seed what the client already stated.
 */
export function startSession(params: {
  id: string
  projectId: string
  clientId: string
  request: { id: string; text: string; prefilledContext?: string | null }
  at: string
  initialContext?: ContextElement[]
  initialOpenQuestions?: OpenQuestion[]
}): DiscoverySession {
  const base: DiscoverySession = {
    id: params.id,
    projectId: params.projectId,
    clientId: params.clientId,
    status: 'created',
    pausedFrom: null,
    clientRequest: {
      id: params.request.id,
      text: params.request.text,
      prefilledContext: params.request.prefilledContext ?? null,
      submittedAt: params.at,
    },
    conversation: [],
    contextElements: params.initialContext ?? [],
    openQuestions: params.initialOpenQuestions ?? [],
    fedVersions: [],
    readiness: null,
    events: [],
    createdAt: params.at,
    updatedAt: params.at,
  }
  // Receive the request: record session_started, then evaluate readiness (Path A / Path B).
  const started = recordEvent(base, 'discovery.session_started', params.at, { projectId: params.projectId, clientId: params.clientId })
  return applyReadiness(started)
}

/** Append a client conversation turn (an answer) and recompute readiness. */
export function addClientTurn(session: DiscoverySession, content: string, at: string, turnId: string): LoopResult {
  if (!isLoopActive(session)) return { ok: false, error: `clarification loop not active in status '${session.status}'` }
  const turn: ConversationTurn = { id: turnId, role: 'client', content, createdAt: at }
  let next = { ...session, conversation: [...session.conversation, turn], updatedAt: at }
  next = recordEvent(next, 'discovery.turn_received', at, { role: 'client', turnId })
  return { ok: true, session: applyReadiness(next, turnId) }
}

/** Append a discovery conversation turn (a question / interpretation / offered alternatives). */
export function addDiscoveryTurn(
  session: DiscoverySession,
  turn: { id: string; content: string; interpretation?: string | null; offeredAlternatives?: string[]; question?: string | null },
  at: string,
): LoopResult {
  if (!isLoopActive(session)) return { ok: false, error: `clarification loop not active in status '${session.status}'` }
  const t: ConversationTurn = {
    id: turn.id,
    role: 'discovery',
    content: turn.content,
    createdAt: at,
    interpretation: turn.interpretation ?? null,
    offeredAlternatives: turn.offeredAlternatives,
    question: turn.question ?? null,
  }
  let next = { ...session, conversation: [...session.conversation, t], updatedAt: at }
  next = recordEvent(next, 'discovery.turn_received', at, { role: 'discovery', turnId: turn.id })
  return { ok: true, session: applyReadiness(next, turn.id) }
}

/** Add a new ContextElement, or update (replace) an existing one with the same id. Recompute readiness. */
export function addOrUpdateContextElement(
  session: DiscoverySession,
  element: ContextElement,
  at: string,
  turnId: string | null = null,
): LoopResult {
  if (!isLoopActive(session)) return { ok: false, error: `clarification loop not active in status '${session.status}'` }
  const exists = session.contextElements.some((e) => e.id === element.id)
  const contextElements = exists
    ? session.contextElements.map((e) => (e.id === element.id ? element : e))
    : [...session.contextElements, element]
  let next = { ...session, contextElements, updatedAt: at }
  next = recordEvent(next, 'discovery.context_updated', at, { elementId: element.id, elementType: element.elementType, change: exists ? 'updated' : 'added' })
  return { ok: true, session: applyReadiness(next, turnId) }
}

/** Add an OpenQuestion (or replace one with the same id). Recompute readiness. */
export function addOpenQuestion(
  session: DiscoverySession,
  question: OpenQuestion,
  at: string,
  turnId: string | null = null,
): LoopResult {
  if (!isLoopActive(session)) return { ok: false, error: `clarification loop not active in status '${session.status}'` }
  const exists = session.openQuestions.some((q) => q.id === question.id)
  const openQuestions = exists
    ? session.openQuestions.map((q) => (q.id === question.id ? question : q))
    : [...session.openQuestions, question]
  let next = { ...session, openQuestions, updatedAt: at }
  next = recordEvent(next, 'discovery.context_updated', at, { openQuestionId: question.id, planningEssential: question.planningEssential, change: exists ? 'updated' : 'added' })
  return { ok: true, session: applyReadiness(next, turnId) }
}

/** Resolve (remove) an OpenQuestion by id. Recompute readiness — resolving the last essential one may flip to sufficient. */
export function resolveOpenQuestion(
  session: DiscoverySession,
  questionId: string,
  at: string,
  turnId: string | null = null,
): LoopResult {
  if (!isLoopActive(session)) return { ok: false, error: `clarification loop not active in status '${session.status}'` }
  const openQuestions = session.openQuestions.filter((q) => q.id !== questionId)
  let next = { ...session, openQuestions, updatedAt: at }
  next = recordEvent(next, 'discovery.context_updated', at, { resolvedOpenQuestionId: questionId })
  return { ok: true, session: applyReadiness(next, turnId) }
}

/**
 * The loop's decision: whether the FED may now be drafted. True only when readiness is sufficient
 * and the lifecycle is at `readiness_sufficient`. The loop NEVER drafts the FED itself — drafting,
 * presentation, approval, and locking are Step 6.
 */
export function mayDraftFed(session: DiscoverySession): boolean {
  return session.status === 'readiness_sufficient' && session.readiness?.readiness === 'sufficient'
}

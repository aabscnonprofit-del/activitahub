// Execution Runtime — Slice 1: deterministic status transitions over the Execution Status model.
//
// Pure and immutable: every transition validates against the runtime rules and returns a NEW
// ExecutionStatusModel — the input is never mutated. No clock, no randomness, no persistence, no Occurrence.
//
// Allowed transitions (every other transition is rejected):
//   pending  → active
//   active   → completed
//   pending  → blocked
//   blocked  → pending

import { statusOf, withStatus, type ExecutionStatusModel, type MonitoringStatus } from './status'

/** The permitted next statuses for each status (the runtime transition rules). */
export const ALLOWED_TRANSITIONS: Record<MonitoringStatus, readonly MonitoringStatus[]> = {
  pending: ['active', 'blocked'],
  active: ['completed'],
  blocked: ['pending'],
  completed: [],
}

/** Validation helper: is `from → to` a permitted runtime transition? */
export function canTransition(from: MonitoringStatus, to: MonitoringStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Result of a single transition. */
export type TransitionResult =
  | { ok: true; status: ExecutionStatusModel }
  | { ok: false; reason: 'invalid_transition'; itemId: string; from: MonitoringStatus; to: MonitoringStatus }

/**
 * Apply one transition to a monitoring item by id. Validates the item's current status against the rules and
 * returns a NEW status model on success, or a typed rejection (the input model is untouched either way).
 */
export function applyTransition(
  status: ExecutionStatusModel,
  itemId: string,
  to: MonitoringStatus,
): TransitionResult {
  const from = statusOf(status, itemId)
  if (!canTransition(from, to)) return { ok: false, reason: 'invalid_transition', itemId, from, to }
  return { ok: true, status: withStatus(status, itemId, to) }
}

/** One requested transition in a batch. */
export interface TransitionRequest {
  itemId: string
  to: MonitoringStatus
}

/** Result of a batch of transitions — all-or-nothing. */
export type BatchTransitionResult =
  | { ok: true; status: ExecutionStatusModel }
  | { ok: false; reason: 'invalid_transition'; itemId: string; from: MonitoringStatus; to: MonitoringStatus }

/**
 * Apply a batch of transitions atomically (all-or-nothing). Each request is validated in order against the
 * running (accumulated) status, so a batch may legitimately chain one item (e.g. pending→active→completed).
 * If ANY request is invalid, nothing is applied and a typed rejection is returned — the caller keeps its
 * original model. Pure and deterministic; never mutates.
 */
export function applyTransitions(
  status: ExecutionStatusModel,
  requests: readonly TransitionRequest[],
): BatchTransitionResult {
  let next = status
  for (const r of requests) {
    const res = applyTransition(next, r.itemId, r.to)
    if (!res.ok) return res
    next = res.status
  }
  return { ok: true, status: next }
}

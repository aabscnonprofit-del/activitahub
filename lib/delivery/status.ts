// Delivery state — the per-component delivery status (a simple procurement lifecycle) plus its assignment.
//
// State attaches to a DeliveryComponent by its stable id. This layer is pure/deterministic: builders and
// helpers never read a clock or randomness and never mutate — every update returns a NEW model. It imports
// nothing from Planning / Execution / Occurrence.

/** The delivery status of a single component — a small procurement/fulfilment lifecycle. */
export type DeliveryStatus = 'pending' | 'assigned' | 'confirmed' | 'delivered'

/** All valid delivery statuses, in canonical order. */
export const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['pending', 'assigned', 'confirmed', 'delivered']

/** The status a component has before anything is recorded. */
export const DEFAULT_DELIVERY_STATUS: DeliveryStatus = 'pending'

/** Allowed status transitions — forward through the lifecycle, and one step back for corrections. */
export const ALLOWED_DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  pending: ['assigned'],
  assigned: ['confirmed', 'pending'],
  confirmed: ['delivered', 'assigned'],
  delivered: ['confirmed'],
}

/** Whether a component may transition from `from` to `to`. */
export function canDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return ALLOWED_DELIVERY_TRANSITIONS[from].includes(to)
}

/** Type guard: is `v` a valid delivery status? */
export function isDeliveryStatus(v: unknown): v is DeliveryStatus {
  return typeof v === 'string' && (DELIVERY_STATUSES as readonly string[]).includes(v)
}

/** The delivery state of one component — its status and who it is assigned to (free text; null = unassigned). */
export interface DeliveryComponentState {
  status: DeliveryStatus
  assignee: string | null
}

/** Delivery state keyed by DeliveryComponent id. Missing ids resolve to the default (pending, unassigned). */
export interface DeliveryStateModel {
  byComponentId: Record<string, DeliveryComponentState>
}

/** The default state for one component (pending, unassigned). */
export function defaultComponentState(): DeliveryComponentState {
  return { status: DEFAULT_DELIVERY_STATUS, assignee: null }
}

/** A fresh, empty delivery state model (every component resolves to the default via stateOf). */
export function emptyDeliveryState(): DeliveryStateModel {
  return { byComponentId: {} }
}

/** The state recorded for a component id, or the default (pending, unassigned) when none is set. */
export function stateOf(state: DeliveryStateModel, componentId: string): DeliveryComponentState {
  return state.byComponentId[componentId] ?? defaultComponentState()
}

/** Set the status for a component id — returns a NEW model (pure; never mutates the input). */
export function withDeliveryStatus(
  state: DeliveryStateModel,
  componentId: string,
  next: DeliveryStatus,
): DeliveryStateModel {
  const current = stateOf(state, componentId)
  return { byComponentId: { ...state.byComponentId, [componentId]: { ...current, status: next } } }
}

/** Set the assignee for a component id (empty string → unassigned) — returns a NEW model. */
export function withDeliveryAssignee(
  state: DeliveryStateModel,
  componentId: string,
  assignee: string | null,
): DeliveryStateModel {
  const current = stateOf(state, componentId)
  const normalized = assignee && assignee.trim() ? assignee.trim() : null
  return { byComponentId: { ...state.byComponentId, [componentId]: { ...current, assignee: normalized } } }
}

// Execution Status — Slice 2: the first execution status layer on top of Execution Monitoring (Slice 1).
//
// A status attaches to a MonitoringItem by its STABLE id (which the monitoring model always provides —
// including the deterministic fallback ids for legacy, pre-enrichment plans). This layer:
//   - depends only on the Execution monitoring model (Execution-internal); it imports NOTHING from Planning
//     or Occurrence and changes neither;
//   - records no absolute time and no Occurrence binding (that is a later slice);
//   - is pure/deterministic: builders and helpers never read a clock or randomness, and never mutate — every
//     update returns a NEW model.

import type { ExecutionMonitoringModel } from './monitoring'

/** The execution status of a single monitoring item. */
export type MonitoringStatus = 'pending' | 'active' | 'blocked' | 'completed'

/** All valid statuses, in canonical order. */
export const MONITORING_STATUSES: readonly MonitoringStatus[] = ['pending', 'active', 'blocked', 'completed']

/** The status an item has before anything is recorded. */
export const DEFAULT_MONITORING_STATUS: MonitoringStatus = 'pending'

/** Execution status keyed by MonitoringItem id. A missing id resolves to the default (pending), so the model
 *  can be used densely (every item initialized) or sparsely (only recorded overrides). */
export interface ExecutionStatusModel {
  byItemId: Record<string, MonitoringStatus>
}

/** Type guard: is `v` a valid monitoring status? */
export function isMonitoringStatus(v: unknown): v is MonitoringStatus {
  return typeof v === 'string' && (MONITORING_STATUSES as readonly string[]).includes(v)
}

/** A fresh, empty status model (every item resolves to the default via statusOf). */
export function emptyExecutionStatus(): ExecutionStatusModel {
  return { byItemId: {} }
}

/**
 * The initial status model for a monitoring model — every item set to the default (pending). Deterministic:
 * iterates the monitoring items in their fixed order. Attaches by MonitoringItem id, so legacy plans (with
 * fallback ids) are covered automatically.
 */
export function initialExecutionStatus(model: ExecutionMonitoringModel): ExecutionStatusModel {
  const byItemId: Record<string, MonitoringStatus> = {}
  for (const item of model.items) byItemId[item.id] = DEFAULT_MONITORING_STATUS
  return { byItemId }
}

/** The status recorded for a monitoring item id, or the default (pending) when none is set. */
export function statusOf(status: ExecutionStatusModel, itemId: string): MonitoringStatus {
  return status.byItemId[itemId] ?? DEFAULT_MONITORING_STATUS
}

/** Set the status for a monitoring item id — returns a NEW model (pure; never mutates the input). */
export function withStatus(
  status: ExecutionStatusModel,
  itemId: string,
  next: MonitoringStatus,
): ExecutionStatusModel {
  return { byItemId: { ...status.byItemId, [itemId]: next } }
}

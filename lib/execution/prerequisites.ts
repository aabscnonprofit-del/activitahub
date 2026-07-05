// Execution Runtime — Slice 2: prerequisite enforcement on activation.
//
// Adds a prerequisite-aware transition on top of the pure status transitions (Slice 1, unchanged): a pending
// item may become `active` only when ALL of its prerequisiteIds are `completed`. Every other transition
// defers to the base rules untouched. Pure and immutable: returns a NEW status model or a typed rejection;
// never mutates. Reads the monitoring model (for prerequisiteIds) + the status model; nothing from Planning
// or Occurrence.

import type { ExecutionMonitoringModel } from './monitoring'
import { statusOf, type ExecutionStatusModel, type MonitoringStatus } from './status'
import { applyTransition, type TransitionResult } from './runtime'

/** Result of a prerequisite-enforced transition — the base results plus a prerequisite rejection. */
export type PrerequisiteTransitionResult =
  | TransitionResult
  | { ok: false; reason: 'prerequisites_incomplete'; itemId: string; incompletePrerequisiteIds: string[] }

/**
 * The prerequisiteIds of `itemId` that are NOT yet completed (per the status model). Empty when the item has
 * no prerequisites or all are completed. Items with no monitoring entry have no prerequisites.
 */
export function incompletePrerequisites(
  monitoring: ExecutionMonitoringModel,
  status: ExecutionStatusModel,
  itemId: string,
): string[] {
  const item = monitoring.items.find((i) => i.id === itemId)
  return (item?.prerequisiteIds ?? []).filter((pid) => statusOf(status, pid) !== 'completed')
}

/**
 * Apply a transition WITH prerequisite enforcement. The base transition rules are checked first (so a
 * structurally-invalid transition is rejected as `invalid_transition`); then, for a valid activation
 * (→ active, i.e. pending → active), every prerequisite must be `completed` or the transition is rejected as
 * `prerequisites_incomplete` (listing the incomplete ids). Pure/immutable — the input model is never mutated.
 */
export function applyTransitionWithPrerequisites(
  monitoring: ExecutionMonitoringModel,
  status: ExecutionStatusModel,
  itemId: string,
  to: MonitoringStatus,
): PrerequisiteTransitionResult {
  const base = applyTransition(status, itemId, to)
  if (!base.ok) return base
  if (to === 'active') {
    const incomplete = incompletePrerequisites(monitoring, status, itemId)
    if (incomplete.length > 0) {
      return { ok: false, reason: 'prerequisites_incomplete', itemId, incompletePrerequisiteIds: incomplete }
    }
  }
  return base
}

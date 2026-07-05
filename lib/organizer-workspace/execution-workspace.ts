// Organizer Workspace — Slice 1: the first Execution Workspace READ MODEL.
//
// Composes the Execution snapshot (state = the checklist) and the Occurrence timeline (bound entries + unbound
// items) into one deterministic read model for the organizer, plus basic readiness counts by status. Pure and
// deterministic; reads no clock. It READS the Execution + Occurrence models (types) and mutates nothing; it
// changes no Planning, Execution, or Occurrence code, and touches none of the existing organizer-workspace
// modules.

import type { ExecutionSnapshot } from '@/lib/execution/snapshot'
import type { ExecutionStateItem } from '@/lib/execution/state'
import { MONITORING_STATUSES, type MonitoringStatus } from '@/lib/execution/status'
import { itemActivationReadiness, type ItemActivationReadiness } from '@/lib/execution/readiness'
import type { OccurrenceTimeline, TimelineEntry } from '@/lib/occurrence/timeline'
import type { UnboundExecutionItem } from '@/lib/occurrence/binding'

/** Occurrence-level execution progress — how far execution has run and whether it is finished. */
export interface ExecutionProgress {
  /** Total checklist items. */
  total: number
  /** Items whose status is `completed`. */
  completed: number
  /** True only when there is at least one item and every item is completed. */
  isComplete: boolean
}

/** The Execution Workspace read model for the organizer. */
export interface ExecutionWorkspaceModel {
  /** Checklist items = the Execution state (each monitoring item + its current status), in monitoring order. */
  checklist: ExecutionStateItem[]
  /** Timeline entries from the Occurrence timeline (already ordered by absoluteStart). */
  timeline: TimelineEntry[]
  /** Items that could not be time-bound, preserved separately. */
  unbound: UnboundExecutionItem[]
  /** Count of checklist items per status (every status present; 0 when none). */
  readiness: Record<MonitoringStatus, number>
  /** Occurrence-level progress / completion. */
  progress: ExecutionProgress
  /** Per-item activation readiness (can it be started now, and why not) keyed by monitoring item id. */
  itemReadiness: Record<string, ItemActivationReadiness>
}

/**
 * Build the Execution Workspace read model from an Execution snapshot and an Occurrence timeline. Deterministic
 * and pure: the checklist follows the snapshot's state order, the timeline follows the (already ordered)
 * timeline entries, unbound items are carried through, readiness tallies the checklist by status over the
 * canonical status set, progress tallies completion, and each item's activation readiness is computed from the
 * snapshot's monitoring + status under the runtime rules. Inputs are not mutated.
 */
export function buildExecutionWorkspace(
  snapshot: ExecutionSnapshot,
  timeline: OccurrenceTimeline,
): ExecutionWorkspaceModel {
  const readiness = Object.fromEntries(MONITORING_STATUSES.map((s) => [s, 0])) as Record<MonitoringStatus, number>
  for (const item of snapshot.state.items) readiness[item.status] += 1

  const itemReadiness: Record<string, ItemActivationReadiness> = {}
  for (const item of snapshot.state.items) {
    itemReadiness[item.id] = itemActivationReadiness(snapshot.monitoring, snapshot.status, item.id)
  }

  const total = snapshot.state.items.length
  const completed = readiness.completed
  const progress: ExecutionProgress = { total, completed, isComplete: total > 0 && completed === total }

  return {
    checklist: [...snapshot.state.items],
    timeline: [...timeline.entries],
    unbound: [...timeline.unbound],
    readiness,
    progress,
    itemReadiness,
  }
}

// Occurrence Binding — Slice 2: a deterministic bound TIMELINE read model over an OccurrenceBinding.
//
// Orders the bound execution items along the Occurrence's absolute timeline (earliest first), with a
// deterministic tie-break for equal start times, and carries the unbound items through untouched. Pure and
// deterministic; reads no clock (ISO instants are same-format UTC, so lexicographic order == chronological);
// does not mutate the binding. Reads only the Occurrence binding types; changes no Planning or Execution code.

import type { OccurrenceBinding, BoundExecutionItem, UnboundExecutionItem } from './binding'

/** One entry on the bound timeline (monitoringItemId, occurrenceId, absoluteStart, absoluteDeadline?, relative). */
export type TimelineEntry = BoundExecutionItem

/** The bound timeline read model for one Occurrence. */
export interface OccurrenceTimeline {
  occurrenceId: string
  occurrenceStartIso: string
  /** Bound entries ordered by absoluteStart ascending; ties broken by monitoringItemId (total, deterministic). */
  entries: TimelineEntry[]
  /** The unbound items, preserved separately in binding order. */
  unbound: UnboundExecutionItem[]
}

/**
 * Build the bound timeline read model from an OccurrenceBinding. Bound items are ordered by `absoluteStart`
 * (ascending); equal start times are tie-broken by `monitoringItemId`, giving a total, deterministic order.
 * Unbound items are carried through separately. Pure — the input binding is not mutated.
 */
export function buildOccurrenceTimeline(binding: OccurrenceBinding): OccurrenceTimeline {
  const entries = [...binding.bound].sort((a, b) =>
    a.absoluteStart < b.absoluteStart ? -1 :
    a.absoluteStart > b.absoluteStart ? 1 :
    a.monitoringItemId < b.monitoringItemId ? -1 :
    a.monitoringItemId > b.monitoringItemId ? 1 : 0,
  )
  return {
    occurrenceId: binding.occurrenceId,
    occurrenceStartIso: binding.occurrenceStartIso,
    entries,
    unbound: [...binding.unbound],
  }
}

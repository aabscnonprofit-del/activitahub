// Occurrence Binding — Slice 1: bind Planning's RELATIVE timing to a concrete Occurrence's ABSOLUTE timeline.
//
// The architecture boundary: Planning owns relative time (offsets from the event start); Occurrence owns
// absolute time. This module is the bridge — given an Execution snapshot (whose monitoring items carry the
// plan's relative timing) and an Occurrence's absolute start, it computes the absolute start/deadline for the
// items that are time-bindable.
//
// Deterministic and pure: same inputs → same output; no clock is read (dates are computed only from the given
// start + offsets). It READS the Execution snapshot + the Occurrence start; it mutates nothing and changes no
// Planning or Execution code. Not yet scheduled: after_item and external_event triggers (they need the runtime
// / an external signal), and items without usable relative timing.

import type { RelativeTiming } from '@/lib/planning/event-plan-v2'
import type { ExecutionSnapshot } from '@/lib/execution/snapshot'

/** A monitoring item whose relative timing has been resolved to the Occurrence's absolute timeline. */
export interface BoundExecutionItem {
  monitoringItemId: string
  occurrenceId: string
  relative: RelativeTiming
  /** occurrenceStart + offsetFromStartMinutes (ISO 8601, UTC). */
  absoluteStart: string
  /** occurrenceStart + deadlineOffsetMinutes, else absoluteStart + expectedDurationMinutes; omitted when neither. */
  absoluteDeadline?: string
}

/** A monitoring item that is not time-bound in this slice, with the reason. */
export interface UnboundExecutionItem {
  monitoringItemId: string
  occurrenceId: string
  reason: 'no_temporal' | 'trigger_not_time_bound'
}

/** The result of binding an Execution snapshot to one Occurrence. */
export interface OccurrenceBinding {
  occurrenceId: string
  occurrenceStartIso: string
  bound: BoundExecutionItem[]
  unbound: UnboundExecutionItem[]
}

/** Triggers that are NOT scheduled by relative-time binding in this slice. */
const NOT_TIME_BOUND: ReadonlySet<string> = new Set(['after_item', 'external_event'])

/** Deterministically add `minutes` to an ISO instant. Reads no clock (both Dates take an argument). */
function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

/**
 * Bind an Execution snapshot to a concrete Occurrence. For each monitoring item:
 *   - after_item / external_event triggers → unbound (`trigger_not_time_bound`, not scheduled yet);
 *   - otherwise, an item with a numeric `offsetFromStartMinutes` → BOUND: absoluteStart = occurrenceStart +
 *     offset; absoluteDeadline = occurrenceStart + deadlineOffsetMinutes (else absoluteStart +
 *     expectedDurationMinutes, else omitted);
 *   - an item with no usable relative timing (e.g. manual items with no temporal, and legacy plans) → unbound
 *     (`no_temporal`).
 * Pure and deterministic; the snapshot is not mutated.
 */
export function bindOccurrence(
  snapshot: ExecutionSnapshot,
  occurrenceId: string,
  occurrenceStartIso: string,
): OccurrenceBinding {
  const bound: BoundExecutionItem[] = []
  const unbound: UnboundExecutionItem[] = []

  for (const item of snapshot.monitoring.items) {
    if (NOT_TIME_BOUND.has(item.trigger.kind)) {
      unbound.push({ monitoringItemId: item.id, occurrenceId, reason: 'trigger_not_time_bound' })
      continue
    }
    const t = item.temporal
    if (!t || typeof t.offsetFromStartMinutes !== 'number') {
      unbound.push({ monitoringItemId: item.id, occurrenceId, reason: 'no_temporal' })
      continue
    }
    const absoluteStart = addMinutesIso(occurrenceStartIso, t.offsetFromStartMinutes)
    let absoluteDeadline: string | undefined
    if (typeof t.deadlineOffsetMinutes === 'number') {
      absoluteDeadline = addMinutesIso(occurrenceStartIso, t.deadlineOffsetMinutes)
    } else if (typeof t.expectedDurationMinutes === 'number') {
      absoluteDeadline = addMinutesIso(absoluteStart, t.expectedDurationMinutes)
    }
    bound.push({ monitoringItemId: item.id, occurrenceId, relative: t, absoluteStart, absoluteDeadline })
  }

  return { occurrenceId, occurrenceStartIso, bound, unbound }
}

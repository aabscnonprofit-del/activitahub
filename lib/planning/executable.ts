// Executable-plan helpers — compatibility / defaulting for the executable operational structure added by
// Planning Enrichment. Pure functions over EventPlanV2 elements: no I/O, no planning logic, and NOT a new
// Planning output type. Their job is to let downstream readers (future Execution monitoring) see a consistent
// operational shape from BOTH enriched plans and legacy plans / frozen Approved Snapshots produced before the
// enrichment — without any data back-fill.

import type { OperationalTrigger } from './event-plan-v2'

/**
 * The operational activation of a plan item, defaulting legacy items (produced before the executable-structure
 * enrichment, with no `trigger`) to `manual` — so older plans and immutable Approved Snapshots remain
 * monitorable without back-fill. Pure; returns a fresh default so callers never mutate a shared literal.
 */
export function operationalTrigger(item: { trigger?: OperationalTrigger }): OperationalTrigger {
  return item.trigger ?? { kind: 'manual' }
}

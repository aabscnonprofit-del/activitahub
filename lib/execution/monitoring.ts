// Execution Monitoring — Slice 1: the FIRST consumer of the executable Planning metadata.
//
// A PURE, DETERMINISTIC derivation: EventPlanV2 (the single canonical Planning Output) → a flat, ordered
// set of monitoring items — the executable operational units Execution will drive to an outcome. This is the
// operational BRIDGE between Planning and Execution:
//   - it READS Planning (EventPlanV2 + the executable enrichment: id / trigger / temporal / prerequisiteIds /
//     forMomentId), and reuses the Planning compat default (operationalTrigger) so legacy plans still work;
//   - it OWNS nothing on the Planning side and changes nothing there;
//   - it reads NO Occurrence data (no absolute times — timing stays RELATIVE; the Occurrence binds absolute);
//   - it records NO status/outcome (that is a later slice) — but every item has a STABLE id so future
//     execution status can attach to it without any Planning change.
//
// Dependency points DOWN: Execution → Planning (types + the compat resolver only). Planning never imports
// this module.

import type { EventPlanV2, OperationalTrigger, RelativeTiming } from '@/lib/planning/event-plan-v2'
import { operationalTrigger } from '@/lib/planning/executable'

/** Which Planning element a monitoring item was derived from. */
export type MonitoringItemSource = 'itinerary_moment' | 'logistic'

/**
 * One executable operational unit to be monitored during execution — the thing that must reach an explicit
 * outcome. Derived from an ItineraryMoment or a LogisticItem. Presentation is NOT this layer's job; `label`
 * is a plain reference string.
 */
export interface MonitoringItem {
  /** Stable identity future execution outcomes attach to. Uses the plan item's stable id when present;
   *  otherwise a deterministic fallback derived from source + position (legacy, pre-enrichment plans). */
  id: string
  source: MonitoringItemSource
  label: string
  /** Activation concept — always resolved (legacy items default to `manual` via operationalTrigger). */
  trigger: OperationalTrigger
  /** RELATIVE timing (offsets/durations), never absolute — the Occurrence binds absolute times. Optional. */
  temporal?: RelativeTiming
  /** Ids of monitoring items that must precede this one (eligibility). Empty when none. */
  prerequisiteIds: string[]
}

/** The deterministic monitorable operational structure derived from one EventPlanV2. */
export interface ExecutionMonitoringModel {
  items: MonitoringItem[]
}

/**
 * Build the Execution Monitoring model from an EventPlanV2. Pure and deterministic: same plan → same model,
 * no clock, no randomness. Order is fixed: itinerary moments (in plan order) then logistics (in plan order).
 *
 * Metadata consumed:
 *   - id            → the monitoring item's stable identity (fallback for legacy plans without ids).
 *   - trigger       → the item's activation (via operationalTrigger, so legacy items default to `manual`).
 *   - temporal      → the item's RELATIVE timing (moments only; carried through untouched).
 *   - prerequisiteIds → a moment's declared prerequisites.
 *   - forMomentId   → a logistic that serves a moment becomes a PREREQUISITE of that moment (its prep must be
 *                     done before the moment can occur).
 */
export function buildExecutionMonitoringModel(plan: EventPlanV2): ExecutionMonitoringModel {
  const momentIdOf = (m: EventPlanV2['itinerary'][number], i: number): string => m.id ?? `itinerary:#${i}`
  const logisticIdOf = (l: EventPlanV2['logistics'][number], i: number): string => l.id ?? `logistic:#${i}`

  // forMomentId → the serving logistics' ids, so each moment gains its prep logistics as prerequisites.
  const prepByMoment = new Map<string, string[]>()
  plan.logistics.forEach((l, i) => {
    if (!l.forMomentId) return
    const arr = prepByMoment.get(l.forMomentId) ?? []
    arr.push(logisticIdOf(l, i))
    prepByMoment.set(l.forMomentId, arr)
  })

  const items: MonitoringItem[] = []

  plan.itinerary.forEach((m, i) => {
    const id = momentIdOf(m, i)
    items.push({
      id,
      source: 'itinerary_moment',
      label: m.name,
      trigger: operationalTrigger(m),
      temporal: m.temporal,
      prerequisiteIds: [...(m.prerequisiteIds ?? []), ...(prepByMoment.get(id) ?? [])],
    })
  })

  plan.logistics.forEach((l, i) => {
    items.push({
      id: logisticIdOf(l, i),
      source: 'logistic',
      label: l.description,
      trigger: operationalTrigger(l),
      prerequisiteIds: [],
    })
  })

  return { items }
}

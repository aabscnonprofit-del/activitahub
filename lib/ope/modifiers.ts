// OPE modifiers (M2) — transformations applied to a completed one-time plan.
//
// M2 implements only the Recurring modifier (see docs/OPE_M2_IMPLEMENTATION_PLAN.md).
// It runs as a POST-step over the assembled plan, so the one-time pipeline
// (assembly/budget/risk/output/communication) is untouched and one-time output
// stays byte-identical with M1. When scenario.recurrence is null, applyModifiers
// returns the plan unchanged (no fields added).

import type { PlannerOutput, Recurrence, RecurrenceFrequency, Scenario } from './types'

const CADENCE_LABEL: Record<RecurrenceFrequency, string> = {
  weekly: 'Repeats weekly',
  biweekly: 'Repeats every 2 weeks',
  monthly: 'Repeats monthly',
}

/** Add recurring metadata (cadence) + per-session economics to a plan. */
export function applyRecurring(output: PlannerOutput, recurrence: Recurrence): PlannerOutput {
  const sessions = recurrence.sessions ?? null

  output.section_b_your_plan.recurrence = {
    frequency: recurrence.frequency,
    sessions,
    cadence_label: CADENCE_LABEL[recurrence.frequency],
    per_session_reminder: 'Send a reminder about 2 days before each session.',
  }

  // Per-session economics: the base estimate is already per single event. Mark it
  // as per-session, and (only when the session count is known) compute the series
  // total. Pricing itself is not recomputed.
  const c = output.section_c_budget
  if (c.is_priced && c.estimate) {
    c.per_session = true
    c.series_total =
      sessions != null
        ? { low: c.estimate.low * sessions, likely: c.estimate.likely * sessions, high: c.estimate.high * sessions }
        : null
  }

  return output
}

/** Apply any active modifiers. M2: Recurring only. No-op when none are present. */
export function applyModifiers(output: PlannerOutput, scenario: Scenario): PlannerOutput {
  if (scenario.recurrence) return applyRecurring(output, scenario.recurrence)
  return output
}

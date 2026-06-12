import type { SavedPlan } from '@/lib/types'
import { applyBudgetCorrections } from './budget-overlay'
import { requiredResourceKeys } from './prep'

// ── WP5.2 — Readiness layer (workspace, NOT the engine) ──────────────────────
// Pure, deterministic heuristics derived ONLY from a persisted SavedPlan
// (result + input). The OPE engine and generatePlan() are never invoked here —
// readiness is a thin interpretation layer over existing plan output, kept
// isolated so its formulas can evolve without touching the engine or the UI.
//
// Returns i18n KEYS (not translated strings) + interpolation vars; the component
// owns localisation. Every output is a deterministic function of the input plan,
// so the same plan always yields the same readiness (and a recompute that changes
// the plan changes the readiness).

export type RagStatus = 'good' | 'warn' | 'bad'

export interface ReadinessMetric {
  /** i18n key (workspace namespace) for the static label, e.g. 'risksLabel'. */
  labelKey: string
  /** Display value: a literal (count / '—') OR an i18n key when valueIsKey. */
  value: string
  /** When true, `value` must be translated; when false it is shown verbatim. */
  valueIsKey: boolean
  status: RagStatus
}

export interface ReadinessAction {
  /** i18n key (workspace namespace) for the single recommended action. */
  key: string
  /** Optional interpolation vars (e.g. { risk: 'Weather contingency' }). */
  vars?: Record<string, string>
}

export interface Readiness {
  readyPct: number
  readyStatus: RagStatus
  /** Open Risks, Missing Resources, Budget, Staffing — in display order. */
  metrics: ReadinessMetric[]
  /** Exactly one recommended next action. */
  nextAction: ReadinessAction
}

const DASH = '—'
const isHigh = (severity: string) => /high|critical/i.test(severity)

/** Compute the readiness snapshot for a saved plan. Pure + deterministic. */
export function computeReadiness(plan: SavedPlan): Readiness {
  const { result, input } = plan
  const out = result.plan

  // ── Not-ready path: the engine did not produce a plan (clarify / handoff /
  // unsupported). Health is unknowable; the action is to unblock generation.
  if (!out) {
    const nextAction: ReadinessAction =
      result.status === 'needs_clarification'
        ? { key: 'actionAnswerQuestions' }
        : result.status === 'unsupported' || result.status === 'unsupported_modifier'
          ? { key: 'actionUnsupported' }
          : { key: 'actionHandoff' } // needs_human_review / needs_certified_organizer

    return {
      readyPct: 0,
      readyStatus: 'bad',
      metrics: [
        { labelKey: 'risksLabel', value: DASH, valueIsKey: false, status: 'warn' },
        { labelKey: 'resourcesLabel', value: DASH, valueIsKey: false, status: 'warn' },
        { labelKey: 'budgetLabel', value: 'budgetUnknown', valueIsKey: true, status: 'warn' },
        { labelKey: 'staffingLabel', value: DASH, valueIsKey: false, status: 'warn' },
      ],
      nextAction,
    }
  }

  // Preparation progress the organizer has accrued (WP7). Each list is a set of
  // ids already present in the saved plan — readiness simply subtracts them.
  const prep = plan.prep_state ?? {}

  // ── Budget health (overlaid) — computed first; the resource set reads it ────
  const budget = applyBudgetCorrections(out.section_c_budget, plan.corrections)
  let budgetValueKey = 'budgetUnknown'
  let budgetStatus: RagStatus = 'warn'
  if (budget?.is_priced && budget.estimate) {
    const target = input.budget
    if (target == null) {
      // Priced but no target to compare against — an estimate exists, treat as healthy.
      budgetValueKey = 'budgetHealthy'
      budgetStatus = 'good'
    } else if (target >= budget.estimate.likely) {
      budgetValueKey = 'budgetHealthy'
      budgetStatus = 'good'
    } else if (target >= budget.estimate.low) {
      budgetValueKey = 'budgetTight'
      budgetStatus = 'warn'
    } else {
      budgetValueKey = 'budgetOver'
      budgetStatus = 'bad'
    }
  }

  // ── Open Risks (section D) minus the ones marked resolved ───────────────────
  const handledRisks = new Set(prep.risks_handled ?? [])
  const openRisks = (out.section_d_key_risks?.risks ?? []).filter((r) => !handledRisks.has(r.id))
  const riskCount = openRisks.length
  const highRisks = openRisks.filter((r) => isHigh(r.severity))
  const riskStatus: RagStatus = highRisks.length > 0 ? 'bad' : riskCount > 0 ? 'warn' : 'good'

  // ── Missing Resources — required budget lines not yet marked secured ────────
  const sourced = new Set(prep.resources_sourced ?? [])
  const requiredKeys = requiredResourceKeys(budget)
  const resourceKnown = budget?.is_priced === true
  const missingCount = requiredKeys.filter((k) => !sourced.has(k)).length
  const resourceStatus: RagStatus = !resourceKnown
    ? 'warn'
    : missingCount === 0 ? 'good' : missingCount <= 2 ? 'warn' : 'bad'

  // ── Tasks — share of all checklist items the organizer has ticked ───────────
  const tasksDone = new Set(prep.tasks_done ?? [])
  const allTasks = [
    ...(out.section_b_your_plan?.preparation_checklist ?? []),
    ...(out.section_b_your_plan?.day_of_checklist ?? []),
    ...(out.section_b_your_plan?.after_event_checklist ?? []),
  ]
  const doneCount = allTasks.filter((t) => tasksDone.has(t.id)).length
  const taskRatio = allTasks.length ? doneCount / allTasks.length : 1

  // ── Staffing (input-derived; not a prep toggle in v1) ───────────────────────
  const venueMissing = out.section_a_what_you_told_us?.venue_type == null
  const staffingGap = input.instructor === 'need'
  const staffingStatus: RagStatus = staffingGap ? 'bad' : 'good'

  // ── Ready % — composite that MOVES with organizer progress (max 100).
  //   Points: plan 25 · budget 20 · risks 20 · resources 15 · tasks 15 ·
  //   staffing 5. Resources + tasks scale with the secured / ticked share;
  //   risks recover as high-severity ones are resolved. Summed as floats and
  //   rounded ONCE so partial progress isn't lost to per-term rounding.
  const planPts = 25 // a real plan exists
  const budgetPts = budgetStatus === 'good' ? 20 : budgetValueKey === 'budgetTight' ? 12 : budgetValueKey === 'budgetOver' ? 6 : 0
  const riskPts = Math.max(0, 20 - highRisks.length * 8)
  const resourcePts = resourceKnown && requiredKeys.length
    ? (15 * (requiredKeys.length - missingCount)) / requiredKeys.length
    : 15 // unknown/none to secure → no penalty
  const taskPts = 15 * taskRatio
  const staffingPts = staffingGap ? 0 : 5
  const readyPct = Math.max(0, Math.min(100, Math.round(planPts + budgetPts + riskPts + resourcePts + taskPts + staffingPts)))
  const readyStatus: RagStatus = readyPct >= 80 ? 'good' : readyPct >= 60 ? 'warn' : 'bad'

  // ── Next Recommended Action — single, priority-ordered (most blocking first) ─
  let nextAction: ReadinessAction
  if (staffingGap) {
    nextAction = { key: 'actionRecruitInstructor' }
  } else if (venueMissing) {
    nextAction = { key: 'actionConfirmVenue' }
  } else if (highRisks.length > 0) {
    nextAction = { key: 'actionResolveRisk', vars: { risk: highRisks[0].name } }
  } else if (budgetStatus === 'bad' || !budget?.is_priced) {
    nextAction = { key: 'actionReviewBudget' }
  } else if (missingCount > 0) {
    nextAction = { key: 'actionSecureResources' }
  } else if (budgetStatus === 'warn') {
    nextAction = { key: 'actionReviewBudget' }
  } else if (doneCount < allTasks.length) {
    nextAction = { key: 'actionCompleteTasks' }
  } else {
    nextAction = { key: 'actionOnTrack' }
  }

  return {
    readyPct,
    readyStatus,
    metrics: [
      { labelKey: 'risksLabel', value: String(riskCount), valueIsKey: false, status: riskStatus },
      { labelKey: 'resourcesLabel', value: resourceKnown ? String(missingCount) : DASH, valueIsKey: false, status: resourceStatus },
      { labelKey: 'budgetLabel', value: budgetValueKey, valueIsKey: true, status: budgetStatus },
      { labelKey: 'staffingLabel', value: staffingGap ? 'staffingGap' : 'staffingReady', valueIsKey: true, status: staffingStatus },
    ],
    nextAction,
  }
}

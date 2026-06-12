// Risk Engine — OPE Stage 7 (see docs/OPE_MASTER_SPEC.md §11).
//
// Evaluates curated risk definitions against the scenario: applicability
// (always / conditional — outdoor, drop_off_children), then ranks by never_drop
// + severity. Safety items are curated in the modules, never AI-invented.
// Extracted verbatim from engine.ts; logic unchanged.

import type { RiskDef, Scenario } from './types'

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function riskApplies(risk: RiskDef, scenario: Scenario): boolean {
  if (risk.applies_if === 'always' || risk.applies_if == null) return true
  const flags: Record<string, boolean> = {
    drop_off_children: false,
    outdoor: ['public_park', 'backyard_home', 'outdoor'].includes(scenario.venue_type ?? ''),
  }
  return flags[risk.applies_if] === true
}

export interface EvaluatedRisks {
  applicable: RiskDef[]
  excluded: { id: string; applies_if?: string | null }[]
}

/** Filter to applicable risks (sorted) + record the excluded conditional ones. */
export function evaluateRisks(risks: RiskDef[], scenario: Scenario): EvaluatedRisks {
  const applicable = risks.filter((r) => riskApplies(r, scenario))
  const excluded = risks.filter((r) => !riskApplies(r, scenario)).map((r) => ({ id: r.id, applies_if: r.applies_if }))
  applicable.sort(
    (x, y) =>
      (y.never_drop ? 1 : 0) - (x.never_drop ? 1 : 0) ||
      (SEVERITY_RANK[x.severity] ?? 9) - (SEVERITY_RANK[y.severity] ?? 9),
  )
  return { applicable, excluded }
}

import type { BudgetResult } from '@/lib/ope/types'

// ── WP7 — Preparation state helpers (workspace, NOT the engine) ──────────────
// Pure helpers shared by the readiness layer and the interactive prep lenses so
// both agree on what counts. prep_state (OpePlanPrepState) is three id lists —
// tasks_done (checklist item ids), risks_handled (risk ids), resources_sourced
// (budget line item_keys) — persisted current-plan-only via savePrepState(). No
// engine call, no new model: the ids reference items already in the saved plan.

/** Toggle an id in a string-set list; returns a new array (membership flipped). */
export function toggleId(list: string[] | undefined, id: string): string[] {
  const set = new Set(list ?? [])
  if (set.has(id)) set.delete(id)
  else set.add(id)
  return [...set]
}

/**
 * The resources an organizer is expected to secure for this plan: the priced
 * budget's NON-optional line items (optional add-ons are not "missing"). Keyed by
 * item_key, deduped. Single source of truth so the Resource lens and the readiness
 * "Missing Resources" tile count the same set.
 */
export function requiredResourceKeys(budget: BudgetResult | undefined): string[] {
  if (!budget?.is_priced || !budget.breakdown) return []
  return [...new Set(budget.breakdown.filter((l) => !l.optional).map((l) => l.item_key))]
}

import type { BudgetLine, BudgetResult } from '@/lib/ope/types'
import type { OpePlanCorrections } from '@/lib/types'

// ── WP6 — Budget correction overlay (workspace, NOT the engine) ──────────────
// Pure, deterministic re-aggregation of a saved plan's budget after the organizer
// overrides one or more line-item bands. The OPE engine and seed pricing are never
// touched: corrections live ONLY on the saved plan (`corrections.budget_lines`,
// keyed by `item_key`) and are applied here as a current-plan-only overlay.
//
// The arithmetic MIRRORS lib/ope/budget.ts (buildBudget) exactly — same rounding
// (round / round5), the same subtotal → contingency → estimate chain, the same
// monotonic clamp and key-cost-driver ordering — so an overlaid total reconciles
// with what the engine would have produced for those line values. The recurring
// series total is rescaled from the (unchanged) session count.

const round = (n: number) => Math.round(n)
const round5 = (n: number) => Math.round(n / 5) * 5
const BANDS = ['low', 'likely', 'high'] as const

/** True when the corrections object actually overrides at least one budget line. */
export function hasBudgetCorrections(corrections: OpePlanCorrections | undefined): boolean {
  const lines = corrections?.budget_lines
  return !!lines && Object.keys(lines).length > 0
}

/**
 * Apply line-item corrections to a budget and recompute every derived total the
 * same way the cost engine does. Returns a NEW BudgetResult (input untouched).
 * Unpriced budgets, or budgets with no breakdown, are returned unchanged — there
 * is nothing to override. Corrections for item_keys not present in the breakdown
 * are ignored (so they survive an input recompute that drops a line without
 * leaking a stale override).
 */
export function applyBudgetCorrections(
  budget: BudgetResult,
  corrections: OpePlanCorrections | undefined,
): BudgetResult {
  const overrides = corrections?.budget_lines
  if (!budget.is_priced || !budget.estimate || !budget.breakdown || !overrides) return budget
  if (Object.keys(overrides).length === 0) return budget

  // 1. Overlay the corrected bands onto each line (absolute amounts, integer-coerced).
  const breakdown: BudgetLine[] = budget.breakdown.map((b) => {
    const ov = overrides[b.item_key]
    if (!ov) return b
    const line = { ...b.line }
    for (const band of BANDS) {
      const v = ov[band]
      if (typeof v === 'number' && Number.isFinite(v)) line[band] = round(v)
    }
    return { ...b, line }
  })

  // 2. Subtotal + per-category rollup — only bands the line is included_in count.
  const subtotal = { low: 0, likely: 0, high: 0 }
  const rollup: Record<string, { low: number; likely: number; high: number }> = {}
  for (const b of breakdown)
    for (const band of BANDS) {
      if (!b.included_in.includes(band)) continue
      subtotal[band] += b.line[band]
      ;(rollup[b.ucd] ??= { low: 0, likely: 0, high: 0 })[band] += b.line[band]
    }

  // 3. Contingency + estimate — reuse the plan's stored rate (engine default fallback).
  const rate = budget.contingency?.rate_pct ?? { low: 0, likely: 10, high: 15 }
  const contingency: Record<string, number> = {}
  const estimate = { low: 0, likely: 0, high: 0 }
  for (const band of BANDS) {
    contingency[band] = round((subtotal[band] * (rate[band] ?? 0)) / 100)
    estimate[band] = round5(subtotal[band] + contingency[band])
  }
  estimate.likely = Math.max(estimate.likely, estimate.low)
  estimate.high = Math.max(estimate.high, estimate.likely)

  // 4. Key cost drivers — same ordering the engine uses.
  const key_cost_drivers = [...breakdown]
    .sort((a, b) => b.line.likely - a.line.likely || b.line.high - a.line.high)
    .slice(0, 5)
    .map((b) => ({ item_key: b.item_key, likely: b.line.likely, lever: b.lever }))

  // 5. Recurring series total — rescale by the unchanged session count (derived
  //    from the original series/estimate ratio; null when sessions were unknown).
  let series_total = budget.series_total
  if (budget.per_session && budget.series_total && budget.estimate.likely > 0) {
    const sessions = round(budget.series_total.likely / budget.estimate.likely)
    series_total = { low: estimate.low * sessions, likely: estimate.likely * sessions, high: estimate.high * sessions }
  }

  return {
    ...budget,
    breakdown,
    subtotal,
    rollup_by_category: rollup,
    contingency: budget.contingency
      ? { ...budget.contingency, amount: contingency }
      : { rate_pct: rate, amount: contingency, ucd: 'UCD8' },
    estimate,
    key_cost_drivers,
    series_total,
  }
}

// Budget Workspace V1 — derived totals (Phase 5/6).
//
// PURE TypeScript. No store, no Supabase, no UI, no actions. Implements design §7 (recalculation) and
// §8 (organizer fee). Totals are a recomputed projection — never the source of truth. Project Cost =
// Σ effective amounts over ACTIVE, priced lines (estimated/confirmed; 0 counts). Unknown active lines
// are unpriced (counted, not summed). The organizer fee is added AFTER the base; a percentage fee
// recomputes from the current base on every call.

import type { BudgetLine, BudgetTotals, OrganizerFee, VendorQuote } from '@/lib/budget/types'
import { deriveCostState, deriveEffectiveAmount } from '@/lib/budget/cost-state'

/** Persisted line fields needed for totals. A full `BudgetLine` also satisfies this. */
export type LineForTotals = Pick<
  BudgetLine,
  'id' | 'lineStatus' | 'selectedQuoteId' | 'organizerEstimate' | 'projectEstimate'
>

/** The computed numeric totals. `currency` is passthrough metadata (budgets.currency), not computed. */
export type CalculatedTotals = Omit<BudgetTotals, 'currency'>

/**
 * Organizer fee amount (§7/§8): no fee → 0; `flat` → the flat value; `percentage` → round(base × value%)
 * (`value` is a percent, e.g. 15 → 15%). Always derived from the supplied base, so it recomputes when
 * the base changes.
 */
export function calculateOrganizerFeeAmount(baseCost: number, organizerFee: OrganizerFee | null): number {
  if (!organizerFee) return 0
  if (organizerFee.model === 'flat') return organizerFee.value
  return Math.round((baseCost * organizerFee.value) / 100) // percentage of base
}

/**
 * Derived budget totals (§7). `quotes` is all the budget's quotes (grouped here by `lineId`).
 * - Project Cost = Σ effectiveAmount over ACTIVE lines that are priced (estimated/confirmed; 0 adds 0).
 * - Orphaned lines are excluded from active totals (§14.1).
 * - Unknown active lines are counted in `unpricedCount`, never summed; `isComplete = unpricedCount === 0`.
 * - Commercial Total = Project Cost + Organizer Fee (fee after base).
 * `currency` is NOT computed here (it's a passthrough the assembling layer attaches).
 */
export function calculateBudgetTotals(
  lines: LineForTotals[],
  quotes: VendorQuote[],
  organizerFee: OrganizerFee | null,
): CalculatedTotals {
  const byLine = new Map<string, VendorQuote[]>()
  for (const q of quotes) {
    const arr = byLine.get(q.lineId)
    if (arr) arr.push(q)
    else byLine.set(q.lineId, [q])
  }

  let projectBaseCost = 0
  let unpricedCount = 0
  for (const line of lines) {
    if (line.lineStatus !== 'active') continue // orphaned lines excluded from active totals
    const lineQuotes = byLine.get(line.id) ?? []
    if (deriveCostState(line, lineQuotes) === 'unknown') {
      unpricedCount++
      continue
    }
    const amount = deriveEffectiveAmount(line, lineQuotes)
    if (amount !== null) projectBaseCost += amount // estimated/confirmed; 0 contributes 0
  }

  const organizerFeeAmount = calculateOrganizerFeeAmount(projectBaseCost, organizerFee)
  return {
    projectBaseCost,
    unpricedCount,
    isComplete: unpricedCount === 0,
    organizerFeeAmount,
    commercialTotal: projectBaseCost + organizerFeeAmount,
  }
}

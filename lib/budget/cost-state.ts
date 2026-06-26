// Budget Workspace V1 — cost-state & effective-amount derivation (Phase 4).
//
// PURE TypeScript. No store, no Supabase, no UI, no actions. Implements the design §5 (cost states)
// and §7 (effective amount) projections. costState has EXACTLY three values — there is NO `zero` state;
// `effectiveAmount` may be 0 (zero is an amount, not a state). Confirmed overrides any estimate.
//
// `quotes` passed to these functions are THIS line's quotes (budget_vendor_quotes WHERE line_id = id).

import type { BudgetLine, CostState, VendorQuote } from '@/lib/budget/types'

/** Persisted line fields needed to derive pricing state. A full `BudgetLine` also satisfies this. */
export type LinePricingFields = Pick<BudgetLine, 'selectedQuoteId' | 'organizerEstimate' | 'projectEstimate'>

/** The line's selected quote (`quoteStatus === 'selected'`), if any. ≤1 per line by design (§6). */
export function selectedQuoteOf(quotes: VendorQuote[]): VendorQuote | null {
  return quotes.find((q) => q.quoteStatus === 'selected') ?? null
}

/**
 * Derive the line's CostState (§5):
 *   confirmed — a selected VendorQuote exists;
 *   estimated — no selected quote, but an organizer OR project estimate exists (0 counts as an estimate);
 *   unknown   — no selected quote and no estimate.
 */
export function deriveCostState(line: LinePricingFields, quotes: VendorQuote[]): CostState {
  if (selectedQuoteOf(quotes)) return 'confirmed'
  if (line.organizerEstimate !== null || line.projectEstimate !== null) return 'estimated'
  return 'unknown'
}

/**
 * Derive the line's effective amount (§7):
 *   confirmed → the selected quote's `amount` (may be 0);
 *   estimated → `organizerEstimate ?? projectEstimate` (organizer overrides project; 0 preserved);
 *   unknown   → null.
 * Null is returned ONLY when the line is unknown.
 */
export function deriveEffectiveAmount(line: LinePricingFields, quotes: VendorQuote[]): number | null {
  const selected = selectedQuoteOf(quotes)
  if (selected) return selected.amount // real, locked price — may be 0
  return line.organizerEstimate ?? line.projectEstimate // number | null; 0 is preserved
}

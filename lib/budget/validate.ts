// Budget Workspace V1 — pure validation (cross-cutting; design §14, Q3 contract).
//
// PURE TypeScript. No store, no Supabase, no UI, no actions, no Project mutation. Validates Budget
// invariants only — NO committed / booking / payment validation (those are out of Budget scope per
// CONFIRMED_COMMITTED_CONTRACT.md). A `WorkPackage` is never a budget line (BUDGET_INPUT_CONTRACT.md).

import {
  LINE_STATUSES,
  QUOTE_STATUSES,
  SOURCE_ITEM_KINDS,
  type BudgetLine,
  type CommercialProposalSnapshot,
  type SourceComponentRef,
  type VendorQuote,
} from '@/lib/budget/types'

export interface BudgetValidationResult {
  valid: boolean
  errors: string[]
}

const ok = (): BudgetValidationResult => ({ valid: true, errors: [] })
const result = (errors: string[]): BudgetValidationResult => (errors.length ? { valid: false, errors } : ok())
const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0

/**
 * A `SourceComponentRef` must reference a delivery component: `itemKind` ∈ { resource_need, role_need }
 * ONLY — a WorkPackage (`work_package`) is a planning container and is INVALID here.
 */
export function validateSourceComponentRef(ref: SourceComponentRef): BudgetValidationResult {
  const errors: string[] = []
  if (!nonEmpty(ref.projectId)) errors.push('sourceComponentRef.projectId is required')
  if (typeof ref.projectVersion !== 'number' || !Number.isInteger(ref.projectVersion)) {
    errors.push('sourceComponentRef.projectVersion must be an integer')
  }
  if (!(SOURCE_ITEM_KINDS as readonly string[]).includes(ref.itemKind)) {
    errors.push(`sourceComponentRef.itemKind must be one of ${SOURCE_ITEM_KINDS.join(' | ')} (a WorkPackage is not a budget line)`)
  }
  if (!nonEmpty(ref.itemId)) errors.push('sourceComponentRef.itemId is required')
  return result(errors)
}

/**
 * A VendorQuote's identity must match its source (Q3 contract):
 *   marketplace → requires `vendorRef` AND `marketplaceResultRef`;
 *   manual      → requires `vendorRef` OR `vendorLabel`.
 * `amount` must be a finite number (may be 0). `quoteStatus` must be a known status.
 */
export function validateVendorQuote(quote: VendorQuote): BudgetValidationResult {
  const errors: string[] = []
  if (!(QUOTE_STATUSES as readonly string[]).includes(quote.quoteStatus)) errors.push('quoteStatus is invalid')
  if (typeof quote.amount !== 'number' || !Number.isFinite(quote.amount)) errors.push('amount must be a finite number')
  if (quote.source === 'marketplace') {
    if (!nonEmpty(quote.vendorRef)) errors.push('marketplace quote requires vendorRef')
    if (!nonEmpty(quote.marketplaceResultRef)) errors.push('marketplace quote requires marketplaceResultRef')
  } else if (quote.source === 'manual') {
    if (!nonEmpty(quote.vendorRef) && !nonEmpty(quote.vendorLabel)) {
      errors.push('manual quote requires vendorRef or vendorLabel')
    }
  } else {
    errors.push('source must be marketplace or manual')
  }
  return result(errors)
}

/**
 * The line's `selectedQuoteId` must be consistent with its quotes (§14.3):
 *   - at most one quote may have `quoteStatus = selected`;
 *   - if `selectedQuoteId` is set, that quote must exist, belong to THIS line, and be `selected`.
 * `quotes` are this line's quotes.
 */
export function validateSelectedQuoteConsistency(
  line: Pick<BudgetLine, 'id' | 'selectedQuoteId'>,
  quotes: VendorQuote[],
): BudgetValidationResult {
  const errors: string[] = []
  if (quotes.filter((q) => q.quoteStatus === 'selected').length > 1) {
    errors.push('at most one selected quote per line')
  }
  if (line.selectedQuoteId !== null) {
    const target = quotes.find((q) => q.id === line.selectedQuoteId)
    if (!target) {
      errors.push('selectedQuoteId does not point to a known quote')
    } else {
      if (target.lineId !== line.id) errors.push('selected quote does not belong to this line')
      if (target.quoteStatus !== 'selected') errors.push('selectedQuoteId target must have quoteStatus = selected')
    }
  }
  return result(errors)
}

/**
 * A BudgetLine itself is valid when it references a valid delivery component, has a label, and a known
 * line status. (Selected-quote consistency is a separate check — it needs the line's quotes.)
 */
export function validateBudgetLine(
  line: Pick<BudgetLine, 'sourceComponentRef' | 'label' | 'lineStatus'>,
): BudgetValidationResult {
  const errors: string[] = []
  const ref = validateSourceComponentRef(line.sourceComponentRef)
  if (!ref.valid) errors.push(...ref.errors)
  if (!nonEmpty(line.label)) errors.push('label is required')
  if (!(LINE_STATUSES as readonly string[]).includes(line.lineStatus)) errors.push('lineStatus is invalid')
  return result(errors)
}

/**
 * A CommercialProposal snapshot must be structurally coherent (§7/§14.5/§14.7): a currency, an array of
 * lines, finite numeric totals, `commercialTotal === projectBaseCost + organizerFee.computedAmount`
 * (fee after base), and `isComplete === (unpricedCount === 0)`. Pure read — never mutates the snapshot
 * (it is immutable once created). No committed/booking/payment fields are validated.
 */
export function validateCommercialProposalSnapshot(snapshot: CommercialProposalSnapshot): BudgetValidationResult {
  const errors: string[] = []
  if (!nonEmpty(snapshot.currency)) errors.push('snapshot.currency is required')
  if (!Array.isArray(snapshot.lines)) errors.push('snapshot.lines must be an array')
  const finite = (n: number): boolean => typeof n === 'number' && Number.isFinite(n)
  if (!finite(snapshot.projectBaseCost)) errors.push('snapshot.projectBaseCost must be a finite number')
  if (!finite(snapshot.commercialTotal)) errors.push('snapshot.commercialTotal must be a finite number')
  if (!Number.isInteger(snapshot.unpricedCount) || snapshot.unpricedCount < 0) {
    errors.push('snapshot.unpricedCount must be a non-negative integer')
  }
  if (typeof snapshot.isComplete !== 'boolean') errors.push('snapshot.isComplete must be a boolean')

  const feeAmount = snapshot.organizerFee?.computedAmount ?? 0
  if (finite(snapshot.projectBaseCost) && finite(snapshot.commercialTotal) && finite(feeAmount)) {
    if (snapshot.commercialTotal !== snapshot.projectBaseCost + feeAmount) {
      errors.push('commercialTotal must equal projectBaseCost + organizerFee.computedAmount')
    }
  }
  if (typeof snapshot.isComplete === 'boolean' && Number.isInteger(snapshot.unpricedCount)) {
    if (snapshot.isComplete !== (snapshot.unpricedCount === 0)) {
      errors.push('isComplete must equal (unpricedCount === 0)')
    }
  }
  return result(errors)
}

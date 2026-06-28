'use server'

// Budget Workspace V1 — server actions (orchestration only).
//
// Thin layer: authenticate → VALIDATE (lib/budget/validate.ts) → PERSIST (lib/budget/store.ts) →
// re-read → DERIVE cost state (lib/budget/cost-state.ts) + totals (lib/budget/totals.ts) → return a
// typed result. NO business logic lives here (derivation/validation/totals are in lib/budget/*); the
// only glue is snake_case row → camelCase domain mapping. NEVER mutates the Project. Does NOT implement
// committed / booking / payment, Marketplace acceptance, or proposal sending. RLS (owner-only via
// projects.owner_id, migration 042) enforces ownership; auth.getUser() gates sign-in like planner.ts.

import { createClient } from '@/lib/supabase/server'
import {
  addVendorQuote,
  createBudgetForProject,
  createBudgetLine,
  createCommercialProposalSnapshot,
  getBudget,
  listBudgetLines,
  listVendorQuotesForLines,
  selectVendorQuote,
  setOrganizerFee,
  updateBudgetLineEstimate,
  type BudgetLineRow,
  type BudgetRow,
  type CommercialProposalRow,
  type VendorQuoteRow,
} from '@/lib/budget/store'
import { deriveCostState, deriveEffectiveAmount } from '@/lib/budget/cost-state'
import { deliveryComponentLineSpecs, type ProjectDeliveryComponents } from '@/lib/budget/mirror'
import { listProjectDeliveryComponents } from '@/lib/projects/store'
import { calculateBudgetTotals } from '@/lib/budget/totals'
import {
  validateBudgetLine,
  validateCommercialProposalSnapshot,
  validateSelectedQuoteConsistency,
  validateVendorQuote,
} from '@/lib/budget/validate'
import type {
  Budget,
  BudgetLine,
  BudgetTotals,
  CommercialProposalSnapshot,
  FeeModel,
  OrganizerFee,
  SourceComponentRef,
  VendorQuote,
} from '@/lib/budget/types'
import type { QuoteBasis, QuoteStatus } from '@/lib/budget/types'

// ── Result types ─────────────────────────────────────────────────────────────────────────────

export type BudgetActionError =
  | 'sign_in_required'
  | 'invalid_input'
  | 'validation_failed'
  | 'not_found'
  | 'persist_failed'
  | 'selection_inconsistent'

export type BudgetActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: BudgetActionError; details?: string[] }

/** A budget assembled with derived per-line cost state + derived totals (no proposals — lean view). */
export interface AssembledBudget {
  budget: Omit<Budget, 'lines' | 'totals' | 'proposals'>
  lines: BudgetLine[]
  totals: BudgetTotals
}

const fail = (error: BudgetActionError, details?: string[]): { ok: false; error: BudgetActionError; details?: string[] } =>
  details ? { ok: false, error, details } : { ok: false, error }
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const isNonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0

// ── Row → domain mappers (glue only — no business logic) ────────────────────────────────────────

function toVendorQuote(row: VendorQuoteRow): VendorQuote {
  const base = {
    id: row.id,
    lineId: row.line_id,
    amount: row.amount,
    basis: row.basis,
    inclusions: row.inclusions,
    note: row.note,
    validUntil: row.valid_until,
    quoteStatus: row.quote_status,
    receivedAt: row.received_at,
  }
  if (row.source === 'marketplace') {
    return {
      ...base,
      source: 'marketplace',
      vendorRef: row.vendor_ref ?? '', // '' if missing → validateVendorQuote flags it
      marketplaceResultRef: row.marketplace_result_ref ?? '',
      vendorLabel: null,
    }
  }
  return {
    ...base,
    source: 'manual',
    vendorRef: row.vendor_ref,
    vendorLabel: row.vendor_label,
    marketplaceResultRef: null,
  }
}

/** Persisted line fields (without the derived quotes/costState/effectiveAmount). */
type PersistedLine = Omit<BudgetLine, 'quotes' | 'costState' | 'effectiveAmount'>

function toPersistedLine(row: BudgetLineRow): PersistedLine {
  return {
    id: row.id,
    budgetId: row.budget_id,
    sourceComponentRef: {
      projectId: row.source_project_id,
      projectVersion: row.source_project_version,
      itemKind: row.source_item_kind,
      itemId: row.source_item_id,
    },
    label: row.label,
    projectEstimate: row.project_estimate,
    organizerEstimate: row.organizer_estimate,
    selectedQuoteId: row.selected_quote_id,
    lineStatus: row.line_status,
    note: row.note,
  }
}

function feeForCalc(row: BudgetRow): OrganizerFee | null {
  if (row.fee_model === null || row.fee_value === null) return null
  // computedAmount is recomputed by totals (calculateOrganizerFeeAmount reads only model+value).
  return { model: row.fee_model, value: row.fee_value, computedAmount: 0 }
}

// ── Assembly (re-read → derive cost state + totals) ─────────────────────────────────────────────

async function assembleBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  budgetId: string,
): Promise<AssembledBudget | null> {
  const budgetRow = await getBudget(supabase, budgetId)
  if (!budgetRow) return null

  const lineRows = await listBudgetLines(supabase, budgetId)
  const quoteRows = await listVendorQuotesForLines(supabase, lineRows.map((l) => l.id))
  const quotes = quoteRows.map(toVendorQuote)

  const lines: BudgetLine[] = lineRows.map((row) => {
    const persisted = toPersistedLine(row)
    const lineQuotes = quotes.filter((q) => q.lineId === row.id)
    return {
      ...persisted,
      quotes: lineQuotes,
      costState: deriveCostState(persisted, lineQuotes),
      effectiveAmount: deriveEffectiveAmount(persisted, lineQuotes),
    }
  })

  const fee = feeForCalc(budgetRow)
  const totalsCore = calculateBudgetTotals(lines, quotes, fee)
  const totals: BudgetTotals = { ...totalsCore, currency: budgetRow.currency }
  const organizerFee: OrganizerFee | null = fee
    ? { model: fee.model, value: fee.value, computedAmount: totals.organizerFeeAmount }
    : null

  return {
    budget: {
      id: budgetRow.id,
      projectRef: { projectId: budgetRow.project_id, projectVersion: budgetRow.project_version },
      currency: budgetRow.currency,
      organizerFee,
      status: budgetRow.status,
      createdAt: budgetRow.created_at,
      updatedAt: budgetRow.updated_at,
    },
    lines,
    totals,
  }
}

/** Common tail: re-read + derive + return the assembled budget (or not_found). */
async function assembledResult(
  supabase: Awaited<ReturnType<typeof createClient>>,
  budgetId: string,
): Promise<BudgetActionResult<AssembledBudget>> {
  const assembled = await assembleBudget(supabase, budgetId)
  return assembled ? { ok: true, data: assembled } : fail('not_found')
}

// ── Actions ──────────────────────────────────────────────────────────────────────────────────

/** Open a Budget for a (plannable) Project. */
export async function createBudgetForProjectAction(input: {
  projectId: string
  projectVersion: number
  currency: string
  // Open-from-Project mirroring (design Phase 2): the Project's delivery components, mirrored 1:1 into
  // Budget Lines on creation. Optional + backward-compatible — omitted/empty ⇒ a budget with no lines.
  deliveryComponents?: ProjectDeliveryComponents
}): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.projectId) || !Number.isInteger(input.projectVersion) || !isNonEmpty(input.currency)) {
    return fail('invalid_input')
  }
  const row = await createBudgetForProject(supabase, {
    projectId: input.projectId,
    projectVersion: input.projectVersion,
    currency: input.currency,
  })
  if (!row) return fail('persist_failed')

  // Mirror the Project's delivery components (resource_need / role_need only) into Budget Lines.
  // Components are loaded from the persisted Project delivery components (migration 043); the UI does
  // NOT pass them manually. An explicit `deliveryComponents` override is honored when provided.
  let components: ProjectDeliveryComponents
  if (input.deliveryComponents) {
    components = input.deliveryComponents
  } else {
    const rows = await listProjectDeliveryComponents(supabase, input.projectId, input.projectVersion)
    components = {
      resourceNeeds: rows
        .filter((r) => r.item_kind === 'resource_need')
        .map((r) => ({ id: r.item_id, kind: r.label })),
      roleNeeds: rows
        .filter((r) => r.item_kind === 'role_need')
        .map((r) => ({ id: r.item_id, role: r.label })),
    }
  }
  const specs = deliveryComponentLineSpecs(
    { projectId: input.projectId, projectVersion: input.projectVersion },
    components,
  )
  for (const spec of specs) {
    const v = validateBudgetLine({ sourceComponentRef: spec.sourceComponentRef, label: spec.label, lineStatus: 'active' })
    if (!v.valid) return fail('validation_failed', v.errors)
    const lineRow = await createBudgetLine(supabase, {
      budgetId: row.id,
      sourceComponentRef: spec.sourceComponentRef,
      label: spec.label,
    })
    if (!lineRow) return fail('persist_failed')
  }

  return assembledResult(supabase, row.id)
}

/** Create a Budget line for a delivery component (resource_need / role_need only; never a WorkPackage). */
export async function createBudgetLineAction(input: {
  budgetId: string
  sourceComponentRef: SourceComponentRef
  label: string
  projectEstimate?: number | null
  note?: string | null
}): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.budgetId)) return fail('invalid_input')
  // Validate the line (source-component kind, label, status) BEFORE persistence (lines start `active`).
  const v = validateBudgetLine({
    sourceComponentRef: input.sourceComponentRef,
    label: input.label,
    lineStatus: 'active',
  })
  if (!v.valid) return fail('validation_failed', v.errors)

  const row = await createBudgetLine(supabase, {
    budgetId: input.budgetId,
    sourceComponentRef: input.sourceComponentRef,
    label: input.label,
    projectEstimate: input.projectEstimate,
    note: input.note,
  })
  if (!row) return fail('persist_failed')
  return assembledResult(supabase, row.budget_id)
}

/** Set/clear the budget-owned organizer estimate on a line (may be 0; null clears). */
export async function updateBudgetLineEstimateAction(input: {
  lineId: string
  organizerEstimate: number | null
}): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.lineId)) return fail('invalid_input')
  if (input.organizerEstimate !== null && !isNum(input.organizerEstimate)) return fail('invalid_input')

  const row = await updateBudgetLineEstimate(supabase, input.lineId, input.organizerEstimate)
  if (!row) return fail('persist_failed')
  return assembledResult(supabase, row.budget_id)
}

/** Add a VendorQuote to a line (budget_vendor_quotes). Validates source-appropriate vendor identity. */
export async function addVendorQuoteAction(input: {
  budgetId: string
  lineId: string
  source: 'marketplace' | 'manual'
  amount: number
  basis: QuoteBasis
  quoteStatus: QuoteStatus
  vendorRef?: string | null
  vendorLabel?: string | null
  marketplaceResultRef?: string | null
  inclusions?: string | null
  note?: string | null
  validUntil?: string | null
}): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.budgetId) || !isNonEmpty(input.lineId) || !isNum(input.amount)) return fail('invalid_input')

  // Build the prospective VendorQuote and validate vendor-identity rules BEFORE persistence.
  const candidate: VendorQuote =
    input.source === 'marketplace'
      ? {
          id: '',
          lineId: input.lineId,
          source: 'marketplace',
          vendorRef: input.vendorRef ?? '',
          marketplaceResultRef: input.marketplaceResultRef ?? '',
          vendorLabel: null,
          amount: input.amount,
          basis: input.basis,
          inclusions: input.inclusions ?? null,
          note: input.note ?? null,
          validUntil: input.validUntil ?? null,
          quoteStatus: input.quoteStatus,
          receivedAt: '',
        }
      : {
          id: '',
          lineId: input.lineId,
          source: 'manual',
          vendorRef: input.vendorRef ?? null,
          vendorLabel: input.vendorLabel ?? null,
          marketplaceResultRef: null,
          amount: input.amount,
          basis: input.basis,
          inclusions: input.inclusions ?? null,
          note: input.note ?? null,
          validUntil: input.validUntil ?? null,
          quoteStatus: input.quoteStatus,
          receivedAt: '',
        }
  const v = validateVendorQuote(candidate)
  if (!v.valid) return fail('validation_failed', v.errors)

  const row = await addVendorQuote(supabase, {
    lineId: input.lineId,
    source: input.source,
    amount: input.amount,
    basis: input.basis,
    quoteStatus: input.quoteStatus,
    vendorRef: input.vendorRef,
    vendorLabel: input.vendorLabel,
    marketplaceResultRef: input.marketplaceResultRef,
    inclusions: input.inclusions,
    note: input.note,
    validUntil: input.validUntil,
  })
  if (!row) return fail('persist_failed')
  return assembledResult(supabase, input.budgetId)
}

/**
 * Select a quote for a line — the COMMERCIAL decision (Budget `confirmed`, NOT committed; no booking/
 * payment). After persisting, re-checks selected-quote consistency (the store's select is non-atomic);
 * a disagreement is surfaced as `selection_inconsistent` so the caller can retry.
 */
export async function selectVendorQuoteAction(input: {
  budgetId: string
  lineId: string
  quoteId: string
}): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.budgetId) || !isNonEmpty(input.lineId) || !isNonEmpty(input.quoteId)) {
    return fail('invalid_input')
  }
  const line = await selectVendorQuote(supabase, input.lineId, input.quoteId)
  if (!line) return fail('persist_failed')

  // Verify the write left the line consistent (selectedQuoteId ⇄ the selected-status quote, same line).
  const quoteRows = await listVendorQuotesForLines(supabase, [input.lineId])
  const consistency = validateSelectedQuoteConsistency(
    { id: line.id, selectedQuoteId: line.selected_quote_id },
    quoteRows.map(toVendorQuote),
  )
  if (!consistency.valid) return fail('selection_inconsistent', consistency.errors)

  return assembledResult(supabase, input.budgetId)
}

/** Set the organizer fee (flat or percentage). Fee is applied AFTER base; totals recompute. */
export async function setOrganizerFeeAction(input: {
  budgetId: string
  model: FeeModel
  value: number
}): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.budgetId) || (input.model !== 'flat' && input.model !== 'percentage') || !isNum(input.value)) {
    return fail('invalid_input')
  }
  const row = await setOrganizerFee(supabase, input.budgetId, { model: input.model, value: input.value })
  if (!row) return fail('persist_failed')
  return assembledResult(supabase, input.budgetId)
}

/**
 * Create an immutable CommercialProposal DRAFT snapshot from the budget's current derived state.
 * Builds the snapshot (active lines only), validates it, then persists it insert-only. Does NOT send
 * the proposal (sending is out of scope).
 */
export async function createCommercialProposalSnapshotAction(input: {
  budgetId: string
}): Promise<BudgetActionResult<{ proposal: CommercialProposalRow; budget: AssembledBudget }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.budgetId)) return fail('invalid_input')
  const assembled = await assembleBudget(supabase, input.budgetId)
  if (!assembled) return fail('not_found')

  const snapshot: CommercialProposalSnapshot = {
    currency: assembled.budget.currency,
    lines: assembled.lines
      .filter((l) => l.lineStatus === 'active')
      .map((l) => {
        const selected = l.quotes.find((q) => q.quoteStatus === 'selected')
        return {
          label: l.label,
          sourceComponentRef: l.sourceComponentRef,
          costState: l.costState,
          effectiveAmount: l.effectiveAmount,
          selectedQuote:
            l.costState === 'confirmed' && selected
              ? { vendorRef: selected.vendorRef ?? null, amount: selected.amount }
              : null,
        }
      }),
    projectBaseCost: assembled.totals.projectBaseCost,
    organizerFee: assembled.budget.organizerFee
      ? {
          model: assembled.budget.organizerFee.model,
          value: assembled.budget.organizerFee.value,
          computedAmount: assembled.budget.organizerFee.computedAmount,
        }
      : null,
    commercialTotal: assembled.totals.commercialTotal,
    unpricedCount: assembled.totals.unpricedCount,
    isComplete: assembled.totals.isComplete,
  }

  const v = validateCommercialProposalSnapshot(snapshot)
  if (!v.valid) return fail('validation_failed', v.errors)

  const proposal = await createCommercialProposalSnapshot(supabase, {
    budgetId: input.budgetId,
    projectRef: assembled.budget.projectRef,
    snapshot,
  })
  if (!proposal) return fail('persist_failed')
  return { ok: true, data: { proposal, budget: assembled } }
}

/** Read a Budget assembled with derived per-line cost state + derived totals. */
export async function getBudgetAction(input: { budgetId: string }): Promise<BudgetActionResult<AssembledBudget>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('sign_in_required')

  if (!isNonEmpty(input.budgetId)) return fail('invalid_input')
  return assembledResult(supabase, input.budgetId)
}

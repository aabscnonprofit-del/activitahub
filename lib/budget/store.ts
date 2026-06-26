// Budget Workspace V1 — persistence layer (Phase 2/3 of docs/BUDGET_WORKSPACE_IMPLEMENTATION_PLAN.md).
//
// Plain server helpers over the RLS-owner-only Budget tables (migration 042):
//   budgets · budget_lines · budget_vendor_quotes · commercial_proposals.
// Mirrors lib/projects/store.ts: callers pass their own RLS-scoped supabase client so every read/write
// is owner-restricted (ownership derives through projects.owner_id — see 042 RLS). NO UI, NO React,
// NO server actions, NO API routes, NO schema changes, NO new architecture.
//
// PERSISTENCE ONLY — this layer returns raw DB rows (snake_case). It does NOT derive `costState` /
// `effectiveAmount` / totals (those are TypeScript projections computed in later-phase services per
// design §5/§7) and it does NOT validate cross-row/business invariants (e.g. vendor_ref-required-for-
// marketplace, source-component resolvability) — those live in lib/budget/validate.ts (a later phase).
//
// The Budget is an OVERLAY: it REFERENCES the canonical Project (read-only) and NEVER writes Project
// scope. Budget quotes live in `budget_vendor_quotes` — NOT the unrelated `vendor_quotes` table from
// migration 030 (Vendor Sourcing).

import type { createClient } from '@/lib/supabase/server'
import type {
  BudgetStatus,
  CommercialProposalSnapshot,
  FeeModel,
  LineStatus,
  ProposalStatus,
  QuoteSource,
  QuoteStatus,
  SourceComponentRef,
  SourceItemKind,
  QuoteBasis,
} from '@/lib/budget/types'

type ServerClient = Awaited<ReturnType<typeof createClient>>

// ── Row shapes (persisted columns, 042) ──────────────────────────────────────────────────────

export interface BudgetRow {
  id: string
  project_id: string
  project_version: number
  currency: string
  fee_model: FeeModel | null
  fee_value: number | null
  status: BudgetStatus
  created_at: string
  updated_at: string
}

export interface BudgetLineRow {
  id: string
  budget_id: string
  source_project_id: string
  source_project_version: number
  source_item_kind: SourceItemKind
  source_item_id: string
  label: string
  project_estimate: number | null
  organizer_estimate: number | null
  selected_quote_id: string | null
  line_status: LineStatus
  note: string | null
}

export interface VendorQuoteRow {
  id: string
  line_id: string
  vendor_ref: string | null
  vendor_label: string | null
  source: QuoteSource
  marketplace_result_ref: string | null
  amount: number
  basis: QuoteBasis
  inclusions: string | null
  note: string | null
  valid_until: string | null
  quote_status: QuoteStatus
  received_at: string
}

export interface CommercialProposalRow {
  id: string
  budget_id: string
  version: number
  project_id: string
  project_version: number
  snapshot: CommercialProposalSnapshot
  status: ProposalStatus
  tax: number | null
  platform_fee: number | null
  discount: number | null
  issued_at: string
  sent_at: string | null
}

const BUDGET_COLS = 'id, project_id, project_version, currency, fee_model, fee_value, status, created_at, updated_at'
const LINE_COLS =
  'id, budget_id, source_project_id, source_project_version, source_item_kind, source_item_id, label, project_estimate, organizer_estimate, selected_quote_id, line_status, note'
const QUOTE_COLS =
  'id, line_id, vendor_ref, vendor_label, source, marketplace_result_ref, amount, basis, inclusions, note, valid_until, quote_status, received_at'
const PROPOSAL_COLS =
  'id, budget_id, version, project_id, project_version, snapshot, status, tax, platform_fee, discount, issued_at, sent_at'

// ── 1. Budget root ───────────────────────────────────────────────────────────────────────────

/**
 * Open a Budget for a (plannable) Project. `status` defaults to `open`; no organizer fee is set yet
 * (fee_model/fee_value stay null). `currency` is the single-currency seed (V1). Returns null on error.
 */
export async function createBudgetForProject(
  supabase: ServerClient,
  args: { projectId: string; projectVersion: number; currency: string },
): Promise<BudgetRow | null> {
  const { data } = await supabase
    .from('budgets')
    .insert({
      project_id: args.projectId,
      project_version: args.projectVersion,
      currency: args.currency,
    })
    .select(BUDGET_COLS)
    .single()
  return (data as BudgetRow) ?? null
}

/** Load one Budget (RLS restricts to the Project owner). */
export async function getBudget(supabase: ServerClient, budgetId: string): Promise<BudgetRow | null> {
  const { data } = await supabase.from('budgets').select(BUDGET_COLS).eq('id', budgetId).single()
  return (data as BudgetRow) ?? null
}

/** List Budgets for a Project, newest-edited first. */
export async function listBudgetsForProject(supabase: ServerClient, projectId: string): Promise<BudgetRow[]> {
  const { data } = await supabase
    .from('budgets')
    .select(BUDGET_COLS)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
  return (data as BudgetRow[]) ?? []
}

// ── 2. Budget lines ────────────────────────────────────────────────────────────────────────────

/**
 * Create a Budget line that prices ONE delivery component of the Project. The line MUST reference a
 * `SourceComponentRef`; `itemKind` is typed `SourceItemKind` = `resource_need` | `role_need` only —
 * a WorkPackage (`work_package`) is a container and can NEVER be a Budget line (compile-time enforced).
 * `line_status` defaults to `active`; no estimate/quotes at creation (so the line is `unknown` until
 * priced — derived later). Budget never writes Project scope. Returns null on error.
 */
export async function createBudgetLine(
  supabase: ServerClient,
  args: {
    budgetId: string
    sourceComponentRef: SourceComponentRef
    label: string
    projectEstimate?: number | null
    note?: string | null
  },
): Promise<BudgetLineRow | null> {
  const { sourceComponentRef: ref } = args
  const { data } = await supabase
    .from('budget_lines')
    .insert({
      budget_id: args.budgetId,
      source_project_id: ref.projectId,
      source_project_version: ref.projectVersion,
      source_item_kind: ref.itemKind,
      source_item_id: ref.itemId,
      label: args.label,
      ...(args.projectEstimate !== undefined ? { project_estimate: args.projectEstimate } : {}),
      ...(args.note !== undefined ? { note: args.note } : {}),
    })
    .select(LINE_COLS)
    .single()
  return (data as BudgetLineRow) ?? null
}

/**
 * Set/clear the budget-owned `organizer_estimate` on a line (pricing, not scope). The value may be 0
 * (zero is an amount, not a state) or null to clear. The line's `costState`/`effectiveAmount` are
 * derived from this + the selected quote elsewhere — never stored. Returns null on error.
 */
export async function updateBudgetLineEstimate(
  supabase: ServerClient,
  lineId: string,
  organizerEstimate: number | null,
): Promise<BudgetLineRow | null> {
  const { data } = await supabase
    .from('budget_lines')
    .update({ organizer_estimate: organizerEstimate })
    .eq('id', lineId)
    .select(LINE_COLS)
    .single()
  return (data as BudgetLineRow) ?? null
}

// ── 3. Vendor quotes (budget_vendor_quotes) ─────────────────────────────────────────────────────

/**
 * Add a VendorQuote to a line (table `budget_vendor_quotes`). `amount` may be 0. The caller supplies
 * `source` + `quote_status` and the source-appropriate identity fields (marketplace → `vendorRef`
 * [+ `marketplaceResultRef`]; manual → `vendorRef` or `vendorLabel`). Vendor-identity validation
 * (vendor_ref-required-for-marketplace, etc.) is a higher-layer concern (validate.ts), not persistence.
 * `received_at` defaults to NOW() when omitted. Returns null on error.
 */
export async function addVendorQuote(
  supabase: ServerClient,
  args: {
    lineId: string
    source: QuoteSource
    amount: number
    basis: QuoteBasis
    quoteStatus: QuoteStatus
    vendorRef?: string | null
    vendorLabel?: string | null
    marketplaceResultRef?: string | null
    inclusions?: string | null
    note?: string | null
    validUntil?: string | null
  },
): Promise<VendorQuoteRow | null> {
  const { data } = await supabase
    .from('budget_vendor_quotes')
    .insert({
      line_id: args.lineId,
      source: args.source,
      amount: args.amount,
      basis: args.basis,
      quote_status: args.quoteStatus,
      ...(args.vendorRef !== undefined ? { vendor_ref: args.vendorRef } : {}),
      ...(args.vendorLabel !== undefined ? { vendor_label: args.vendorLabel } : {}),
      ...(args.marketplaceResultRef !== undefined ? { marketplace_result_ref: args.marketplaceResultRef } : {}),
      ...(args.inclusions !== undefined ? { inclusions: args.inclusions } : {}),
      ...(args.note !== undefined ? { note: args.note } : {}),
      ...(args.validUntil !== undefined ? { valid_until: args.validUntil } : {}),
    })
    .select(QUOTE_COLS)
    .single()
  return (data as VendorQuoteRow) ?? null
}

/**
 * Select a quote for a line — the COMMERCIAL decision (Budget `confirmed`, NOT `committed`: this never
 * authorizes spend, books, or pays — see CONFIRMED_COMMITTED_CONTRACT.md). Enforces ≤1 selected per
 * line: demote any currently-selected quote to `received`, promote the chosen quote to `selected`, then
 * point `budget_lines.selected_quote_id` at it. The 042 partial unique index guarantees the ≤1-selected
 * invariant. NOTE: PostgREST has no cross-call transaction, so these run sequentially (demote→promote→
 * link); ordering keeps the unique index satisfied. Returns the updated line, or null on error.
 */
export async function selectVendorQuote(
  supabase: ServerClient,
  lineId: string,
  quoteId: string,
): Promise<BudgetLineRow | null> {
  // 1. Demote the previously-selected quote on this line (if any) back to `received`.
  const demote = await supabase
    .from('budget_vendor_quotes')
    .update({ quote_status: 'received' })
    .eq('line_id', lineId)
    .eq('quote_status', 'selected')
  if (demote.error) return null
  // 2. Promote the chosen quote to `selected` (must belong to this line).
  const promote = await supabase
    .from('budget_vendor_quotes')
    .update({ quote_status: 'selected' })
    .eq('id', quoteId)
    .eq('line_id', lineId)
    .select('id')
    .single()
  if (promote.error || !promote.data) return null
  // 3. Point the line at the selected quote (fast-read mirror; must agree — validation §14.3).
  const { data } = await supabase
    .from('budget_lines')
    .update({ selected_quote_id: quoteId })
    .eq('id', lineId)
    .select(LINE_COLS)
    .single()
  return (data as BudgetLineRow) ?? null
}

// ── 4. Organizer fee ─────────────────────────────────────────────────────────────────────────

/**
 * Set the organizer fee on a Budget (flat or percentage). Applied AFTER the base cost; the fee's
 * `computedAmount` and the commercial total are derived elsewhere (not stored). Returns null on error.
 */
export async function setOrganizerFee(
  supabase: ServerClient,
  budgetId: string,
  fee: { model: FeeModel; value: number },
): Promise<BudgetRow | null> {
  const { data } = await supabase
    .from('budgets')
    .update({ fee_model: fee.model, fee_value: fee.value })
    .eq('id', budgetId)
    .select(BUDGET_COLS)
    .single()
  return (data as BudgetRow) ?? null
}

// ── 5. Commercial proposals (immutable snapshots) ───────────────────────────────────────────────

/**
 * Create an immutable CommercialProposal snapshot for a Budget. The snapshot is INSERT-ONLY and never
 * updated (immutable once created — design §10/§14.6); this store exposes no snapshot update. `version`
 * is monotonic from 1 per budget: computed as max(existing)+1, with the 042 unique index `(budget_id,
 * version)` rejecting races. `status` defaults to `draft`; reserved tax/platform_fee/discount stay null
 * (V1). Returns null on error.
 */
export async function createCommercialProposalSnapshot(
  supabase: ServerClient,
  args: {
    budgetId: string
    projectRef: { projectId: string; projectVersion: number }
    snapshot: CommercialProposalSnapshot
  },
): Promise<CommercialProposalRow | null> {
  // Next monotonic version for this budget (unique index guards against concurrent collisions).
  const { data: last } = await supabase
    .from('commercial_proposals')
    .select('version')
    .eq('budget_id', args.budgetId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = ((last as { version: number } | null)?.version ?? 0) + 1
  const { data } = await supabase
    .from('commercial_proposals')
    .insert({
      budget_id: args.budgetId,
      version: nextVersion,
      project_id: args.projectRef.projectId,
      project_version: args.projectRef.projectVersion,
      snapshot: args.snapshot,
    })
    .select(PROPOSAL_COLS)
    .single()
  return (data as CommercialProposalRow) ?? null
}

/** List a Budget's CommercialProposals, oldest version first (append-only history). */
export async function listCommercialProposals(
  supabase: ServerClient,
  budgetId: string,
): Promise<CommercialProposalRow[]> {
  const { data } = await supabase
    .from('commercial_proposals')
    .select(PROPOSAL_COLS)
    .eq('budget_id', budgetId)
    .order('version', { ascending: true })
  return (data as CommercialProposalRow[]) ?? []
}

// ── Read helpers for derivation/totals (a budget's lines + their quotes) ────────────────────────

/** List all lines of a Budget (used to derive cost states + totals after writes). */
export async function listBudgetLines(supabase: ServerClient, budgetId: string): Promise<BudgetLineRow[]> {
  const { data } = await supabase.from('budget_lines').select(LINE_COLS).eq('budget_id', budgetId)
  return (data as BudgetLineRow[]) ?? []
}

/** List all quotes belonging to the given line ids (used to derive cost states + totals). */
export async function listVendorQuotesForLines(
  supabase: ServerClient,
  lineIds: string[],
): Promise<VendorQuoteRow[]> {
  if (lineIds.length === 0) return []
  const { data } = await supabase.from('budget_vendor_quotes').select(QUOTE_COLS).in('line_id', lineIds)
  return (data as VendorQuoteRow[]) ?? []
}

// ── 6. Reconcile ────────────────────────────────────────────────────────────────────────────────
//
// TODO (Phase 9 — docs/BUDGET_WORKSPACE_IMPLEMENTATION_PLAN.md §11 step 9): `reconcileBudgetWithProject`
// is NOT a persistence-layer function — per the plan it lives in lib/budget/reconcile.ts and ORCHESTRATES
// the store: read the new Project version's delivery components (resource_need / role_need), diff by
// (item_kind, item_id), then add new lines / orphan removed lines (line_status='orphaned', retained) /
// refresh surviving descriptors, and bump budgets.project_version. No reconcile logic is implemented here
// (no invention) — it will compose the store functions above once Phase 9 begins.

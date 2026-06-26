// Budget Workspace V1 — domain types (Phase 2 of docs/BUDGET_WORKSPACE_IMPLEMENTATION_PLAN.md).
//
// TYPES and allowed ENUMS only — no store, no actions, no UI, no logic, no persistence code.
// The logical model is docs/BUDGET_WORKSPACE_V1_DESIGN.md §4; the persisted columns are
// supabase/migrations/042_budget.sql (NOT modified here). Where the two differ this file follows
// the design's logical entity and marks each field as a persisted column or a DERIVED/child value:
//   • "col: <name>"  → maps to a 042 column.
//   • "DERIVED"      → a projection (design §5/§7), never stored (no column exists).
//   • "child"        → assembled from child rows (no column on the parent).
//
// Budget is an OVERLAY on the canonical Project (BUDGET_INPUT_CONTRACT.md): it references the
// Project read-only and never writes it. Money is a plain number; timestamps are ISO-8601 strings
// (TIMESTAMPTZ). costState is DERIVED and has exactly three values — there is NO `zero` state;
// `effectiveAmount` may be 0 (zero is an amount, not a state). SourceComponentRef.itemKind is
// `resource_need` | `role_need` ONLY — a WorkPackage is a planning container and is NEVER a budget
// line / SourceComponentRef kind.

import type { NeedBasis } from '@/lib/ope-engine/types'

// ── Enums (fixed value sets; closed per the frozen design) ──────────────────────────────────

/** DERIVED projection of a line's pricing state (design §5). NO `zero` state — zero is an amount. */
export const COST_STATES = ['unknown', 'estimated', 'confirmed'] as const
export type CostState = (typeof COST_STATES)[number]

/** budget_vendor_quotes.quote_status — only one `selected` per line (042 partial unique index). */
export const QUOTE_STATUSES = ['draft', 'received', 'selected', 'rejected', 'expired', 'withdrawn'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

/** budgets.status. */
export const BUDGET_STATUSES = ['open', 'reconciling'] as const
export type BudgetStatus = (typeof BUDGET_STATUSES)[number]

/** budget_lines.line_status — `orphaned` = source component gone after a re-plan (retained). */
export const LINE_STATUSES = ['active', 'orphaned'] as const
export type LineStatus = (typeof LINE_STATUSES)[number]

/** commercial_proposals.status. */
export const PROPOSAL_STATUSES = ['draft', 'sent', 'superseded'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

/** budget_vendor_quotes.source. */
export const QUOTE_SOURCES = ['marketplace', 'manual'] as const
export type QuoteSource = (typeof QUOTE_SOURCES)[number]

/** budgets.fee_model (OrganizerFee). cost_plus is reserved (design §4) — not in V1. */
export const FEE_MODELS = ['flat', 'percentage'] as const
export type FeeModel = (typeof FEE_MODELS)[number]

/**
 * Delivery-component kinds a budget line may reference (BUDGET_INPUT_CONTRACT.md).
 * `work_package` is intentionally EXCLUDED — a WorkPackage is a planning container, never a line.
 * Open to future delivery-component kinds.
 */
export const SOURCE_ITEM_KINDS = ['resource_need', 'role_need'] as const
export type SourceItemKind = (typeof SOURCE_ITEM_KINDS)[number]

// ── References ──────────────────────────────────────────────────────────────────────────────

/** A `{ projectId, projectVersion }` reference into the canonical Project (read-only). */
export interface ProjectRef {
  readonly projectId: string
  readonly projectVersion: number
}

/**
 * Stable logical reference to a delivery component in the canonical Project — the only link to
 * scope. Fields readonly: this is identity, never mutated. Resolution against the Project is
 * app-layer (design §14.1); there is intentionally NO DB foreign key (042 stores it as four columns).
 * Maps to budget_lines: cols `source_project_id` / `source_project_version` / `source_item_kind`
 * / `source_item_id`.
 */
export interface SourceComponentRef {
  readonly projectId: string
  readonly projectVersion: number
  readonly itemKind: SourceItemKind
  readonly itemId: string
}

// ── OrganizerFee + derived totals ─────────────────────────────────────────────────────────────

/**
 * The organizer's fee (markup/service fee), applied AFTER the base cost (design §8).
 * `model`/`value` persist on budgets (cols `fee_model` / `fee_value`); a Budget with no fee set yet
 * has `organizerFee = null`. `computedAmount` is DERIVED (never stored).
 */
export interface OrganizerFee {
  model: FeeModel // col: budgets.fee_model
  value: number // col: budgets.fee_value (flat amount, or percentage of base)
  computedAmount: number // DERIVED (§8) — applied after Project base cost
}

/**
 * DERIVED totals (design §7) — a recomputed projection, never the source of truth and not persisted
 * (042 stores no totals columns). `CommercialTotal = ProjectBaseCost + OrganizerFee` (fee after base).
 */
export interface BudgetTotals {
  projectBaseCost: number // Σ effectiveAmount over active lines with a non-null amount
  unpricedCount: number // active lines whose costState = unknown
  isComplete: boolean // unpricedCount === 0
  organizerFeeAmount: number // OrganizerFee.computedAmount (0 if no fee)
  commercialTotal: number // projectBaseCost + organizerFeeAmount
  currency: string // mirrors budgets.currency
}

// ── VendorQuote (a real price for a line) ──────────────────────────────────────────────────────
// Table: budget_vendor_quotes. Modeled as a discriminated union on `source` so the vendor-identity rule
// (VENDOR_QUOTE_MARKETPLACE_CONTRACT.md) is enforced at the type level — stricter than the DB
// (which keeps vendor_ref nullable and validates membership app-side).

interface VendorQuoteBase {
  id: string // col: id (quote_id)
  lineId: string // col: line_id (FK budget_lines)
  amount: number // col: amount — may be 0 (zero is an amount)
  basis: NeedBasis // col: basis — carried from the need (per_guest/per_kid/flat/unspecified)
  inclusions: string | null // col: inclusions (leveling context)
  note: string | null // col: note
  validUntil: string | null // col: valid_until (ISO timestamp | null)
  quoteStatus: QuoteStatus // col: quote_status — ≤1 `selected` per line
  receivedAt: string // col: received_at (ISO timestamp)
}

/** Marketplace-originated quote: `vendor_ref` REQUIRED; carries the stable M5 `marketplace_result_ref`. */
export interface MarketplaceVendorQuote extends VendorQuoteBase {
  source: 'marketplace' // col: source
  vendorRef: string // col: vendor_ref — MANDATORY for marketplace (PHASE0 D5; resolved from the M5 result)
  marketplaceResultRef: string // col: marketplace_result_ref — the stable M5 result ref
  vendorLabel: null // col: vendor_label — unused for marketplace quotes
}

/** Manual quote: `vendor_ref` optional; may instead carry a free-text `vendor_label`. */
export interface ManualVendorQuote extends VendorQuoteBase {
  source: 'manual' // col: source
  vendorRef: string | null // col: vendor_ref — optional for manual
  vendorLabel: string | null // col: vendor_label — free-text vendor name when no vendorRef
  marketplaceResultRef: null // col: marketplace_result_ref — manual quotes carry no M5 result
}

export type VendorQuote = MarketplaceVendorQuote | ManualVendorQuote

// ── BudgetLine (pricing of one source Project component) ────────────────────────────────────────
// Table: budget_lines (persisted cols below). `quotes`, `costState`, `effectiveAmount` are
// DERIVED/child — assembled, never stored.

export interface BudgetLine {
  id: string // col: id (line_id)
  budgetId: string // col: budget_id (FK budgets)
  sourceComponentRef: SourceComponentRef // cols: source_project_id / source_project_version / source_item_kind / source_item_id
  label: string // col: label — reflected from the Project component (read-only display)
  projectEstimate: number | null // col: project_estimate — read-only reflection of the OPE estimate, if any
  organizerEstimate: number | null // col: organizer_estimate — budget-owned manual estimate
  selectedQuoteId: string | null // col: selected_quote_id — the line's selected quote (≤1)
  lineStatus: LineStatus // col: line_status
  note: string | null // col: note
  // — derived / child (not persisted) —
  quotes: VendorQuote[] // child: budget_vendor_quotes WHERE line_id = id
  costState: CostState // DERIVED (§5) — projection of estimate + selected quote
  effectiveAmount: number | null // DERIVED (§7) — may be 0; null only when costState = unknown
}

// ── CommercialProposal (immutable client-facing snapshot) ───────────────────────────────────────
// Table: commercial_proposals.

/** Reserved nullable financial placeholders (design §13) — present, left null/unused in V1. */
export interface ReservedFinancials {
  tax: number | null // col: tax
  platformFee: number | null // col: platform_fee
  discount: number | null // col: discount
}

/** One priced line inside a frozen proposal snapshot (deeply readonly — immutable). */
export interface ProposalSnapshotLine {
  readonly label: string
  readonly sourceComponentRef: SourceComponentRef
  readonly costState: CostState
  readonly effectiveAmount: number | null // may be 0
  /** The selected quote's vendor + amount, captured iff the line is `confirmed`; else null. */
  readonly selectedQuote: { readonly vendorRef: string | null; readonly amount: number } | null
}

/**
 * The frozen content of a proposal — a deep, immutable copy taken at issue time (design §9).
 * Typed as an immutable data structure (all `readonly`); generation logic is NOT implemented here.
 * Persisted as commercial_proposals.snapshot (JSONB).
 */
export interface CommercialProposalSnapshot {
  readonly currency: string
  readonly lines: readonly ProposalSnapshotLine[]
  readonly projectBaseCost: number
  readonly organizerFee: {
    readonly model: FeeModel
    readonly value: number
    readonly computedAmount: number
  } | null
  readonly commercialTotal: number
  readonly unpricedCount: number
  readonly isComplete: boolean
}

export interface CommercialProposal {
  id: string // col: id (proposal_id)
  budgetId: string // col: budget_id (FK budgets)
  version: number // col: version — monotonic from 1 per budget
  projectRef: ProjectRef // cols: project_id / project_version — the Project version AT ISSUE TIME
  snapshot: CommercialProposalSnapshot // col: snapshot (JSONB) — immutable
  status: ProposalStatus // col: status
  reserved: ReservedFinancials // cols: tax / platform_fee / discount (reserved placeholders)
  issuedAt: string // col: issued_at (ISO timestamp)
  sentAt: string | null // col: sent_at (ISO timestamp | null)
}

// ── Budget (the workspace root / overlay) ───────────────────────────────────────────────────────
// Table: budgets (persisted cols below). `lines`, `totals`, `proposals` are child/derived.

export interface Budget {
  id: string // col: id (budget_id)
  projectRef: ProjectRef // cols: project_id / project_version — the canonical Project version this budget reflects
  currency: string // col: currency — single-currency (V1)
  organizerFee: OrganizerFee | null // cols: fee_model / fee_value (null until a fee is set); computedAmount derived
  status: BudgetStatus // col: status
  createdAt: string // col: created_at (ISO timestamp)
  updatedAt: string // col: updated_at (ISO timestamp)
  // — child / derived (not columns) —
  lines: BudgetLine[] // child: budget_lines WHERE budget_id = id
  totals: BudgetTotals // DERIVED (§7)
  proposals: CommercialProposal[] // child: commercial_proposals WHERE budget_id = id
}

-- 042_budget.sql — Budget Workspace V1: pricing/cost/quote/proposal overlay on the canonical Project.
-- Depends on: 001 (profiles + update_updated_at_column), 041 (projects), uuid-ossp (uuid_generate_v4).
--
-- Implements ONLY Phase 1 of docs/BUDGET_WORKSPACE_IMPLEMENTATION_PLAN.md — the schema.
-- Authoritative sources (followed exactly, not reinterpreted):
--   BUDGET_WORKSPACE_V1_DESIGN.md §4 (entities), §13 (schema notes), §14 (validation);
--   BUDGET_INPUT_CONTRACT.md (source_component_ref = resource_need / role_need; WorkPackage is NOT a line);
--   VENDOR_QUOTE_MARKETPLACE_CONTRACT.md (vendor_ref mandatory@marketplace / nullable@manual + vendor_label);
--   CONFIRMED_COMMITTED_CONTRACT.md (Budget stops at `confirmed`; no committed/booking/payment here).
--
-- The Budget is an OVERLAY: it REFERENCES the canonical Project and NEVER writes it.
--
-- Enum-valued columns are TEXT with documented value sets (041 convention — vocabulary may evolve
-- without a type migration); membership is enforced in the app layer (validate.ts, plan §5), so no
-- CHECK constraints are added here. DERIVED values (costState, effectiveAmount, organizer-fee
-- computedAmount, cached totals) are NOT stored — they are projections (design §5/§7). No owner_id
-- columns exist on any Budget entity (design §4 lists none); RLS derives ownership through
-- projects.owner_id. No payment/tax/commitment columns (out of scope) — only the explicitly
-- design-approved RESERVED nullable proposal placeholders (tax/platform_fee/discount, design §13).

-- ───────────────────────── budgets (BudgetWorkspace root, design §4) ─────────────────────────
-- project_id/project_version = projectRef: the canonical Project lineage version this budget
--   currently reflects (PHASE0 Decision 1; drives reconcile). fee_* = OrganizerFee (model/value);
--   computedAmount is derived, not stored. status ∈ {open, reconciling}. fee_model ∈ {flat, percentage}.
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_version INTEGER NOT NULL,
  currency        TEXT NOT NULL,
  fee_model       TEXT,
  fee_value       NUMERIC,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────── budget_lines (BudgetLine, design §4) ─────────────────────────
-- source_* = SourceComponentRef {projectId, projectVersion, itemKind, itemId} — a LOGICAL reference
--   to a delivery component in the canonical Project (NOT a copy, NO FK; design §13). item_kind ∈
--   {resource_need, role_need} (NEVER work_package — a container; BUDGET_INPUT_CONTRACT). Resolution
--   of source_item_id against the Project is enforced app-side (validation §14.1/14.2).
-- label/project_estimate are read-only reflections from the Project; organizer_estimate is budget-owned.
-- selected_quote_id = the line's selected quote (≤1; FK added after budget_vendor_quotes exists, below).
-- costState/effectiveAmount/quotes are DERIVED/child — not stored here. line_status ∈ {active, orphaned}.
CREATE TABLE IF NOT EXISTS budget_lines (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id              UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  source_project_id      UUID NOT NULL,
  source_project_version INTEGER NOT NULL,
  source_item_kind       TEXT NOT NULL,
  source_item_id         TEXT NOT NULL,
  label                  TEXT NOT NULL,
  project_estimate       NUMERIC,
  organizer_estimate     NUMERIC,
  selected_quote_id      UUID,
  line_status            TEXT NOT NULL DEFAULT 'active',
  note                   TEXT
);

-- ───────────────────────── budget_vendor_quotes (Budget VendorQuote — design §4 + Q3 contract) ─────────────────────────
-- This table stores **Budget** VendorQuotes (pricing quotes on a budget line). The physical name is
-- `budget_vendor_quotes` to AVOID a collision with the UNRELATED `vendor_quotes` table from migration
-- 030 (Vendor Sourcing MVP). The logical domain entity stays `VendorQuote`. 042 must NEVER reference
-- or modify 030's `vendor_quotes` — they are different tables for different features.
-- vendor_ref = VendorRef (opaque stable id, PHASE0 D5): mandatory@source=marketplace / nullable@manual
--   (enforced app-side). vendor_label = manual-only free-text vendor name (organizer-owned; never
--   creates/modifies a Vendor). marketplace_result_ref = opaque M5 MarketplaceResultRef (read-only ref).
-- source ∈ {marketplace, manual}; basis ∈ {per_guest, per_kid, flat, unspecified};
-- quote_status ∈ {draft, received, selected, rejected, expired, withdrawn} (≤1 selected per line — see index).
-- amount may be 0 (zero is an amount, not a state — design §5).
CREATE TABLE IF NOT EXISTS budget_vendor_quotes (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id                UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  vendor_ref             TEXT,
  vendor_label           TEXT,
  source                 TEXT NOT NULL,
  marketplace_result_ref TEXT,
  amount                 NUMERIC NOT NULL,
  basis                  TEXT NOT NULL,
  inclusions             TEXT,
  note                   TEXT,
  valid_until            TIMESTAMPTZ,
  quote_status           TEXT NOT NULL,
  received_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular reference: budget_lines.selected_quote_id → budget_vendor_quotes.id (the line's selected quote).
-- Added after budget_vendor_quotes exists. ON DELETE SET NULL: quotes are retained (never deleted) in V1, but
-- if a referenced quote ever disappears the pointer clears rather than deleting the line.
-- NOTE: "selected_quote_id belongs to THIS line" and "agrees with the selected-status quote" are
-- cross-row invariants enforced app-side (design §13 / validation §14.3), not by this FK.
ALTER TABLE budget_lines
  ADD CONSTRAINT budget_lines_selected_quote_fk
  FOREIGN KEY (selected_quote_id) REFERENCES budget_vendor_quotes(id) ON DELETE SET NULL;

-- ───────────────────────── commercial_proposals (CommercialProposal, design §4) ─────────────────────────
-- version = monotonic from 1 per budget (uniqueness enforced by index below). project_id/project_version
--   = projectRef AT ISSUE TIME (historical; may differ from the budget's current version after reconcile;
--   plain columns, no FK — the snapshot is immutable and self-contained). snapshot = immutable frozen
--   JSONB. status ∈ {draft, sent, superseded}. tax/platform_fee/discount = RESERVED nullable placeholders
--   (design §13: present so future flows need no snapshot migration; left null/unused in V1).
-- Snapshot immutability (insert-only; only the status flag transitions — design §13 / §14.6) is enforced
-- app-side (store insert-only). A DB mutation-guard trigger is contemplated by §13 ("consider") but is
-- NOT added here (optional; out of Phase-1 "only approved constraints").
CREATE TABLE IF NOT EXISTS commercial_proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id       UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  project_id      UUID NOT NULL,
  project_version INTEGER NOT NULL,
  snapshot        JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  tax             NUMERIC,
  platform_fee    NUMERIC,
  discount        NUMERIC,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);

-- ───────────────────────── indexes (design §13 + plan §4) ─────────────────────────
-- ≤1 selected quote per line (design §13 — the one explicitly named DB constraint).
CREATE UNIQUE INDEX IF NOT EXISTS budget_vendor_quotes_one_selected_per_line
  ON budget_vendor_quotes (line_id) WHERE quote_status = 'selected';
-- FK-support / lookup indexes (plan §4).
CREATE INDEX IF NOT EXISTS budget_lines_budget_idx ON budget_lines (budget_id);
CREATE INDEX IF NOT EXISTS budget_vendor_quotes_line_idx  ON budget_vendor_quotes (line_id);
-- Monotonic, unique proposal version per budget (design §4 "Monotonic from 1").
CREATE UNIQUE INDEX IF NOT EXISTS commercial_proposals_budget_version
  ON commercial_proposals (budget_id, version);
-- Supports the open-from-Project lookup and the RLS join below.
CREATE INDEX IF NOT EXISTS budgets_project_idx ON budgets (project_id);

-- ───────────────────────── updated_at trigger (budgets only; design §4 lists no other timestamps) ─────────────────────────
DROP TRIGGER IF EXISTS budgets_updated_at ON budgets;
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────── RLS: owner-only, derived through projects.owner_id (design §13) ─────────────────────────
-- No owner_id columns exist on Budget entities (design §4); ownership is the Project's owner, reached
-- via project_id → projects.owner_id and up the budget → line → quote chain.
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_vendor_quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_owner_rw" ON budgets;
CREATE POLICY "budgets_owner_rw" ON budgets FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = budgets.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = budgets.project_id AND p.owner_id = auth.uid()));

DROP POLICY IF EXISTS "budget_lines_owner_rw" ON budget_lines;
CREATE POLICY "budget_lines_owner_rw" ON budget_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budgets b JOIN projects p ON p.id = b.project_id
    WHERE b.id = budget_lines.budget_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budgets b JOIN projects p ON p.id = b.project_id
    WHERE b.id = budget_lines.budget_id AND p.owner_id = auth.uid()));

DROP POLICY IF EXISTS "budget_vendor_quotes_owner_rw" ON budget_vendor_quotes;
CREATE POLICY "budget_vendor_quotes_owner_rw" ON budget_vendor_quotes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budget_lines bl JOIN budgets b ON b.id = bl.budget_id JOIN projects p ON p.id = b.project_id
    WHERE bl.id = budget_vendor_quotes.line_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_lines bl JOIN budgets b ON b.id = bl.budget_id JOIN projects p ON p.id = b.project_id
    WHERE bl.id = budget_vendor_quotes.line_id AND p.owner_id = auth.uid()));

DROP POLICY IF EXISTS "commercial_proposals_owner_rw" ON commercial_proposals;
CREATE POLICY "commercial_proposals_owner_rw" ON commercial_proposals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budgets b JOIN projects p ON p.id = b.project_id
    WHERE b.id = commercial_proposals.budget_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budgets b JOIN projects p ON p.id = b.project_id
    WHERE b.id = commercial_proposals.budget_id AND p.owner_id = auth.uid()));

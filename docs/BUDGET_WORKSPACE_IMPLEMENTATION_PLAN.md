# Budget Workspace V1 — Implementation Plan (engineering execution)

> **Status:** engineering planning, **not architecture.** Architecture is **complete and frozen.**
> This document translates the approved design into an implementation sequence. **No code, no
> redesign, no new concepts/entities/contracts/workflows.** Every item below traces to an existing
> approved document; where something is unclear the reference is cited rather than reinterpreted.
> **Source of truth (followed, not reinterpreted):** `BUDGET_WORKSPACE_V1_DESIGN.md`,
> `BUDGET_INPUT_CONTRACT.md`, `VENDOR_QUOTE_MARKETPLACE_CONTRACT.md`,
> `CONFIRMED_COMMITTED_CONTRACT.md`, `PHASE0_CONTRACT_DECISIONS.md`,
> `OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md`, `WORKSPACE_EVOLUTION_PLAN.md`.
> **Repo conventions reused (not invented):** `lib/<module>/` pure-logic + `lib/actions/*` server
> actions + `supabase/migrations/NNN_*.sql` (RLS owner-only) + `scripts/*.mts` tsx tests with the
> `check()` harness + `npm run test:*` + Next.js `app/[locale]/` pages + next-intl `messages/*`.

---

## 1. Purpose

Give engineers an exact, ordered build sequence for **Budget Workspace V1** — the pricing/cost/quote/
proposal overlay on the canonical Project — so implementation proceeds in small, independently-verified
milestones (mirroring OPE V2 discipline) without re-opening any architectural decision.

---

## 2. Scope

**Will be implemented (V1 — exactly the approved design):**
- `BudgetWorkspace` opened from a plannable Project; **Budget Lines mirrored from delivery components**
  (`resourceNeeds` + `roleNeeds`) per `BUDGET_INPUT_CONTRACT` (WorkPackage is a container — never a
  line).
- `VendorQuote` records (manual + marketplace-originated), with `vendorRef` mandatory for marketplace /
  nullable + `vendorLabel` for manual (`VENDOR_QUOTE_MARKETPLACE_CONTRACT`).
- Quote **selection** (≤1 `selected` per line) → derived `costState` (`unknown`/`estimated`/
  `confirmed`; **zero is an amount, not a state**).
- Derived **totals**: `ProjectBaseCost`, `unpricedCount`/`isComplete`, `OrganizerFee`,
  `CommercialTotal = base + fee`.
- **Commercial Proposal** generation → immutable JSONB snapshot → versioning (draft/sent/superseded)
  + proposal history.
- **Reconcile** against a new Project version (add / orphan / refresh by `(item_kind, item_id)`).
- The §14 validation rules and §15 edge cases.

**Intentionally postponed (see §10):** any **committed**/spend-authorization/booking work (that is
M4 `accept_marketplace_result` → M5, per `CONFIRMED_COMMITTED_CONTRACT` — Budget V1 stops at
`confirmed`); payments/checkout/tax/payouts/refunds; live Marketplace `accept` wiring; multi-currency
conversion; per-line fees; per-component OPE estimates (upstream); any Project scope mutation.

---

## 3. Development phases

Each phase = a small milestone, **tsc + lint + its test green before the next** (OPE V2 discipline,
design §16). Phases map 1:1 onto the approved design sections.

| Phase | Milestone | Approved-design anchor |
|---|---|---|
| **1** | **Budget domain model** — `BudgetWorkspace`, `BudgetLine`, `SourceComponentRef`, enums (`costState`, `lineStatus`, `quoteStatus`, fee `model`, proposal `status`); pure types + invariants | §4, §5 |
| **2** | **Open-from-Project + Budget Line mirroring** — build lines from `resourceNeeds`+`roleNeeds`; seed `unknown` (or `estimated` if a per-component estimate ever exists); validation 14.1/14.2/14.7 | §4 intro, `BUDGET_INPUT_CONTRACT`, design §16.1 |
| **3** | **Vendor Quotes** — `VendorQuote` add/edit (manual + marketplace-shaped); `vendorRef`/`vendorLabel` rule; statuses; validation 14.3/14.8 | §4, `VENDOR_QUOTE_MARKETPLACE_CONTRACT` |
| **4** | **Quote selection + derived cost state** — select/deselect, ≤1 `selected`, derived `costState`/`effectiveAmount`; `confirmed` is reversible commercial (no commitment) | §5, §6, `CONFIRMED_COMMITTED_CONTRACT` |
| **5** | **Totals calculation** — `ProjectBaseCost`, `unpricedCount`, `isComplete` (derived, cache-only) | §7 |
| **6** | **Organizer Fee** — flat/percentage; `CommercialTotal = base + fee` (fee after base); validation 14.5 | §8 |
| **7** | **Commercial Proposal generation** — immutable JSONB snapshot incl. unpriced summary + reserved null placeholders | §9 |
| **8** | **Proposal history + versioning** — draft→sent→superseded; insert-only; `dirtySinceLastSent`; validation 14.6 | §10 |
| **9** | **Reconcile** — new Project version: add new / orphan removed / refresh surviving by `(item_kind, item_id)`; validation 14.9 | §15, `BUDGET_INPUT_CONTRACT` §8 |
| **10** | **Edge-case hardening + API + UI wiring + testing** | §11, §12, §14, §15 |

*(This is the design §16 sequence, expanded; no payment/checkout/tax/scope-mutation in any phase.)*

---

## 4. Database work

Per design §13 (no DDL here — the migration authors it). RLS owner-only, following migration 041's
pattern. **Next migration number: `042`** (latest is `041_projects.sql`).

**Tables** (4 + fee fields):
- `budgets` — root; columns incl. `project_id`, `project_version` (reconcile driver), `currency`,
  organizer-fee fields (`fee_model`, `fee_value`), cached derived totals (recomputed on write, not
  authoritative).
- `budget_lines` — `source_component_ref` as `(project_id, project_version, item_kind, item_id)`
  (logical reference, **not** a copy), `line_status` (`active`/`orphaned`), `organizer_estimate`,
  `selected_quote_id`, `note`.
- `budget_vendor_quotes` — `line_id` FK, `source` (`marketplace`/`manual`), `vendor_ref` (nullable),
  `vendor_label` (nullable), `marketplace_result_ref` (nullable), `amount`, `basis`, `inclusions`,
  `note`, `valid_until`, `quote_status`, `received_at`.
- `commercial_proposals` — `version`, `project_ref`, `snapshot` JSONB (immutable), `status`
  (`draft`/`sent`/`superseded`), reserved nullable `tax`/`platform_fee`/`discount`, `issued_at`,
  `sent_at`.

**Indexes / constraints** (design §13):
- **Partial unique index** `budget_lines`-quotes: `(line_id) WHERE quote_status = 'selected'` →
  enforces ≤1 selected; `selected_quote_id` denormalized for fast read (must agree — validation 14.3).
- `budget_lines (budget_id)`, `budget_vendor_quotes (line_id)`, `commercial_proposals (budget_id, version)`
  indexes.
- `commercial_proposals` **insert-only**; only the `status` flag transitions — app/DB guard against
  snapshot mutation (design §13, validation 14.6).
- FK `budget_lines.selected_quote_id → budget_vendor_quotes.id` (same line).
- RLS: owner-only on all tables (the Project's owner), mirroring `projects_owner_rw`.

**Migrations:** `042_budget.sql` (single migration creating the four tables + indexes + RLS), or split
`042_budgets` / `043_budget_lines_quotes` / `044_commercial_proposals` if reviewers prefer smaller
units — **a packaging choice, not an architectural one.**

---

## 5. Backend

Reuse the established split: **pure logic in `lib/budget/`**, **persistence in `lib/budget/store.ts`**
(RLS-scoped client passed in, like `lib/projects/store.ts`), **server actions in `lib/actions/`**.

- **Domain / services (`lib/budget/`, pure, no I/O):**
  - `types.ts` — entities + enums (Phase 1).
  - `lines.ts` — mirror delivery components → lines; orphan/refresh (Phases 2, 9).
  - `quotes.ts` — quote add/edit + selection rules (Phases 3, 4).
  - `cost-state.ts` — derive `costState`/`effectiveAmount` (Phase 4).
  - `totals.ts` — `ProjectBaseCost`, fee, `CommercialTotal`, `unpricedCount`/`isComplete` (Phases 5, 6).
  - `proposal.ts` — snapshot build + versioning (Phases 7, 8).
  - `reconcile.ts` — diff by `(item_kind, item_id)` (Phase 9).
  - `validate.ts` — the §14 rules (cross-cutting; grows each phase).
- **Repository (`lib/budget/store.ts`):** CRUD over the four tables; the Project is **read-only input**
  (reads via the existing Project store; never writes it — validation 14.4).
- **Actions (`lib/actions/budget.ts`):** thin wrappers over services mapping to the §12 endpoints
  (open, get, totals, reconcile, estimate, quotes, select/deselect, fee, proposals, send).
- **Validation:** every action runs `validate.ts` before persisting; derived values are recomputed,
  never trusted from the client.

---

## 6. API

**Internal actions (server actions / route handlers) — exactly design §12, no additions:**
- `POST /projects/{projectId}/budget` (open) · `GET /budget/{id}` · `GET /budget/{id}/totals`
- `POST /budget/{id}/reconcile`
- `POST /budget/{id}/lines/{lineId}/estimate`
- `POST /budget/{id}/lines/{lineId}/quotes` · `PATCH .../quotes/{quoteId}`
- `POST .../quotes/{quoteId}/select` · `.../deselect`
- `PUT /budget/{id}/fee`
- `POST /budget/{id}/proposals` (generate) · `GET .../proposals` · `GET .../proposals/{version}` ·
  `POST .../proposals/{version}/send`

**Future external API placeholders (named, NOT built):** the Marketplace `accept`/commit hook
(`marketplaceResultRef` → M4 `accept_marketplace_result`, per `CONFIRMED_COMMITTED_CONTRACT`); payment/
checkout/payout endpoints. **Absent by design** (§12): any endpoint editing Project scope or moving money.

---

## 7. UI

Follows design §11 (workflow, not visual design); Next.js `app/[locale]/`, components, next-intl.

- **Pages:** a Budget Workspace page opened from a plannable Project (within/under the organizer
  surface — exact host is Q2/placement, see §9 risk R5).
- **Components:** Budget Line list (label = Cost Item, costState badge, effective amount); per-line
  **quote compare** panel (side-by-side basis/inclusions); **unpriced indicator** ("X items unpriced");
  Organizer Fee control (flat/%); Totals summary (Base + Fee = Commercial Total, with `isComplete`
  flag); Proposal preview + history list (old versions read-only).
- **Dialogs:** add/edit Vendor Quote; select/confirm quote; generate proposal; send proposal
  (confirm — send makes it immutable).
- **State:** the Budget id + derived totals (server-recomputed); proposal `dirtySinceLastSent`
  indicator; optimistic per-line edits reconciled against server validation.
- **i18n:** budget strings added to `messages/*` (note: `messages/*.json` are on the standing
  commit-exclude list — coordinate before committing).

---

## 8. Testing

Mirror OPE V2 test discipline: `scripts/*.mts` tsx, `check(name,cond,detail?)` harness, `npm run
test:budget-*`, plus `npx tsc --noEmit` and `npx next lint`.

- **Unit (per phase, pure logic):** `test:budget-domain` (types/invariants), `test:budget-lines`
  (mirror/orphan/refresh), `test:budget-quotes` (statuses, vendorRef/label rule), `test:budget-select`
  (≤1 selected, derived state, zero-as-amount), `test:budget-totals` (base/fee/unpriced/isComplete),
  `test:budget-proposal` (snapshot immutability + versioning), `test:budget-reconcile` (add/orphan/
  keep), `test:budget-validation` (§14.1–14.9).
- **Integration:** open-from-Project → mirror → quote → select → totals → fee → proposal → send →
  re-plan → reconcile, against a seeded Project (store-level, RLS-scoped).
- **Manual:** the §11 UI flow end-to-end; verify unpriced visibility, immutable-sent-proposal,
  proposal history read-only, currency-mismatch flagging.

---

## 9. Risks (engineering only)

- **R1 — Empty Budget today (upstream dependency).** Per `BUDGET_INPUT_CONTRACT` §9, the current
  frozen OPE provider emits `resourceNeeds = []` / `roleNeeds = []`, so a real Project yields **zero
  Budget Lines** until OPE emits delivery components (Module 2/3 / MAJ-5). **Build against seeded/test
  Projects with needs**; do not fabricate lines from work packages or `costSummary` (forbidden by the
  input contract). *Highest-impact sequencing risk.*
- **R2 — Cross-store referential integrity.** `source_component_ref` points into the Project store
  (separate table); no DB FK across the logical boundary — resolution + `orphaned` handling must be
  enforced in `validate.ts`/`reconcile.ts` (validation 14.1).
- **R3 — Selected-quote dual source of truth.** The partial unique index **and** `selected_quote_id`
  must never disagree (validation 14.3) — enforce in one write path + a guard test.
- **R4 — Snapshot immutability.** `commercial_proposals.snapshot` must be insert-only; needs an app/DB
  guard so no code path `UPDATE`s a sent snapshot (validation 14.6).
- **R5 — Workspace placement (Q2).** Where the Budget host lives relative to M4/M5 is an open
  placement decision; affects routing/auth wiring only — not the data model. Pick a host before Phase
  10 UI wiring.
- **R6 — Derived-total cache drift.** Cached totals on `budgets` must recompute on every write; tests
  must assert cache == recomputed (design §13, validation 14.7).
- **R7 — Currency.** Single-currency V1; mismatched quotes flagged, never converted (validation 14.8) —
  guard against accidental arithmetic across currencies.

---

## 10. Out of scope (postponed — already decided)

Committed/spend-authorization/booking (M4 `accept_marketplace_result` → M5; `CONFIRMED_COMMITTED_
CONTRACT`); payments, checkout, tax, payouts, refunds, disputes, platform fees; live Marketplace
`accept` integration (the hook is referenced, not wired); multi-currency conversion; per-line organizer
fees; per-component OPE estimates (upstream); WorkPackage-as-line (forbidden); any write-back to Project
scope. These are recorded here so no phase silently pulls them in.

---

## 11. Recommended implementation order

Strict order; each step verified (tsc + lint + its test) before the next — the design §16 sequence at
file granularity:

1. **Migration `042_budget.sql`** (tables + indexes + RLS) — unblocks persistence (Phase 1/4 DB).
2. **`lib/budget/types.ts`** + `test:budget-domain` (Phase 1).
3. **`lib/budget/lines.ts`** + open-from-Project mirroring + `lib/budget/store.ts` (lines) +
   `test:budget-lines` (Phase 2) — **seed with test Projects that carry needs (R1).**
4. **`lib/budget/quotes.ts`** + store (quotes) + `test:budget-quotes` (Phase 3).
5. **`lib/budget/cost-state.ts`** + selection + `test:budget-select` (Phase 4).
6. **`lib/budget/totals.ts`** + `test:budget-totals` (Phase 5).
7. **Organizer fee** into `totals.ts` + `test:budget-totals` (fee) (Phase 6).
8. **`lib/budget/proposal.ts`** + snapshot/versioning + store (proposals) + `test:budget-proposal`
   (Phases 7–8).
9. **`lib/budget/reconcile.ts`** + `test:budget-reconcile` (Phase 9).
10. **`lib/actions/budget.ts`** (the §12 endpoints) + integration test (Phase 10 backend).
11. **UI** (`app/[locale]/...` + components/dialogs) + manual flow (Phase 10 UI).
12. **Edge-case hardening + `test:budget-validation`** sweep (§14/§15) — close-out.

---

## 12. Final report

**Architecture-decision → implementation mapping (every decision mapped):**
| Approved decision | Mapped to |
|---|---|
| Budget = overlay on canonical Project; never mutates scope | Phases 2/9; `store.ts` read-only Project; validation 14.4 |
| Budget Lines from delivery components (`resourceNeeds`+`roleNeeds`); WorkPackage = container | Phase 2; R1 |
| `SourceComponentRef = {project_id, project_version, item_kind, item_id}` | DB §4; `lines.ts`; validation 14.1 |
| VendorQuote ownership; `vendorRef` mandatory(marketplace)/nullable+`vendorLabel`(manual) | Phase 3; DB `budget_vendor_quotes` |
| ≤1 `selected` per line; derived `costState`; zero is an amount | Phase 4; partial unique index; R3 |
| `confirmed` ≠ `committed` (commitment is M4→M5, out of scope) | Phase 4; §10; R-none (excluded) |
| Totals: base, unpriced/isComplete, fee after base, `CommercialTotal` | Phases 5–6; validation 14.5/14.7 |
| Immutable, versioned Commercial Proposal | Phases 7–8; insert-only snapshot; R4; validation 14.6 |
| Reconcile add/orphan/keep by `(item_kind, item_id)` | Phase 9; validation 14.9 |
| Unknowns always visible | Phases 5/7; validation 14.7 |
| API boundaries (§12); no scope/payment endpoints | Phase 10; §6 |

**Every architectural decision is mapped to an implementation phase.** No new architecture,
terminology, workflow, or entity was introduced — this plan is a pure execution sequence over the
approved design.

**Ready for coding?** **Yes — with one sequencing caveat (R1):** the data model, contracts, and
boundaries are fully fixed and buildable now, but a *non-empty* Budget on a real Project depends on the
upstream OPE provider emitting delivery components (Module 2/3 / MAJ-5). Build and test against seeded
Projects that carry needs; production value waits on that upstream work. (R5/Q2 placement should be
fixed before Phase 10 UI wiring.)

**First implementation task:** **Phase 1 — author `supabase/migrations/042_budget.sql`** (the four
tables + the `(line_id) WHERE quote_status='selected'` partial unique index + RLS owner-only) and
**`lib/budget/types.ts`** with the entities/enums, verified by `test:budget-domain` (`npx tsc
--noEmit` + the tsx test green).

---

*Engineering execution plan only. No code, no architecture, no new entities/contracts/workflows. Based
entirely on the approved, frozen design. Not committed, not pushed.*

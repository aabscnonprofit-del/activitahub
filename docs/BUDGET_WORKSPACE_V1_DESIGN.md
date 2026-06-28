# Budget Workspace V1 — Technical Design

> **Status:** technical design document (no code yet). Builds on the **frozen** OPE V2 architecture;
> introduces **no** new module pipeline and **no** standalone finance system. It designs a
> **financial overlay on the canonical Project** — the same overlay pattern the Organizer Workspace
> already uses (references the immutable Project, owns only its own overlay state, derived totals,
> immutable snapshots).
> **Source chain (unchanged):** Client Request → Discovery → FED → IR → **Project** → **Budget
> Workspace**. Budget Workspace is a *continuation of Project*, opened once the Project is a
> **plannable Project** (assembled / ready for budgeting). The budget and its proposal are produced
> **before** client acceptance — so this is **not** client approval.
> **Companion research:** `PROBLEM_DEFINITION_EVENT_FINANCE.md`, `EVENT_FINANCIAL_OBSERVATIONS.md`,
> `ESTIMATE_BUILDING_OBSERVATIONS.md`; architecture: `OPE_V2_MODULE3_IMPLEMENTATION_SPEC.md`,
> `OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md`, `PHASE0_CONTRACT_DECISIONS.md`.
>
> **Terminology aligned to industry (V1.1) — see `BUDGET_COSTING_MODEL_ALIGNMENT.md`.** The model is
> unchanged; only names are corrected to proven industry terms. Canonical renames (old → new):
> "Vendor Offer" → **Vendor Quote** · "Active Offer" → **Selected Quote** · "Project Item" →
> **source Project component** (a Resource Need / Role Need / Work item in the canonical Project,
> **referenced, never duplicated**; **UI label: Cost Item**). Confirmed terms: **`BudgetLine` ≡
> Budget Line Item** (Procore) — a pricing line linked to a source Project component via
> `sourceComponentRef` · **Organizer Fee = markup / service fee** (added after Project Cost) ·
> **Project Cost** (= Base Cost) · **`VendorQuote.quoteStatus ∈ { draft, received, selected, rejected,
> expired, withdrawn }`** with **≤1 `selected` per line** (no "active/inactive" language). The
> **Commercial Proposal** is a client-facing **Quote/Proposal generated from an immutable budget
> snapshot**; it presents the **Event Organization Service** price (`Project Cost + Organizer Fee`)
> and **may show a cost breakdown when appropriate — but the client buys the service, not the internal
> cost components.** Cost components (decor, insurance, generator, chairs, photographer…) are
> **internal cost items, never ALH products**; the Budget does **not** expose any source component as
> a commercial product. A Budget may exist **before** client acceptance (the proposal precedes
> acceptance), so opening one needs a **plannable Project**, *not* client approval.

---

## 1. Purpose

Give the organizer one place to attach **real pricing, vendor quotes, commercial decisions, an
organizer fee, totals, and a versioned proposal history** to a **plannable Project** (assembled / ready for budgeting) — so the
abstract plan becomes a priceable, proposable commercial picture **without ever changing the Project
scope.** Budget Workspace turns "what the event requires" (Project) into "what it costs and what we
propose" — as a derived layer, not a new source of truth.

## 2. Non-goals

- **Not** a redesign of OPE V2; **not** a standalone finance/accounting architecture.
- **Not** a source of truth for event scope — the **Project remains canonical**.
- **No** payment custody, checkout, Stripe, payouts, refunds, disputes, or platform fees (only
  reserved placeholder fields where a snapshot must leave room — §13).
- **No** client→organizer payment flow.
- **No** taxes/FX computation (currency assumed single; mismatches flagged, not converted — §15).
- **Does not** create, modify, reorder, or delete source Project components; **does not** duplicate them.

## 3. Core principle

> **Every Budget Line is a *pricing view of an existing source Project component*. The Project owns scope; the
> Budget owns pricing. The Budget *reflects* the Project and may never write to it.**

Consequences (each a hard constraint):
- A Budget Line **cannot exist without** a source Project component (`sourceComponentRef` is mandatory and must
  resolve in the referenced Project version).
- source Project components are **referenced, never copied** — no duplication.
- A Project-Item change happens through **Project logic (re-plan)**; the Budget only **reconciles**
  to reflect it.
- **Unknown items stay visible** and are never silently dropped from totals.
- Totals are **derived** (a recomputed projection), not an authoritative store.
- Commercial Proposals are **immutable snapshots**; changing the budget after one is sent creates a
  **new version**.

## 4. Entities (logical model — no SQL here)

The Project is read-only input; its **delivery components** become Budget Lines. **Q1 is resolved in
`BUDGET_INPUT_CONTRACT.md`:** every Project *delivery component* becomes a Budget Line (Budget never
pre-excludes a component for being "non-financial"); in the current Project contract the delivery
components are **`resourceNeeds` and `roleNeeds`** (type-driven — future delivery-component types are
picked up automatically). A **`WorkPackage` is a planning *container* that describes work, not cost —
it is **never** a Budget Line itself**; the Budget Lines that realize a work package come from the
delivery components it contains (it may supply an optional grouping label only). A delivery component
is identified by a stable **`SourceComponentRef` = `{ projectId, projectVersion, itemKind, itemId }`**
with `itemKind ∈ { resource_need, role_need }` (open to future delivery-component kinds — **not**
`work_package`, a container) — it references a **delivery component in the canonical Project** (a
Resource Need / Role Need), and **never represents a client-facing product**.
(The `BudgetLine.sourceComponentRef` field carries this type.)

> **Clarification — three "quote"-like things; do not confuse them:**
> - **`VendorQuote`** — a price **received from a vendor/provider** for a source Project component
>   (the *inbound* cost side; many per line, **≤1 `selected`**).
> - **`QuoteRequest`** — a **future / out-of-scope** entity for *requesting* a quote from a
>   vendor/provider (the outbound ask). **Not modeled in V1.1 — reserved name only.**
> - **`CommercialProposal`** — the **client-facing** quote/proposal generated from an immutable
>   **Budget snapshot** (the *outbound* price to the client = **Project Cost + Organizer Fee**).
>
> A **vendor quote** (what a provider charges the organizer) is **not** the **client proposal** (what
> the organizer quotes the client). The Commercial Proposal is derived from the Budget snapshot; it is
> never a vendor quote.

### `BudgetWorkspace` (overlay root)
| Field | Logical type | Notes |
|---|---|---|
| `budget_id` | Identifier | — |
| `projectRef` | `{ projectId, projectVersion }` | The canonical Project version this budget **currently reflects** (the lineage version, PHASE0 Decision 1). |
| `currency` | Text | Single-currency assumption (V1). |
| `lines` | List of `BudgetLine` | One per priced source Project component (and per reflected item). |
| `organizerFee` | `OrganizerFee` | §8. |
| `totals` | `BudgetTotals` (derived cache) | §7 — recomputed, never the source of truth. |
| `proposals` | List of `CommercialProposal` | Append-only, immutable snapshots (§10). |
| `status` | Enum { open, reconciling } | Operational. |
| `createdAt` / `updatedAt` | Timestamp | — |

### `BudgetLine` (pricing of one source Project component)
| Field | Logical type | Notes |
|---|---|---|
| `line_id` | Identifier | — |
| `sourceComponentRef` | `{ projectId, projectVersion, itemKind, itemId }` | **Mandatory**; must resolve in the Project. The only link to scope. |
| `label` | Text | Reflected from the source Project component (read-only display). |
| `projectEstimate` | Money \| null | Read-only reflection of the OPE abstract estimate for this item (from the Project's carried `costSummary`), if any. |
| `organizerEstimate` | Money \| null | A **budget-owned** manual estimate (pricing, not scope). Optional. |
| `quotes` | List of `VendorQuote` | Multiple quotes per item (§4/§5). |
| `selectedQuoteId` | Identifier \| null | The line's **selected** quote, if any; **≤1 selected** per line (§6). |
| `costState` | **Derived** Enum { unknown, estimated, confirmed } | A projection (§5) — not independently mutable. |
| `effectiveAmount` | **Derived** Money \| null | §7. |
| `lineStatus` | Enum { active, orphaned } | `orphaned` = the source Project component no longer exists after a re-plan (retained for history; excluded from active totals; §15). |
| `note` | Text \| null | — |

### `VendorQuote` (a real price for a line)
| Field | Logical type | Notes |
|---|---|---|
| `quote_id` | Identifier | — |
| `line_id` | Identifier | FK to `BudgetLine`. |
| `vendorRef` | `VendorRef` (stable id, PHASE0 Decision 5) \| null | **Mandatory when `source=marketplace`; nullable when `source=manual`** (see rule below). Referenced, never embedded — Budget never creates or modifies a Vendor. |
| `vendorLabel` | Text \| null | **Manual quotes only** — free-text vendor name when no `VendorRef` exists. **Organizer-owned metadata; never creates or modifies a Vendor entity.** |
| `source` | Enum { marketplace, manual } | Marketplace quotes carry a `marketplaceResultRef` + `vendorRef`; manual quotes carry a `vendorRef` **or** a `vendorLabel`. |
| `marketplaceResultRef` | Reference \| null | Stable id of an M5 result, if sourced via Marketplace. |
| `amount` | Money | The quoted price. |
| `basis` | Enum (carried from the need: per_guest/per_kid/flat/unspecified) | For comparison/leveling. |
| `inclusions` / `note` | Text \| null | Leveling context (Estimate-Building: quotes aren't comparable without it). |
| `validUntil` | Timestamp \| null | Validity period. |
| `quoteStatus` | Enum { draft, received, selected, rejected, expired, withdrawn } | **Only one `selected` per BudgetLine.** Non-selected quotes **retained** for comparison/history. |
| `receivedAt` | Timestamp | — |

> **Vendor identity rule (Q3 — per `VENDOR_QUOTE_MARKETPLACE_CONTRACT.md`):** a **marketplace** quote
> **must** carry a `vendorRef` (the M5 `MarketplaceResult` resolves to one — PHASE0 D5); its
> `vendorRef`/`marketplaceResultRef` and sourced terms are **read-only across the boundary**. A
> **manual** quote carries **either** a `vendorRef` (a known platform vendor) **or** a free-text
> `vendorLabel` (a vendor not on the platform); `vendorLabel` is organizer-owned and may later be
> reconciled to a `vendorRef` **without** rewriting the quote's terms. A `vendorLabel` **never** creates
> or modifies a Vendor.
>
> **Ownership (Q3):** **Budget owns** the `VendorQuote`, the **selected quote** (`selectedQuoteId`), and
> the per-line **comparison history**. **Marketplace (M5) / Vendor Network own** the **Vendor**, the
> **`MarketplaceResult`**, and the **sourcing history**. **Budget references Marketplace/Vendor entities
> by stable id — it never owns them**, and neither module mutates the other's records.

### `OrganizerFee`
| Field | Logical type | Notes |
|---|---|---|
| `model` | Enum { flat, percentage } | (cost_plus reserved.) |
| `value` | Number | Flat amount, or percentage of base. |
| `computedAmount` | **Derived** Money | Applied **after** Project Base Cost (§8). |

### `CommercialProposal` (immutable snapshot)
| Field | Logical type | Notes |
|---|---|---|
| `proposal_id` | Identifier | — |
| `version` | Integer | Monotonic from 1. |
| `projectRef` | `{ projectId, projectVersion }` | The Project version at issue time. |
| `snapshot` | Frozen document | A deep, immutable copy of the priced lines (effective amounts + states), base cost, organizer fee, commercial total, currency, unpriced summary — **frozen at issue**. |
| `status` | Enum { draft, sent, superseded } | Old versions become `superseded` when a newer is sent; **never modified**. |
| `reserved` | `{ tax?, platformFee?, discount? }` (nullable) | **Placeholder fields only** — reserved, not computed (out of scope). |
| `issuedAt` / `sentAt` | Timestamp | — |

## 5. Cost states (Unknown / Estimated / Confirmed) — derived, never silent

`costState` is a **pure projection** of the line's data, so it can never drift from reality:

| State | Condition | `effectiveAmount` |
|---|---|---|
| **confirmed** | a **selected** VendorQuote exists | the selected quote's `amount` (real, locked) |
| **estimated** | no selected quote, but an estimate exists (`organizerEstimate ?? projectEstimate`) | that estimate |
| **unknown** | no selected quote and no estimate | `null` — **counted as unpriced, never omitted** |

Confirmed always wins over an estimate (a real price overrides). The estimate keeps updating
underneath a confirmed line (for comparison) but does not change the effective amount.

**Zero is an amount, not a state.** There is **no `zero` costState** — the three states above are the
only ones. A line whose `organizerEstimate = 0` is **`estimated` with `effectiveAmount = 0`**; a line
with a selected `$0` VendorQuote is **`confirmed` with `effectiveAmount = 0`**. A **0** line is
**counted as 0 in the base and stays visible** (e.g. volunteer, owned, or free components) — it is
never omitted and never a special case. Only an `unknown` line is unpriced (`effectiveAmount = null`,
carried in the visible unpriced count).

## 6. Selected Quote (the commercial decision)

- A line stores **many** `VendorQuote`s; exactly **≤1 may have `quoteStatus = selected`**
  (`selectedQuoteId`, enforced by §14). **A selected quote determines the line's confirmed cost.**
- **Select(quoteId):** sets that quote `selected`; the previously-selected quote returns to
  `received`; recomputes the line → state `confirmed`. **`confirmed` is a reversible commercial
  decision, NOT a commitment** — it never triggers spend authorization; commitment is the separate
  M4 `accept_marketplace_result` → M5 path (see `CONFIRMED_COMMITTED_CONTRACT.md`, Q4 resolved).
- **Deselect:** no selected quote → state falls back to `estimated` or `unknown`.
- **Non-selected quotes are never deleted** — retained for comparison (bid-leveling, Estimate-Building
  observation) and history; `rejected` / `withdrawn` / `expired` quotes are flagged, not removed.

## 7. Recalculation logic (totals are derived)

Deterministic, recomputed on any pricing change; **stored only as a cache**, never authoritative.

```
effectiveAmount(line) =
    confirmed → selectedQuote.amount
    estimated → organizerEstimate ?? projectEstimate
    unknown   → null

ProjectBaseCost = Σ effectiveAmount(line) over lines where lineStatus = active AND effectiveAmount ≠ null
unpricedCount   = count of active lines where costState = unknown        # always carried alongside the total
isComplete      = (unpricedCount = 0)

OrganizerFeeAmount = model = flat       → value
                     model = percentage → round(ProjectBaseCost × value%)   # applied AFTER base (§8)

CommercialTotal = ProjectBaseCost + OrganizerFeeAmount
```

`BudgetTotals = { projectBaseCost, organizerFeeAmount, commercialTotal, unpricedCount, isComplete, currency }`.
**Unknown items are explicit in the totals object (`unpricedCount` / `isComplete`)** — never hidden.
Recalc triggers: quote added/activated/deactivated, estimate set/cleared, fee change, Project
reconcile (§ lifecycle).

## 8. Organizer Fee

- Computed **after** Project Base Cost; **`CommercialTotal = Project Base Cost + Organizer Fee`**
  (hard constraint).
- V1 models: **flat** amount or **percentage of base** (percentage recomputes when base changes).
- The fee is a single budget-level value in V1 (per-line fees reserved as a future option).

## 9. Commercial Proposal generation

`generateProposal(budget)` →
1. Recompute totals (§7).
2. Produce an **immutable deep snapshot** of: each active line (label, `sourceComponentRef`, costState,
   effectiveAmount, the selected quote's vendorRef+amount if confirmed), the base cost, organizer fee,
   commercial total, currency, and the **unpriced summary** (so unknowns are visible in the proposal).
3. Assign `version = max(existing) + 1`, status `draft`.
The snapshot is **independent** of subsequent budget edits (frozen copy). The proposal presents the
**Event Organization Service** price (`Project Cost + Organizer Fee`) and **may show a cost breakdown
when appropriate — but the client is buying the service, not the internal cost components.**

## 10. Commercial Proposal versioning logic

- **Old proposals are immutable.** A `sent` proposal is never modified.
- **Send(version):** marks it `sent`; marks any prior `sent` as `superseded`.
- **Change-after-send rule:** once a proposal is `sent`, any budget change makes the workspace
  *diverge* from the last sent snapshot; the **next** `generateProposal` creates a **new version**
  (v+1) — the sent one stays frozen. (A `dirtySinceLastSent` flag detects divergence.)
- Versions form an **append-only history**; each carries the `projectVersion` it was built on (so a
  re-plan is traceable across proposal versions).

## 11. UI flow (workflow, not visual design)

1. **Open Budget** from a plannable Project (ready for budgeting) → lines auto-mirror the Project's delivery components;
   each starts `estimated` (if the Project carried an OPE estimate) or `unknown`.
2. **Per item:** add/compare **vendor quotes** (manual or routed from Marketplace), see them
   side-by-side with basis/inclusions, **select the selected quote** → the line turns `confirmed`.
3. **Unknowns** are surfaced prominently (a visible "X items unpriced" indicator) — not buried.
4. **Set the organizer fee** (flat or %).
5. **Review totals:** Project Base Cost + Organizer Fee = Commercial Total, with the unpriced flag.
6. **Generate proposal** → review the snapshot → **send**.
7. **Later changes** (new quotes, fee edits, a Project re-plan reflected) → **regenerate as a new
   version**; the **proposal history** lists all versions, old ones read-only.

## 12. API surface (boundaries)

Budget API is **read-coupled to the Project and never writes it.** Logical endpoints:
- `POST   /projects/{projectId}/budget` — open/initialize from a plannable Project (assembled / ready for budgeting; **not** client approval).
- `GET    /budget/{id}` · `GET /budget/{id}/totals` (derived).
- `POST   /budget/{id}/reconcile` — reflect the **current** Project version (add new lines, orphan
  removed-item lines, refresh estimates). **Reads** the Project; never mutates it.
- `POST   /budget/{id}/lines/{lineId}/estimate` — set/clear the budget-owned `organizerEstimate`.
- `POST   /budget/{id}/lines/{lineId}/quotes` · `PATCH .../quotes/{quoteId}` — add/edit quotes.
- `POST   /budget/{id}/lines/{lineId}/quotes/{quoteId}/select` · `.../deselect` — quote selection.
- `PUT    /budget/{id}/fee` — set the organizer fee.
- `POST   /budget/{id}/proposals` (generate) · `GET /budget/{id}/proposals` · `GET .../proposals/{version}` (immutable) · `POST .../proposals/{version}/send`.
- **Absent by design:** any endpoint that edits Project scope; any payment/checkout/payout endpoint.
- **Scope-change boundary:** changing an item ⇒ Project API (re-plan) → then Budget `reconcile`.

## 13. Database / schema notes (no DDL)

- Tables: `budgets`, `budget_lines`, `budget_vendor_quotes`, `commercial_proposals` (+ organizer-fee fields
  on `budgets`). **The physical table for the `VendorQuote` entity is `budget_vendor_quotes`** — renamed to
  avoid colliding with the unrelated `vendor_quotes` table from migration 030 (Vendor Sourcing); the logical
  entity stays `VendorQuote`.
- `budget_lines.source_component_ref` = `(project_id, project_version, item_kind, item_id)` — a **logical
  reference** to the canonical Project (which lives in its own store); **not** a copy. A row without a
  resolvable ref is invalid (§14).
- **≤1 selected quote per line:** a partial unique index `(line_id) WHERE quote_status = 'selected'`, plus
  `budget_lines.selected_quote_id` for fast read; the two must agree (§14).
- `commercial_proposals.snapshot` = an **immutable JSONB document**; rows are **insert-only** and
  never `UPDATE`d except the `status` flag transition (draft→sent→superseded). Consider an
  application/DB guard against snapshot mutation.
- `budgets.project_version` records which Project lineage version the budget reflects (drives
  reconcile).
- **Derived totals** may be cached on `budgets` (recomputed on write) but the lines/quotes/fee are
  the source of truth.
- **Reserved nullable placeholder columns** on the proposal snapshot for `tax`, `platform_fee`,
  `discount` — present so future flows don't require a snapshot-schema migration; **left null/unused**
  in V1.

## 14. Validation rules

1. **No orphan lines:** every `BudgetLine.sourceComponentRef` must resolve to an existing source Project component in
   `projectRef.projectVersion` (except a line explicitly `orphaned` by reconcile — retained, excluded
   from active totals).
2. **No line creation without a source Project component** (a budget line is never authored free-hand).
3. **≤1 selected quote per line**; `selectedQuoteId` must reference a quote **belonging to that line**;
   `costState = confirmed` ⇔ a selected quote exists.
4. **No scope mutation:** the Budget never writes labels/quantities/structure back to the Project.
5. **Fee after base:** `CommercialTotal = ProjectBaseCost + OrganizerFee`, always in that order.
6. **Immutable sent proposals:** a `sent`/`superseded` proposal's snapshot cannot change; edits ⇒ new
   version.
7. **Unknown visibility:** unknown lines must appear and be counted as `unpricedCount`; totals expose
   `isComplete`.
8. **Currency consistency:** all quotes/estimates/fee/total share `budget.currency`; a mismatched
   quote is flagged (not silently converted — §15).
9. **Reconcile-only Project reflection:** new Project versions enter only via `reconcile`.

## 15. Edge cases

- **Project re-plan (new version):** `reconcile` adds lines for new items, **orphans** lines whose
  items were removed (kept for history, flagged, out of active totals), and refreshes
  `projectEstimate`. Recorded quotes and the proposal history are preserved.
- **Orphaned line that had a selected quote or appeared in a sent proposal:** retain the quote + the
  proposal snapshot (immutable); exclude the line from active totals; flag for organizer attention.
- **Unknown items at proposal time:** the proposal is generated but flagged `isComplete = false` and
  carries the unpriced summary. *Whether to block sending an incomplete proposal is open question Q5.*
- **Multiple quotes, none selected:** line stays `estimated`/`unknown` (falls back), all quotes
  retained for comparison.
- **Selected quote expires (`validUntil` passed) or vendor withdraws:** flag the quote (`expired` /
  `withdrawn`) and the line as stale; it remains `selected` until the organizer changes it (no silent
  auto-deselection).
- **Estimate refreshed under a confirmed line:** state stays `confirmed`; the new estimate is kept
  for comparison only.
- **Percentage fee while base changes:** recompute on every base change.
- **Currency mismatch on an imported/marketplace quote:** flag; conversion is out of scope (V1).
- **Concurrent edits (multi-user):** optimistic concurrency on `budget.updatedAt`/row versions
  (mechanism TBD).
- **Budget edited after v1 sent, then proposal regenerated:** v2 created; v1 frozen and `superseded`.

## 16. Implementation sequence (each step verified before the next, mirroring OPE V2 discipline)

1. **Budget model + open-from-Project + line mirroring** — `BudgetWorkspace`/`BudgetLine`, reference
   the Project, seed `estimated`/`unknown` from carried estimates. Validation §14.1–14.2, 14.7.
2. **Vendor quotes + quote selection + derived state + recalculation** — `VendorQuote`, ≤1 selected,
   derived `costState`/`effectiveAmount`, totals (§7). Validation §14.3, 14.8.
3. **Organizer fee + totals finalization** (§8) — `CommercialTotal = base + fee`. Validation §14.5,
   14.7.
4. **Commercial proposal generation + immutable snapshot + versioning** (§9–§10). Validation §14.6.
5. **Project reconciliation** (§15 re-plan: add/orphan/refresh) (§14.9).
6. **Edge-case hardening + API surface + UI flow wiring** (§11–§12).
*(No payment, checkout, tax, or scope-mutation work in any step.)*

## 17. Open engineering questions

- **Q1 — RESOLVED in `BUDGET_INPUT_CONTRACT.md`.** Every Project **delivery component** becomes a
  Budget Line (Budget never pre-excludes for being "non-financial"); current delivery components =
  **`resourceNeeds` + `roleNeeds`** (type-driven for future kinds). A **`WorkPackage` is a planning
  container — never a Budget Line itself**; its lines come from the delivery components it contains.
  `costSummary` is read-only aggregate context, never a line. Cost may be 0 (an amount, not a state).
- **Q2 — Where does Budget Workspace live relative to M4 (Organizer Workspace) and M5 (Marketplace)?**
  It is an overlay-on-Project like M4; is it *part of* M4 or a sibling overlay? (Affects API/home;
  this design is module-home-agnostic but assumes the M4 overlay idioms.)
- **Q3 — RESOLVED in `VENDOR_QUOTE_MARKETPLACE_CONTRACT.md`.** `vendorRef` is **mandatory for
  marketplace** quotes, **nullable for manual** (which may carry a free-text `vendorLabel` instead).
  **Budget owns** `VendorQuote` / selected quote / comparison history; **Marketplace/Vendor Network
  own** Vendor / `MarketplaceResult` / sourcing history; Budget **references**, never owns. Reflected
  in §4 (`VendorQuote`) above.
- **Q4 — RESOLVED in `CONFIRMED_COMMITTED_CONTRACT.md`.** `confirmed` (selecting a quote) is a
  **reversible, Budget-owned commercial decision** with **no** outward effect; it does **not** create a
  commitment. `committed` is created **only** by a deliberate, separately-authorized action at **M4's
  `accept_marketplace_result`** (against spend authority) → **M5 records** it (booking → market
  `Confirmed`); authorization ≠ payment (M6+). After commitment the authorized facts
  (`selectedQuoteId` / `marketplaceResultRef` / `vendorRef` / `amount`) are **immutable to Budget**;
  unwinding is M5's cancellation flow only. (Note: Market `Confirmed` ≠ Budget `confirmed`.)
- **Q5 — Incomplete proposals:** may a proposal with `unknown` items be **sent**, or only with explicit
  acknowledgement / never? (V1 generates-and-flags; send-policy undecided.)
- **Q6 — Estimate semantics:** the OPE estimate is a **range** (low/likely/high); which value seeds a
  line (`likely`?), and should the base cost optionally roll up a range as well as a point?
- **Q7 — Reconcile policy:** automatic vs organizer-confirmed reflection of a re-plan; exact handling
  of orphaned lines referenced by already-sent proposals.

> **Architectural status:** with **Q1, Q3, and Q4 resolved**, every **cross-module architectural seam**
> of the Budget data model is now contractually fixed (input contract, vendor/marketplace boundary,
> confirmed/committed boundary). **No architectural blockers remain.** The open items above are
> **placement / policy** decisions for implementation planning, not data-model blockers: **Q2** is a
> placement decision (the spend gate is M4's per `CONFIRMED_COMMITTED_CONTRACT.md`, but the host is a
> deployment choice); **Q5 / Q6 / Q7** are send-policy / estimate-seed / reconcile-trigger policies
> within already-defined mechanisms.

---

*Design document only — no implementation. Respects all hard constraints: OPE V2 unchanged; no
standalone finance source of truth; Project canonical; Budget Lines bound to source Project components; no scope
mutation from Budget; unknowns visible; proposals immutable + versioned; ≤1 selected quote; fee after
base; payments/tax/payouts out of scope (placeholders only). Code follows only on an explicit
implementation-plan request.*

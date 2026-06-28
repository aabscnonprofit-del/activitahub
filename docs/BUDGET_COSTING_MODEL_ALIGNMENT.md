# Budget Workspace — Costing-Model Alignment (Comparative Research + Terminology Correction)

> **Purpose:** align Budget Workspace V1 to **mature, industry-standard project-costing, estimating,
> quoting, and proposal models** so ALH invents no terminology or financial structure where proven
> patterns exist. Research-and-alignment only — **no code, no new financial/accounting concepts.**
> **Constraints honored:** OPE V2 / Discovery / FED / IR / Project are **not** redesigned; the
> **Project remains the authoritative source of event scope**; the Budget owns only cost, pricing,
> quotes, fee, totals, and proposal snapshots; cost components (decor, insurance, generator, chairs,
> photographer…) are **internal project cost items — never ALH products**; payments/Stripe/taxes/
> refunds/payouts/disputes/platform-fees are out of scope.
> **Business clarification (anchor):** ALH/the organizer sells **one** thing to the client — the
> **Event Organization Service.** The Project is the delivery plan; the Budget is the cost/pricing
> workspace; the Organizer Fee is the compensation for organizing; the Commercial Proposal presents
> the **total service price.**

---

## 1. Executive conclusion

**Which model ALH should copy/adapt.** Two mature, complementary models — used together, exactly as a
contractor or agency does:

1. **Internal cost build-up → marked-up service price** — the **light-construction / professional-
   services estimating model** (best exemplified by **Buildertrend** and **Procore**): an estimate is
   built bottom-up from **cost line items** (each with a cost type and a vendor price), an **owner
   price** is produced by adding **markup/fee** to cost, and a **proposal** is generated for the
   client. This is *literally ALH's business*: a service provider assembles internal cost from
   components, adds a fee, and quotes the client a total.
2. **Client-facing estimate/quote document** — the **universal small-business accounting model**
   (**QuickBooks / Xero / Zoho Books** Estimates/Quotes, and the SMB-service tools **HoneyBook /
   Tripleseat**): a **Quote/Estimate/Proposal** with line items, a **total**, a validity period,
   **sent/accepted** statuses, and conversion to an **Invoice**.

**Why this is the safest choice.**
- It matches ALH's actual structure (sell a service; internal cost from components; fee on top; quote
  a total) **without inventing anything.**
- Its vocabulary (**Estimate, Quote, Proposal, Line Item, Total, Markup/Fee, Vendor Quote, Accept,
  Invoice**) is the **most familiar** to small organizers and ordinary clients.
- It keeps the three numbers every mature system separates — **internal cost · markup/fee · client
  price** — distinct, which is exactly what the V1 design already does (`base + fee = total`).
- The "build-my-house" contractor analogy is the closest real-world parallel to "organize-my-event,"
  so the model transfers with near-zero adaptation risk.

**What ALH should NOT copy.** The heavyweight enterprise scheduling/cost-accounting machinery
(Primavera P6 cost accounts, MS Project resource-cost-rate tables, Procore commitments/schedule-of-
values/cost-codes as first-class) — useful as concept sources but **too heavy and unfamiliar** for an
SMB/consumer organizer. Borrow their *structure ideas*, not their *terminology surface.*

**Terminology to standardize on** (full table in §3): **Project** (scope, canonical) · **Budget Line
Item / Cost Line** (internal pricing of a project cost component) · **Vendor Quote** (a real price;
replaces "Vendor Offer") · **Selected Quote** (replaces "Active Offer") · **Estimated / Confirmed /
TBD** cost states · **Project Cost** (a.k.a. Base Cost) · **Organizer Fee** (markup/service fee) ·
**Commercial Proposal** (the client-facing **Quote**, total = Project Cost + Organizer Fee) ·
**immutable, versioned** when sent.

---

## 2. Comparative table

| System / industry | Relevant entities | How project **cost** is modeled | How client **quote/proposal** is modeled | What ALH should borrow |
|---|---|---|---|---|
| **MS Project** (scheduling) | Project · Task / Summary Task (WBS) · Resource (work/material/cost) · Assignment · Baseline · Fixed Cost | Bottom-up: cost rolls up from **resource assignments on tasks** (work × rate + material × unit + fixed cost); **Baseline** freezes the plan | None (no client doc) | The idea that **cost derives from the plan** (tasks/resources), and a **frozen baseline** — ALH already has this (cost reflects the Project; the proposal snapshot is the baseline) |
| **Primavera P6** (enterprise) | WBS · Activity · Resource/Role · **Expense** (non-resource cost) · Cost Account · Budgeted/Actual/Remaining | Cost = resource costs + **Expenses**, classified by **cost account**; Budgeted vs Actual | None | The **"Expense" concept** (non-resource cost items) and **Budgeted-vs-Actual**; *reject* cost-account/WBS surface as too heavy |
| **Smartsheet / Monday / ClickUp** (flexible grids) | Sheet/Board · Row/Item (+ children/subitems) · Columns / Custom Fields (money) · Rollup | No native costing — money via **columns + parent rollups** | None native | **Parent→child rollup** as the totals mechanic; *reject* "model anything" flexibility (no costing semantics) |
| **Procore** (construction, mature) | Project · **Prime Contract** (+ **Schedule of Values**) · **Budget Line Item** (by Cost Code) · **Commitment** (subcontract/PO) · Change Order · Original/Revised Budget | Cost = **Budget Line Items**; vendor commitments = **Commitments**; Estimated → Committed → Actual | Client side = **Prime Contract + Schedule of Values** (priced breakdown of the contract) | **"Budget Line Item"** (validates ALH's `BudgetLine`); the **estimated→committed→actual** lifecycle; *reject* commitments/SOV/cost-code surface as too heavy for SMB |
| **Buildertrend** (SMB construction — closest analog) | **Estimate** · **Line Item** (by cost category, with **Cost Type**: material/labor/sub/equipment) · **Markup** · **Owner Price** · **Proposal** · **Selection** / **Allowance** · **Bid** (vendor) · Change Order | Estimate built from **cost line items**; **Owner Price = Cost + Markup** | **Proposal** generated from the estimate (client sees price, not internal cost); **Selections/Allowances** for undecided | **The whole shape**: Estimate → Line Items → **Markup/Fee** → **Proposal**; **Vendor "Bid/Quote"**; **Allowance** for unknowns. *Primary model to adapt.* |
| **HoneyBook** (SMB services/events) | **Proposal** · **Package** · **Service** (line item) · **Add-on** · Invoice · Contract · Payment schedule | Minimal internal cost; price set per service/package | **Proposal** = packages + service line items + total; client **buys a service**, not parts | **Client buys a SERVICE/package** framing; familiar **Proposal/Package/Add-on** vocabulary |
| **Cvent** (corporate events) | Event · **Budget** · **Budget Category** · **Budget Item** · Estimated vs Actual | Budget items by category; Estimated/Actual | Internal (not a client quote tool) | **Budget Item / Category** + **Estimated-vs-Actual** as a familiar event-budget vocabulary |
| **Tripleseat** (venue/hospitality) | Event · Booking · **BEO** · **Proposal** / Contract · Menu/**Line Item** · **Package** | Line items priced per event | **Proposal/Contract** sent to client = packages + line items + total | Event-specific **Proposal with line items/packages → total**, sent to the client |
| **QuickBooks / Xero / Zoho Books** (universal SMB) | **Estimate / Quote** · **Line Item** (Product/Service, Qty, Rate/Unit Price, Amount) · Subtotal/Discount/**Total** · statuses **Draft/Sent/Accepted/Declined** · → **Invoice** | Not internal-cost — these model the **client-facing price document** | **Estimate/Quote → Line Items → Total → Accept → Invoice**; statuses; validity | **The client-facing vocabulary and status lifecycle** — the most familiar terms of all |

**Reading of the table:** the field splits cleanly into (a) **internal cost engineering** (MS
Project / P6 / Procore / Buildertrend) and (b) **the client-facing priced document** (Buildertrend /
HoneyBook / Tripleseat / QuickBooks-Xero-Zoho). ALH needs both, and **Buildertrend is the single
closest end-to-end analog** because it spans cost build-up → markup → client proposal for an SMB
service provider — the same arc as ALH.

---

## 3. Recommended terminology for ALH

| Concept | **Client-facing** term | **Organizer-facing** term | **Engineering entity** | Rejected term — why |
|---|---|---|---|---|
| The thing sold | "your event" / **Event Organization Service** | Event Organization Service / the engagement | *(no entity — represented by Project + Commercial Proposal)* | "Product," "package of items" — the client buys a **service**, not parts |
| Delivery plan / scope (canonical) | *(not shown as such)* | **Project** / event plan | `Project` (OPE V2, unchanged) | — |
| A cost-bearing component of the plan | *(not shown individually)* | **cost item** / **resource** / **expense item** | reference the Project's existing **Resource Need / Role Need / Work item** via `sourceComponentRef` | **"Project Item"** — vague, non-industry, invented; **replace** |
| The pricing entry for one component | *(rolled into the total; optional summary line)* | **line item** / **cost line** | `BudgetLine` (≡ **Budget Line Item**, Procore — keep) | — |
| A vendor's price for a component | *(not shown)* | **Vendor Quote** / Bid | `VendorQuote` | **"Vendor Offer"** — "Quote/Bid" is the industry term (QB/Xero/Zoho; construction); **rename** |
| The chosen vendor price | *(not shown)* | **Selected Quote** / awarded quote | `selectedQuoteId` | **"Active Offer"** — "Selected/Awarded Quote" is standard; **rename** |
| Internal cost total | *(not shown)* | **Project Cost** / Base Cost / cost of delivery | `projectBaseCost` | — |
| Organizer's compensation | *(rolled into total; itemizing is optional)* | **Organizer Fee** (≡ markup / management / service fee) | `OrganizerFee` | "Profit/margin" client-facing — keep internal; **"Organizer Fee"** is the familiar service term |
| Client price | **Total** / **price** / quote total | client price / proposal total | `proposalTotal` (= base + fee) | — |
| Client-facing priced document | **Quote** / **Estimate** / **Proposal** | **Commercial Proposal** (a Quote) | `CommercialProposal` | — |
| Cost certainty | *(not shown)* | **Estimated** / **Confirmed** / **TBD (To Be Determined)** | `costState ∈ {estimated, confirmed, unknown}` | "Unknown" internally fine; show clients/organizers **"TBD"** (friendlier, standard) |
| Held amount for undecided scope | *(shown as an allowance if itemized)* | **Allowance** | (an `estimated` line with no vendor quote) | — |

**Most-familiar-to-ordinary-clients set (use these on anything client-facing):** **Quote, Estimate,
Proposal, Line Item, Total, Accept, Invoice** — plus **Vendor Quote, Markup/Fee, Allowance, TBD** for
the organizer. Avoid enterprise jargon (WBS, cost code, commitment, schedule of values, expense
account) on any surface a small organizer or client sees.

---

## 4. Correct ALH hierarchy (industry-aligned)

```
Event Organization Service          ← the single SERVICE the client buys (Buildertrend "owner's project"; HoneyBook "service")
  → Project                         ← canonical delivery plan / SCOPE (OPE V2 — authoritative, unchanged)
      → Scope / Deliverables / Work Items     ← the Project's work packages / requirements (MS Project tasks; P6 activities)
      → Cost Items / Resource Items / Expense Items   ← cost-bearing components: Resource Needs, Role Needs (P6 "Expense"; Buildertrend "line item")
          → Vendor Quotes           ← real prices per cost item (Buildertrend "Bid"; QB/Xero "Quote")
              → Selected Quote       ← the chosen vendor quote (one per cost item)
  → Estimate / Budget               ← internal cost build-up = Project Cost (Buildertrend "Estimate"; Procore "Budget")
      → Organizer Fee               ← markup on cost (Buildertrend "Markup"; "owner price = cost + markup")
  → Commercial Proposal (Quote)     ← client-facing TOTAL service price = Project Cost + Organizer Fee (QB/Xero "Quote"; HoneyBook "Proposal")
      → [Invoice]                   ← out of scope (downstream; QB/Xero "convert to Invoice")
```

Each level maps to a proven term. **Nothing here is invented**: it is the contractor/agency arc —
*service → project/scope → cost items → vendor quotes → selected quote → estimate + markup →
client quote* — applied to events.

---

## 5. Specific corrections to the existing Budget Workspace design

1. **Replace "Project Item" (the misleading term).** A budget line does not price an invented
   "Project Item"; it prices a **cost-bearing component of the Project** — specifically a **Resource
   Need / Role Need / Work item** that already exists in the canonical Project. The budget line
   **references** that component (`sourceComponentRef`); it never duplicates it. (This also answers
   the design's open Q1: the cost-bearing set = the Project's resource/role needs, and optionally
   work-item cost — referenced, not copied.)
2. **Define the cost-bearing component term.** Organizer-facing: **cost item / resource / expense
   item**. Engineering: the budget line (`BudgetLine` ≡ Procore **Budget Line Item**) carries a
   `sourceComponentRef` to the Project component. Keep `BudgetLine` (industry-validated by Procore).
3. **Define what the client actually buys.** The **Event Organization Service** — one service. Cost
   components are **internal**; the client does not buy decor/insurance/chairs/etc. as products. The
   Commercial Proposal therefore presents the **total service price**, optionally with a **presentable
   grouped summary**, but **hides internal cost and the markup math** (Estimate-Building §6;
   HoneyBook/QuickBooks behavior).
4. **Organizer Fee = markup / service fee.** Applied **after** Project Cost (base); **Proposal Total =
   Project Cost + Organizer Fee** (Buildertrend "owner price = cost + markup"). Whether the fee is
   shown as a separate line to the client is an organizer choice (default: rolled into the total).
5. **Vendor Offer → Vendor Quote; Active Offer → Selected Quote.** Adopt the standard quote/bid
   vocabulary and an industry-safe status set — **`quoteStatus ∈ { draft, received, selected,
   rejected, expired, withdrawn }`**, with **≤1 `selected` per line** (drop "active/inactive"
   entirely). A selected quote determines the line's confirmed cost; non-selected quotes are
   retained for comparison/history.
6. **Commercial Proposal shape (industry-standard quote).** Header (client, event, validity period),
   the **service** (Event Organization Service), the **total price**, an optional grouped summary,
   terms, and an **accept** action; **immutable once sent**; **versioned** (a change after sending
   produces a new version — QB/Xero/Zoho "Sent/Accepted" + new revision). This already matches the V1
   design; only the framing/labels change.

What **stays** (already industry-correct in V1, keep unchanged): Project as source of truth; budget
references (never owns) scope; **Estimated / Confirmed / TBD** states; unknowns visible (Allowance /
"TBD," never silently dropped); derived totals; **one selected quote** per line; immutable + versioned
proposals; payments/tax/payouts out of scope.

---

## 6. Final recommendation

**Edit `BUDGET_WORKSPACE_V1_DESIGN.md`? — Yes** (terminology/labels only; **no model or architecture
change** — the structure was already industry-aligned; only names were off).

**Exact sections to change + terminology replacements:**
| Section | Change |
|---|---|
| §0/§3 (principle) | Add the anchor: client buys the **Event Organization Service**; introduce the canonical terms. |
| §4 (entities) | `VendorOffer` → **`VendorQuote`**; `BudgetLine.projectItemRef` → **`sourceComponentRef`** (a Resource/Role/Work component); clarify `BudgetLine` ≡ Budget Line Item. |
| §5 (cost states) | Add the friendly label **"TBD"** for `unknown`; note an `estimated` line with no quote = an **Allowance**. |
| §6 (selection) | "Active Offer" → **"Selected Quote"**; `activeOfferId` → **`selectedQuoteId`**. |
| §7–§8 (totals/fee) | Frame **Organizer Fee = markup/service fee**; **Proposal Total = Project Cost + Organizer Fee** (unchanged math). |
| §9–§10 (proposal) | Frame the Commercial Proposal as a client-facing **Quote/Proposal generated from an immutable budget snapshot** that presents the **Event Organization Service** price (`Project Cost + Organizer Fee`); it **may show a cost breakdown when appropriate, but the client buys the service, not the internal components**; keep immutable + versioned. |
| §13 (schema) | Table/field renames to match (`budget_vendor_quotes`, `selected_quote_id`, `source_component_ref`). |
| §14 (validation) | Reword "Project Item" → "source Project component"; "active offer" → "selected quote". |
| §17 (open questions) | Mark **Q1 resolved** (cost-bearing components = Project resource/role needs (+ optional work-item cost), referenced not duplicated). |

**Find → replace (authoritative):** `Project Item` → **source Project component** · `VendorOffer` /
`Vendor Offer` → **VendorQuote / Vendor Quote** · `Active Offer` / `activeOfferId` → **Selected Quote
/ selectedQuoteId** · `projectItemRef` → **sourceComponentRef** · `Project Base Cost` → **Project Cost
(Base Cost)** · keep **BudgetLine**, **OrganizerFee**, **CommercialProposal**.

**Unresolved questions before implementation** (narrowed):
- **U1 — Cost-bearing set (was Q1):** confirm against the M3 Project contract whether cost items are
  `resourceNeeds` + `roleNeeds` only, or also work-item cost. *(Recommended: resource + role needs
  first; work-item cost later.)*
- **U2 — Proposal detail:** does the client Quote show a **grouped summary** or a **single total
  only**, and is the **Organizer Fee** ever a visible line? *(Industry default: total + optional
  summary; fee rolled in.)*
- **U3 — Confirmed vs committed:** does selecting a quote (a commercial decision) trip the PHASE0
  spend-authorization gate, or is "Confirmed" purely pricing? *(Keep distinct; ratify.)*
- **U4 — Estimate value:** the OPE estimate is a **range** (low/likely/high) — which value seeds an
  `estimated` line (recommended: `likely`)?
- **U5 — Budget Workspace home:** overlay within M4 Organizer Workspace vs. a sibling overlay
  (terminology-neutral; decide for API placement).

---

*Research-and-alignment report only. No code, no new financial/accounting concepts, no redesign of
OPE V2 / Discovery / FED / IR / Project. The Project remains the authoritative scope; the Budget
remains a pricing/quote/fee/proposal layer; cost components remain internal cost items, never ALH
products. Companion: `BUDGET_WORKSPACE_V1_DESIGN.md` (to be relabeled per §6).*

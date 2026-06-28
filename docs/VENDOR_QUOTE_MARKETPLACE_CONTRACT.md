# VendorQuote ↔ Marketplace — Contract (resolves Budget Workspace Q3)

> **Status:** contract / decision record. **No code, no implementation, no redesign, no new business
> flows.** Resolves **Budget Workspace Q3** (how `VendorQuote` connects to the Marketplace) by fixing
> ownership and the immutable cross-module boundary — using only entities that **already exist** in
> the frozen architecture.
> **Reads:** `BUDGET_WORKSPACE_V1_DESIGN.md`, `BUDGET_INPUT_CONTRACT.md`,
> `RESOURCE_MARKET_ARCHITECTURE.md`, `VENDOR_NETWORK_ARCHITECTURE.md`,
> `EVENT_REQUEST_MARKET_ARCHITECTURE.md`, `TRUST_AND_VERIFICATION_ARCHITECTURE.md`,
> `PHASE0_CONTRACT_DECISIONS.md`.
> **Does not** redesign the Marketplace (M5 / Resource Market) or the Budget Workspace; it only states
> the seam between them.

---

## 1. Purpose

Define **exactly how a `VendorQuote` is connected to the Marketplace**: who owns the Vendor, who owns
the VendorQuote, how the Marketplace hands a quote to the Budget, how manual quotes work, and what may
**never** be modified across a module boundary. This settles Q3 so it is not re-litigated.

---

## 2. Source of Truth

Three already-defined owners, kept strictly separate:
- **Vendor (the real-world supplier)** → owned by the **Vendor Network** (`VENDOR_NETWORK_ARCHITECTURE`);
  vendor trust/verification by **Trust & Verification** (`TRUST_AND_VERIFICATION_ARCHITECTURE`).
  Referenced everywhere by a **`VendorRef`** — a *stable opaque ID* (`PHASE0` Decision 5: `vendor:…`,
  a **reference, not a record**).
- **Sourcing & the sourced offer** → owned by the **Marketplace / Resource Market (M5)**
  (`RESOURCE_MARKET_ARCHITECTURE`): matching, the vendor **`Quote`** step (price + availability +
  terms), booking states, and — per `PHASE0` Decision 4 — **recording the commitment**. The sourced
  artifact is a **MarketplaceResult**, referenced by a **`MarketplaceResultRef`** (`PHASE0` Decision 5:
  `MarketplaceResultRef → VendorRef`).
- **The priced line + commercial decision** → owned by the **Budget Workspace**: the **`VendorQuote`**
  record attached to a `BudgetLine`, its status lifecycle, comparison/selection, and totals.

---

## 3. Core Principle

> **`VendorQuote` is a Budget-owned record that *references* the Marketplace and the Vendor; it never
> owns either.** The Marketplace **sources** a price (a MarketplaceResult); the Budget **records** that
> price as a `VendorQuote` on a line and makes the **commercial decision** (compare / select). Identity
> and sourced facts cross the boundary **by stable reference and as a read-only snapshot — never
> copied-as-mutable, never reached back into and changed.**

Corollaries:
- A **MarketplaceResult (M5) ≠ a VendorQuote (Budget).** They are distinct records: M5 owns the
  sourced result; Budget owns the VendorQuote that references it.
- **Selecting a quote is a commercial decision, not a purchase.** Commitment/authorization is a
  separate, future M4→M5 path (`PHASE0` Decision 4; §13).
- **Identity by reference only** (`PHASE0` Decision 5): opaque IDs flow; records are never embedded.

---

## 4. Responsibilities

| Activity | Owner |
|---|---|
| Maintain the vendor (capabilities, claim/import, relationship) | **Vendor Network** |
| Vendor verification / trust / reliability / actual-vs-quote | **Trust & Verification** (+ Vendor Network) |
| Match needs → vendors, collect the vendor **Quote** (price+terms), booking states | **Marketplace (M5)** |
| Produce the **MarketplaceResult** + its `MarketplaceResultRef → VendorRef` | **Marketplace (M5)** |
| **Record** a price on a line as a `VendorQuote`; compare; **select** (≤1 per line) | **Budget Workspace** |
| Quote **status lifecycle**, leveling notes, derived `costState`/`effectiveAmount`, totals, proposal | **Budget Workspace** |
| **Authorize** a commitment, **record** the commitment, payment | **M4 → M5 → M6** (future; `PHASE0` D4) |

---

## 5. Ownership Matrix

| Thing | Owner | Everyone else | Cross-boundary rule |
|---|---|---|---|
| **Vendor** (record) | Vendor Network | reference by `VendorRef` only | never embedded, never mutated by Budget/M5 |
| **`VendorRef`** (stable opaque id) | identity layer (`PHASE0` D5) | used as-is | immutable token |
| **MarketplaceResult** | Marketplace (M5) | reference by `MarketplaceResultRef` | Budget references it; **never mutates** it |
| **`VendorQuote`** (record on a `BudgetLine`) | **Budget Workspace** | M5 produced the *source*, not this record | M5 **never** mutates a VendorQuote |
| **Quote comparison/selection history** (per line) | **Budget Workspace** | — | retained in Budget (bid-leveling) |
| **Sourcing / commitment / fulfillment history** | Marketplace (M5) | Budget reads refs | M5-owned; Budget never writes it |
| **Commitment / authorization / payment** | M4→M5→M6 (future) | Budget selection only *feeds* it | Budget never commits or charges |

---

## 6. Vendor identity

- Identity is a **`VendorRef`** — a stable opaque ID (`PHASE0` D5), **referenced, never embedded**.
  The Vendor record lives in the Vendor Network; Budget and Marketplace hold only the ref.
- **Mandatory for Marketplace-originated quotes** — an M5 MarketplaceResult always resolves to a
  `VendorRef` (`MarketplaceResultRef → VendorRef`).
- **Optional for manual quotes** — when the organizer quotes a vendor that is **not** on the platform,
  the `VendorQuote` carries a **free-text vendor label** instead of a `VendorRef` (Q3 sub-decision:
  *a manual quote may use a label, not a `VendorRef`*). If the organizer picks a known platform vendor,
  a `VendorRef` is used. A label may later be **reconciled** to a `VendorRef` if that vendor is
  imported/claimed (Vendor Network) — reconciliation never rewrites the quote's other facts.

*(Consistency note for the Budget design: `VendorQuote.vendorRef` must be **nullable for `source=manual`**,
paired with an optional `vendorLabel`; see §16.)*

---

## 7. VendorQuote lifecycle

`VendorQuote` is a **Budget** entity (lives on a `BudgetLine`, which itself must reference a delivery
component per `BUDGET_INPUT_CONTRACT`). Its `quoteStatus` (unchanged from `BUDGET_WORKSPACE_V1_DESIGN`):
```
draft → received → selected ⇄ (back to received) → … ; or rejected / expired / withdrawn
```
- **Created** when a price for a line becomes known — by **accepting a Marketplace result** (§8) or by
  **manual entry** (§9).
- **received** = a usable quote on the line. **selected** = the chosen quote (**≤1 `selected` per
  line**, `selectedQuoteId`) → drives the line's **`confirmed`** cost. **Deselect** returns it to
  `received`.
- **rejected / withdrawn / expired** = retained, flagged, **never deleted** (bid-leveling / history).
- **Zero is an amount, not a state:** a `$0` selected quote yields `confirmed` with `effectiveAmount =
  0` (consistent with the Budget cost-state rules).

---

## 8. Marketplace-originated quotes (`source = marketplace`)

The frozen hand-off (no redesign — restates the M5↔Budget seam):
1. **M5 sources** the price: matches the need, runs the vendor **Quote** step, and produces a
   **MarketplaceResult** (owned by M5) with a `MarketplaceResultRef → VendorRef`.
2. The **organizer accepts** that result into the Budget (the explicit user action; see also `PHASE0`
   D4's `accept_marketplace_result` for the *commitment* path, §13).
3. **Budget creates a `VendorQuote`** with `source = marketplace`, `marketplaceResultRef =` the M5 ref,
   `vendorRef =` the result's `VendorRef`, and a **read-only snapshot** of the sourced terms
   (`amount`, `basis`, `inclusions`, `validUntil`) as quoted.
4. Budget then owns only the **commercial lifecycle** of that VendorQuote (`quoteStatus`, selection,
   note). It **never** mutates the MarketplaceResult or the Vendor; M5 **never** mutates the VendorQuote.

The `marketplaceResultRef` is the durable link back to the sourcing/commitment/fulfillment record in M5.

---

## 9. Manual quotes (`source = manual`)

- The organizer **types** a quote obtained off-platform: `amount`, `basis`, `inclusions`/`note`,
  `validUntil`, and **either** a `VendorRef` (known platform vendor) **or** a free-text **vendor
  label** (§6). `marketplaceResultRef = null`.
- Fully **Budget-owned**: the organizer may edit it (it is Budget-mutable) until it is `selected` and
  captured in a sent proposal. **No Marketplace involvement**, no sourcing, no commitment.
- A manual quote is a first-class peer of a marketplace quote for comparison/selection on the line.

---

## 10. Shared fields (same shape, both sources)

`quote_id`, `line_id`, `vendorRef` (or `vendorLabel` for manual), `source`, `amount`, `basis`,
`inclusions`/`note`, `validUntil`, `quoteStatus`, `receivedAt`. Both kinds compare side-by-side and use
the **same** `quoteStatus` lifecycle and the **same** "≤1 `selected` per line" rule.

---

## 11. Read-only fields (immutable across the boundary)

For a **marketplace** quote, Budget **must not** modify:
- `marketplaceResultRef` (the link to M5)
- `vendorRef` (resolved by M5 / identity layer)
- the **sourced terms snapshot** as quoted (`amount`, `basis`, `inclusions`, `validUntil`)
- `source = marketplace`

These reflect facts **owned upstream** (M5 / Vendor Network / identity layer). Changing a sourced price
would mean re-quoting — which is an M5 action producing a **new** MarketplaceResult, not a Budget edit.

---

## 12. Mutable fields (Budget-local)

- **Both sources:** `quoteStatus` (select / deselect / reject), `note` (leveling commentary),
  `lineStatus` interactions, and the **derived** `costState`/`effectiveAmount` (recomputed, not stored
  authoritatively).
- **Manual only:** `amount`, `basis`, `inclusions`, `validUntil`, `vendorRef`/`vendorLabel` — the
  organizer authored them, so the organizer may edit them (until sealed in a sent proposal).

---

## 13. Future purchasing hook (Committed)

- **Selection ≠ commitment.** A `selected` VendorQuote is the **commercial decision** (the line's
  `confirmed` cost); it is **not** a commitment to pay (`confirmed ≠ committed-to-pay`).
- The **commitment path is the frozen `PHASE0` Decision 4 seam (future, not built here):**
  **M4 authorizes the commitment at `accept_marketplace_result` → M5 records the commitment → M6
  receipt → three-way match.** **Authorization ≠ payment** (M4 never executes a charge).
- **Hook (reference only):** a `selected` marketplace VendorQuote — via its `marketplaceResultRef` —
  is the natural input to that future M4 authorization. **This document defines no commitment
  mechanics**; it only fixes that the bridge runs through `marketplaceResultRef` and lives in M4/M5,
  **never** inside Budget.

---

## 14. Edge cases

- **Multiple quotes, same vendor.** Allowed — a line may hold several quotes; the same `VendorRef`
  may appear on multiple quotes (re-quotes) or across lines (one vendor, many needs). Uniqueness is
  per `quote_id`, not per vendor. Within a line, **≤1 `selected`**.
- **Manual quote, unknown vendor.** Use a `vendorLabel`; `vendorRef = null`. Later reconcilable to a
  `VendorRef` without altering the quoted terms.
- **Marketplace result accepted twice.** Idempotent by `marketplaceResultRef` — a second accept of the
  same result must not create a duplicate VendorQuote (referential identity, not a copy).
- **Marketplace re-quote.** Produces a **new** MarketplaceResult (new `MarketplaceResultRef`) → a
  **new** VendorQuote; the prior quote is retained (`expired`/`withdrawn`/`received`), never edited.
- **Vendor withdraws / quote expires.** `quoteStatus = withdrawn`/`expired`; flagged, retained; if it
  was `selected`, the line falls back to `estimated`/`unknown` (Budget rule). Budget does not delete.
- **Currency mismatch on an imported quote.** Flagged, not silently converted (Budget V1 rule;
  conversion out of scope).
- **Selected quote later committed elsewhere.** The commitment lives in M5 (D4); Budget keeps its
  `selected` VendorQuote as the commercial record — the two are linked by `marketplaceResultRef`, not
  merged.

---

## 15. Questions resolved (Q3 — explicit answers)

| # | Question | Answer |
|---|---|---|
| 1 | What is `VendorQuote`? | A **Budget-owned** record of a real price for one `BudgetLine`, from a vendor; carries amount/basis/terms/validity/status. References (never owns) the Marketplace result and the Vendor. |
| 2 | When is it created? | When a price becomes known — on **accepting a Marketplace result** or on **manual entry** — attached to a `BudgetLine`. |
| 3 | Can it originate from Marketplace / manual? | **Both.** `source ∈ { marketplace, manual }`. |
| 4 | How is Vendor identity represented? | By **`VendorRef`** — a stable opaque id (`PHASE0` D5), referenced never embedded; for manual-unknown vendors, a free-text **vendor label**. |
| 5 | Is `VendorRef` mandatory? | **Yes** for marketplace quotes; **optional** for manual (label allowed). |
| 6 | Quote from Marketplace? | M5 produces a MarketplaceResult (`MarketplaceResultRef → VendorRef`); on organizer accept, Budget creates a VendorQuote referencing it + a **read-only terms snapshot**. |
| 7 | Quote entered manually? | Organizer types the price + vendor label/ref; `source=manual`, `marketplaceResultRef=null`; Budget-owned and editable. |
| 8 | Multiple quotes, same vendor? | **Yes** — same `VendorRef` may recur; ≤1 `selected` per line. |
| 9 | Can a quote become a committed purchase? | **Not in Budget.** Selection is commercial; commitment is the future **M4→M5→M6** path (`PHASE0` D4); authorization ≠ payment. |
| 10 | What belongs to Marketplace? | Sourcing/matching, the vendor Quote step, MarketplaceResult, booking states, **commitment record** (D4). |
| 11 | What belongs to Budget? | The `VendorQuote` record, its lifecycle, comparison/selection, leveling notes, derived cost, totals, proposal. |
| 12 | Who owns `VendorQuote`? | **Budget Workspace.** |
| 13 | Who owns Vendor? | **Vendor Network** (+ Trust for verification). |
| 14 | Who owns quote history? | **Budget** owns the per-line quote-comparison history; **Marketplace** owns the sourcing/commitment/fulfillment history. |
| 15 | Immutable contract? | See §16. |

---

## 16. Final contract table (the immutable seam)

| Element | Owner | Crosses to Budget as | Mutable by Budget? |
|---|---|---|---|
| `VendorRef` | identity layer (D5) / Vendor Network | opaque reference | **No** (immutable token) |
| `MarketplaceResultRef` | Marketplace (M5) | opaque reference on a marketplace quote | **No** |
| Sourced terms snapshot (`amount`/`basis`/`inclusions`/`validUntil`) of a **marketplace** quote | Marketplace (M5) | read-only snapshot | **No** (re-quote = new result) |
| `source` flag | Budget (set at creation) | — | **No** (fixed at creation) |
| `quoteStatus`, `note`, selection (`selectedQuoteId`) | **Budget** | — | **Yes** (Budget-local) |
| `amount`/`basis`/`inclusions`/`validUntil`/`vendorRef`\|`vendorLabel` of a **manual** quote | **Budget** | — | **Yes** (organizer authored) |
| Commitment / authorization / payment | M4→M5→M6 (future) | linked via `marketplaceResultRef` | **No** (not a Budget action) |

**The immutable contract, in one line:** *Marketplace hands Budget a **MarketplaceResult by stable
reference** (`MarketplaceResultRef → VendorRef`); Budget records a **VendorQuote** that references it
and snapshots its sourced terms **read-only**; Budget owns only the **quote's commercial lifecycle**;
neither module mutates the other's records; identity flows **by opaque ID only**; and **selection is a
commercial decision, never a commitment** (commitment is the future M4→M5→M6 path).*

---

## 17. Consistency with Budget Workspace + remaining blockers

**Consistent with `BUDGET_WORKSPACE_V1_DESIGN` / `BUDGET_INPUT_CONTRACT`:** `VendorQuote` as a Budget
entity on a `BudgetLine`; `source { marketplace, manual }`; `marketplaceResultRef`; `vendorRef` as a
`PHASE0` D5 stable id; `quoteStatus` set and "≤1 `selected`"; quotes retained for history; zero-is-an-
amount; selection ≠ commitment (Budget Q4). No Marketplace or Budget redesign; no new flows.

**Remaining blockers before implementation:**
- **B1 (small, in-scope of this decision):** the Budget design must mark **`VendorQuote.vendorRef`
  nullable for `source = manual`** and add an optional **`vendorLabel`** (the §6 resolution). A
  follow-up doc-sync to `BUDGET_WORKSPACE_V1_DESIGN.md` is needed; **not done here** (this task only
  creates the contract).
- **B2 (Budget Q4, still open):** whether selecting a marketplace quote *triggers* the `PHASE0` D4
  `accept_marketplace_result` authorization, or stays purely commercial until a separate action —
  **the commitment trigger is undecided** (this contract fixes the *hook*, not the *trigger*).
- **B3 (depends on M5 build):** the concrete shape of a **MarketplaceResult** and the `accept`
  operation are M5/M4 concerns not yet implemented; this contract is **forward-compatible** but cannot
  be exercised until M5 exists.
- **B4 (Budget Q2):** where Budget Workspace sits relative to M4/M5 (affects who invokes `accept`) —
  still open.

---

*Contract / decision record only. No code, no implementation, no redesign of Marketplace or Budget, no
new business flows. OPE V2 and Budget Workspace unchanged. Not committed, not pushed.*

# Confirmed ↔ Committed — Contract (resolves Budget Workspace Q4)

> **Status:** contract / decision record. **No code, no implementation, no redesign** of Budget,
> Marketplace, or PHASE0. Resolves **Budget Workspace Q4** by fixing the boundary between a
> **commercial decision** (Budget `confirmed`) and an **operational commitment** (`committed`), using
> only seams that **already exist** in the frozen architecture.
> **Reads:** `BUDGET_WORKSPACE_V1_DESIGN.md`, `VENDOR_QUOTE_MARKETPLACE_CONTRACT.md`,
> `PHASE0_CONTRACT_DECISIONS.md`, `RESOURCE_MARKET_ARCHITECTURE.md`, `VENDOR_NETWORK_ARCHITECTURE.md`,
> `WORKER_NETWORK_ARCHITECTURE.md`, `OPE_EVENT_LIFECYCLE.md`.

> **⚠ Naming-collision warning (read first).** Two different "confirm" concepts exist and this
> document keeps them **strictly separate**:
> - **Budget `confirmed`** = a *costState* — "a VendorQuote is **selected**; the line's amount is a
>   real, locked price." A **commercial decision only.** (Budget Workspace.)
> - **Resource Market `Confirmed`** = a *booking state* — "both sides commit; the slot is locked."
>   This is the **operational commitment**, here called **Committed**. (M5; mirrors Worker `Assigned`
>   / Vendor `Selection`.)
> **Budget `confirmed` ≠ Market `Confirmed`.** Whenever this document says **Committed**, it means the
> operational commitment, never the Budget cost state.

---

## 1. Purpose

Define **exactly when a selected `VendorQuote` becomes an actual commitment** — the line between the
organizer's **commercial decision** (which quote priced the line) and the platform's **operational
commitment** (a promise to transact with a vendor/worker for a need). Settle Q4 so it is not
re-litigated.

---

## 2. Source of Truth

- **`confirmed` (commercial)** — owned by the **Budget Workspace**: it is a *pure projection* of the
  line's data (`costState = confirmed ⇔ a selected VendorQuote exists`). Reversible; no outward effect.
- **`committed` (operational)** — owned by the **spend-authorization seam (PHASE0 Decision 4)**:
  **M4 authorizes the commitment → M5 records it → M6 receipt → three-way match.** The commitment is
  the M5 booking reaching market **`Confirmed`** (Vendor `Selection` / Worker `Assigned`).
- **Authorization ≠ payment** (PHASE0 D4.7): `committed` is a *promise to transact*, **not** a charge;
  real payment/settlement is a later, human-confirmed outward action (M6+).

---

## 3. Core Principle

> **Selecting a VendorQuote is a commercial decision (`confirmed`). It does NOT create a commitment.**
> A commitment (`committed`) is created **only** by a deliberate, separately-authorized action at
> **M4's `accept_marketplace_result`** spend gate, after which **M5 records the commitment.**
> **`confirmed` is reversible and Budget-owned; `committed` is outward and M4/M5-owned.**

Corollaries:
- `confirmed ≠ committed` (already asserted in `BUDGET_WORKSPACE_V1_DESIGN`; this document defines the
  full boundary).
- Budget never authorizes spend, never books, never charges.
- The bridge between the two runs through the selected marketplace quote's **`marketplaceResultRef`**
  (the input to `accept_marketplace_result`).

---

## 4. Definitions

| Term | Meaning | Layer | Outward? |
|---|---|---|---|
| **Confirmed** (`costState = confirmed`) | A `VendorQuote` is **selected** on a `BudgetLine`; the line's `effectiveAmount` is that quote's real, locked price (incl. 0). A **commercial decision**. | Budget Workspace | **No** — internal projection |
| **Committed** | An **authorized** operational commitment to a vendor/worker for a need: M4 authorizes at `accept_marketplace_result` (against the member's spend authority) → M5 records the commitment (booking → market `Confirmed`). A **promise to transact**. | M4 (authorize) + M5 (record) | **Yes** — outward, but **not** a payment |
| **Paid / Settled** | Actual money movement. | M6+ / Payment Engine | **Yes** — irreversible; explicit human confirmation |

---

## 5. Ownership

| State / artifact | Owner | Everyone else |
|---|---|---|
| `confirmed` costState + `selectedQuoteId` | **Budget Workspace** | M4/M5 read the selected quote's `marketplaceResultRef` |
| Spend **authorization** decision (who/amount/result/authority) | **M4** (append-only, ADR-shaped — PHASE0 D4.3) | immutable record; Budget references it |
| The **commitment** record (booking → market `Confirmed`) | **M5** | Budget holds a back-reference only |
| Vendor / Worker (the real party) | **Vendor / Worker Network** | referenced by `VendorRef`/`WorkerRef` (PHASE0 D5) |
| Payment / settlement | **M6+** | not a Budget or M4 action |

---

## 6. Lifecycle

```
VendorQuote received
   │  (Budget: organizer selects ≤1 quote per line)
   ▼
COMMERCIAL DECISION — costState = confirmed        [Budget-owned · reversible · no outward effect]
   │  (deliberate, separate action — NOT automatic)
   │  M4 accept_marketplace_result  ── checks member spend authority (PHASE0 D4)
   ▼
AUTHORIZATION — immutable approval decision record  [M4-owned · append-only]
   │  M5 records the commitment
   ▼
COMMITTED — booking reaches market Confirmed         [M5-owned · outward · still NOT paid]
   │  (must complete BEFORE Registration Closed — OPE_EVENT_LIFECYCLE freeze)
   ▼
EXECUTION — fulfilment at the event → Completed → actual-vs-quote → learning   [M5/M6]
   │
   ▼
PAID / SETTLED                                       [M6+ · explicit human confirmation]
```

---

## 7. State transitions

| From → To | Who / what triggers | Notes |
|---|---|---|
| received → **confirmed** | Budget: organizer **selects** the quote | Commercial only; ≤1 selected per line |
| **confirmed → (deselect)** | Budget: organizer deselects / selects another | Reversible; line falls back to `estimated`/`unknown`. **Allowed only while not committed** (§8). |
| confirmed → **committed** | **M4 `accept_marketplace_result`** (authorized) → **M5 records** | The only path to `committed`. Requires sufficient spend authority; rejected `insufficient_authority` / `phase_locked` otherwise (PHASE0 D4.6) |
| committed → **cancelled** | **M5 cancellation flow** (Resource Market §8) | Cancelling party bears cost; deposit/reliability rules apply. **Not a Budget action.** |
| committed → **fulfilled → completed** | M5/M6 at execution | Captures actual-vs-quote → learning |
| any → **paid/settled** | **M6+**, explicit human confirmation | Authorization ≠ payment |

---

## 8. Immutable boundary (what Budget may never edit after commitment)

Once a line's selected quote is **committed**, the following are **frozen for that commitment** —
Budget must not silently change them out from under M5/M4:
- `selectedQuoteId` of the committed line, and that quote's `marketplaceResultRef`, `vendorRef`, and
  `amount` (the authorized facts).
- The M4 **authorization decision record** (append-only by construction).
- The M5 **commitment record** (booking).

To change a committed line, the **commitment must first be unwound through M5's cancellation flow**
(and re-authorized via M4 for a replacement). A Budget-side re-selection **does not** and **cannot**
cancel or replace an existing commitment.

**Still Budget-editable after commitment** (no outward effect): non-committed lines, organizer
estimates on other lines, `note`/leveling text, the Organizer Fee, totals (derived), and **new
proposal versions** (a sent proposal is already immutable; editing produces a new version).

---

## 9. Module responsibilities

| Activity | Owner |
|---|---|
| Select a quote; set/clear `confirmed`; compare; proposal | **Budget Workspace** |
| Check spend authority; **authorize** the commitment (`accept_marketplace_result`); approval record | **M4** |
| **Record** the commitment; booking lifecycle (Reserved → **Confirmed** → Fulfilled → Completed); cancellation; deposits | **M5 (Resource Market)** |
| The vendor/worker party + reliability/actual-vs-quote | **Vendor / Worker Network** (+ Trust) |
| Receipt / three-way match; payment / settlement | **M6+** |

---

## 10. Future purchasing hook

- The **input** to commitment is the **selected marketplace `VendorQuote`'s `marketplaceResultRef`**,
  fed to M4's `accept_marketplace_result`. This document fixes **that this is the hook and where the
  boundary sits** — it defines **no** authorization/commitment **mechanics** (those are M4/M5 future
  work, PHASE0 D4).
- **Manual quotes have no commitment path** in the current architecture: `committed` runs through
  `accept_marketplace_result` against a `MarketplaceResult`, which a manual quote lacks. A manual
  quote may be `confirmed` (commercial) but **cannot become `committed`** via M4/M5 today (§11).

---

## 11. Edge cases

- **Manual quote, no marketplace result.** Can be `confirmed` (commercial decision) but **not
  `committed`** through M4/M5 (no `MarketplaceResult` to authorize). How off-platform commitments are
  recorded is **out of scope** here — flagged, not invented.
- **Deselect / re-select after commitment.** Budget re-selection is a commercial change only; it
  **does not** cancel the M5 commitment. The commitment persists until unwound via M5 (§8).
- **Selected quote expires / vendor withdraws before commitment.** Budget flags it
  (`expired`/`withdrawn`), line falls back to `estimated`/`unknown`; no commitment existed — nothing
  to unwind.
- **Re-quote after commitment.** Produces a **new** `MarketplaceResult` → would need a **new**
  authorization; the existing commitment stands until cancelled.
- **Authority insufficient / phase locked.** `accept_marketplace_result` is rejected
  (`insufficient_authority`, or `phase_locked` after Ready) — the line stays `confirmed`,
  uncommitted (PHASE0 D4.6).
- **Lifecycle timing.** Commitment (market `Confirmed` / Worker `Assigned`) must complete **before
  Registration Closed** (the execution freeze, `OPE_EVENT_LIFECYCLE`); at Registration Closed
  budget + resources freeze. A still-`confirmed`-but-uncommitted line at the freeze is an unfulfilled
  intent, surfaced to the organizer — never silently committed.
- **Committed ≠ paid.** A committed line is not a charge; settlement is M6+ with explicit human
  confirmation (PHASE0 D4.7 / Decision 3).

---

## 12. Final contract table

| Dimension | **Confirmed** (commercial) | **Committed** (operational) |
|---|---|---|
| Meaning | a quote is **selected**; line price locked | an **authorized** promise to transact (booking `Confirmed`) |
| Owner | **Budget Workspace** | **M4** (authorize) + **M5** (record) |
| Created by | organizer **selecting** a quote | **M4 `accept_marketplace_result`** (authorized) → M5 records |
| Automatic from selection? | n/a (it *is* selection) | **No** — deliberate, separately authorized |
| Outward effect? | **No** | **Yes** (but **not** a payment) |
| Reversible? | **Yes** (deselect/re-select) — while uncommitted | only via **M5 cancellation** (policy, cost-bearing) |
| Immutable once set? | no (commercial) | the authorization + commitment records are **immutable**; the committed quote's facts are frozen (§8) |
| Identity | references `vendorRef` / `marketplaceResultRef` (PHASE0 D5) | same refs + M5 booking id |
| Relation to payment | none | **authorization ≠ payment**; settlement is M6+ |
| Lifecycle gate | any time pre-freeze | **before Registration Closed** |

**The contract, in one line:** *Selecting a VendorQuote makes a line `confirmed` — a reversible,
Budget-owned **commercial decision** with no outward effect; it becomes `committed` **only** when a
member with spend authority authorizes it at **M4 `accept_marketplace_result`** and **M5 records** the
commitment (booking → market `Confirmed`), after which the authorized facts are immutable to Budget and
can be undone only through M5's cancellation flow — and `committed` is still **not** payment.*

---

## 13. Consistency + remaining blockers

**Consistent with the frozen architecture:** Budget `confirmed` costState (unchanged); PHASE0 D4 spend
gate at `accept_marketplace_result` (M4 authorizes → M5 records → M6 match; authorization ≠ payment);
`VENDOR_QUOTE_MARKETPLACE_CONTRACT` (`marketplaceResultRef` as the hook; manual quotes carry no
result); Resource-Market booking states and the OPE lifecycle freeze. **No redesign** of Budget,
Marketplace, or PHASE0.

**Remaining Budget Workspace blockers:** with Q1, Q3, and Q4 resolved, **all cross-module
architectural seams of the Budget data model are now fixed.** The open items below are **placement /
policy** decisions, **not** architectural blockers to the contracts or data model:
- **Q2 (placement)** — where Budget Workspace sits relative to M4/M5. *Constrained* by this contract
  (the spend gate is M4's), but the exact host is a deployment decision, not a data-model blocker.
- **Q5 (policy)** — may a proposal with `unknown` items be sent (block vs. acknowledge).
- **Q6 (policy)** — which OPE range value (low/likely/high) seeds an estimate (already `unknown`-first
  per `BUDGET_INPUT_CONTRACT`).
- **Q7 (policy)** — reconcile trigger (automatic vs organizer-confirmed) within the already-defined
  reconcile mechanism.

---

*Contract / decision record only. No code, no implementation, no redesign. OPE V2, Budget Workspace,
Marketplace, and PHASE0 unchanged. Not committed, not pushed.*

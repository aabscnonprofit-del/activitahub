# Resource Market — Architecture

> **Type:** business architecture (roles, ownership, workflows, system behavior). **Not** UI, schema,
> API, payment-processor, or legal design.
> **Role:** the **transaction and coordination layer above** the Worker Network, Vendor Network, and
> Sourcing Engine — how organizers discover, compare, quote, select, book, and manage **resources**
> (workers + vendors). It does **not** replace those systems; it sits on top of them.
> **Source of truth:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_V1_TECHNICAL_DESIGN.md`.
> **Reuses (does not redefine):** `OPE_SOURCING_ENGINE` (matching/acceptance), `WORKER_NETWORK` /
> `VENDOR_NETWORK` (participants, ladders, ownership), `OPE_LEARNING_ARCHITECTURE` (trust classes),
> `OPE_EVENT_LIFECYCLE` (freeze points), per `ARCHITECTURE_CONSISTENCY_AUDIT` (resolves C3).
> **Status:** forward-looking; **R0/R1 are the near-term realizable slice**.
> **Date:** 2026-06-10.

## 0. Disambiguation — two different markets

The consistency audit (C3) found "Marketplace" overloaded. There are **two distinct systems**:

| | **Event Request Market** *(not this doc)* | **Resource Market** *(this doc)* |
|---|---|---|
| Flow | Customer → Request → **Organizer** | Organizer → **Worker / Vendor** → Fulfillment |
| Side | **Demand-side** — customers seek organizers | **Supply-side** — organizers seek resources |
| Organizer is | the **supply** (fulfills the request) | the **demand** (consumes resources) |
| Defined in | `OPE_V1 §9` (+ partly built: requests/proposals/bookings) | **here** |

This document defines **only the Resource Market**. The Event Request Market is a separate, already-
designed demand-side system; its booking/payment path (`createBookingCheckout`) is **distinct** from the
Resource Market's organizer↔resource payments.

---

## Architectural principles

- **UNKNOWN → ASK, never INVENT.** Ambiguous offers, quotes, or terms are clarified with the organizer;
  the market never fabricates a price, a booking, or a counterparty.
- **Works before full maturity.** External (off-platform) workers and vendors are first-class: at **R0**
  the market merely **records and coordinates** what the organizer arranges themselves (the Sourcing L0 /
  W0 / V0 world). No integrated network is required to start.
- **Emerges from the existing networks.** The Worker and Vendor Networks remain the **source of
  participants**; the Resource Market adds **transactions and coordination** on top — it does not
  re-source or re-match.
- **Organizer-first.** The market exists to help organizers **execute events**, not to maximize platform
  control. It never taxes or appropriates the organizer's own relationships (see §11, §13).

---

## 1. Resource Market role

**Owns** (the transaction/coordination layer):
- the **booking record** and its lifecycle (§5), **deposits** (§6), **payment coordination** (§7),
  **refunds** (§8), **disputes** (§9), and **two-sided ratings** (§10);
- **comparison & selection** surfaces over matched candidates (§3–§4);
- **commission** on platform-mediated transactions (§11).

**Does NOT own:**
- **matching** (owned by the Sourcing Engine), **participants/profiles** (Worker/Vendor Networks),
  **trust/learning rules** (Learning Architecture), **the plan/needs** (OPE), or **the organizer's
  relationships** (§13).

**Relationships:**
- **OPE** produces the plan and the **resource needs** (with budget references).
- **Sourcing Engine** turns needs into requests and **matches** candidates (the discovery mechanism, §3).
- **Worker / Vendor Networks** supply the **participants** and their **ladders** (W/V).
- **Resource Market** wraps the selected candidates in a **transactable, coordinated relationship**.

---

## 2. Market participants

| Participant | Provides | Side of *this* market |
|---|---|---|
| **Organizer** | consumes resources to execute an event | **demand** |
| **Worker** | labor (a capability bundle — `WORKER_NETWORK`) | supply |
| **Vendor** | places, equipment, services, supplies (`VENDOR_NETWORK`) | supply |

The organizer is the **demand** side here — the mirror of the Event Request Market, where the organizer
is the supply. Workers and vendors keep the models, ladders, and ownership rules defined in their own
documents; the Resource Market does not redefine them.

---

## 3. Resource discovery

Organizers discover resources from three **sources**, all surfaced through the Sourcing Engine:

| Source | Tier | How |
|---|---|---|
| **Private network** | W0/V0 (owned, imported) | the organizer's own workers/vendors (`VENDOR §2–3`) — surfaced first, never exposed to others |
| **Platform network** | W1+/V1+ (registered) | discovered via **Sourcing matching** + the **aggregate shared graph** (`VENDOR §4`) |
| **External** | off-platform | entered as a **brief** (Sourcing L0) and coordinated manually |

**Discovery = Sourcing matching, surfaced.** The Sourcing Engine's **CandidateProvider chain** (`OPE_SOURCING_ENGINE §5`) *is* the discovery mechanism; the Resource Market **presents the matched shortlist** for comparison and selection (§4). The market adds no new matching logic — it consumes
matching output.

---

## 4. Quotes and offers

- **Worker offers** — a matched worker signals availability for a need at a pay band (the Worker
  lifecycle `Accepted` state). Workers price their labor; OPE's budget is the reference, not a set price.
- **Vendor quotes** — a matched vendor returns price + availability + terms (the Vendor `Quote` step,
  `VENDOR §8`), which also feeds the OPE Budget Engine.
- **Comparison** — the market presents offers/quotes **side by side** against the need's spec and budget
  cap; no pricing algorithm sets values — the market **displays and compares** what supply offers.
- **Selection** — the organizer chooses (this becomes a booking, §5).
- **Acceptance** — the chosen party confirms, locking the booking. **UNKNOWN → ASK:** ambiguous terms are
  clarified before acceptance.

---

## 5. Booking model

```
Available ─▶ Offered ─▶ Reserved ─▶ Confirmed ─▶ Fulfilled ─▶ Completed
```

| Booking state | Meaning | Worker variant | Vendor variant | Maps to |
|---|---|---|---|---|
| **Available** | resource is matchable | Worker `Available` | Vendor V1+ listed | Sourcing `Matched`-eligible |
| **Offered** | an offer/quote exists for a specific need | offer at pay band | **quote** (price+terms) | Sourcing `Accepted` / Vendor `Quote` |
| **Reserved** | organizer holds tentatively (soft-lock; deposit may attach §6) | — | — | *market-added hold* |
| **Confirmed** | both sides commit; the slot is locked | Worker `Assigned` | Vendor `Selection` | Sourcing `Confirmed` — **before Registration Closed** (`OPE_EVENT_LIFECYCLE` freeze) |
| **Fulfilled** | work/service delivered at the event | — | delivery/setup | event `In Progress` |
| **Completed** | done + actuals + ratings | Worker `Completed/Reviewed` | Vendor fulfillment close | event `Closed` → Learning |

**Failure branches** are owned by the networks, not redefined here: a worker **Cancelled/No-show**
(`WORKER §7A`) or a vendor **cancellation** (`VENDOR §8`) **reopens the need** → the networks re-source
(standby → fresh wave → escalate). The Resource Market reflects this as the booking returning to
**Reserved/Offered** and **informs the organizer** — never a silent under-fill.

> **Reserved** is the one state the market adds: a hold (with optional deposit) between an offer and a
> firm commitment. Everything else maps onto existing Sourcing/Worker/Vendor states.

---

## 6. Deposits

A **deposit** is a commitment device attached at **Reserved/Confirmed** (exists only at R3+, §12):
- **Commitment** — both sides have stake, reducing flaky cancellations.
- **Reservation protection** — holds the resource against the slot.
- **Cancellation protection** — forfeited or returned per the refund rules (§8).

A deposit is, architecturally, a **state + rule** on the booking, held by an **escrow** facility (future,
§14) and executed by the **Payment Engine** (§7/§14). This document defines *that a deposit exists and
what it protects* — not how money moves.

---

## 7. Payments

The Resource Market is the **coordination layer**; a **Payment Engine** (future, §14) **executes**.

- **Roles:** **payer** = organizer; **payee** = worker/vendor; **intermediary** = platform (holds
  escrow, takes commission at R3+, §11); **processor** = Stripe / other (future integration).
- **Flow (conceptual):** organizer pays deposit/balance → escrow holds → **released on `Completed`** (or
  refunded per §8/§9).
- **Distinct from the Event Request Market** — those are organizer↔client bookings via the existing
  `createBookingCheckout`; Resource Market payments are **organizer↔worker/vendor** and are a separate
  flow (audit F).

No processor implementation here — only roles and flows.

---

## 8. Refunds (principles)

| Scenario | Principle |
|---|---|
| **Organizer cancellation** | timing-based: late cancel may **forfeit the deposit** to compensate the held resource; early/pre-`Reserved` is free |
| **Worker cancellation** | deposit **returned to organizer**; reliability penalty (`WORKER §9`); replacement re-sourced (`§7A`) |
| **Vendor cancellation** | payment/deposit **returned**; reliability penalty; re-sourced (`VENDOR §8`) |
| **Partial fulfillment** | **pro-rated** — pay for what was delivered; contested → dispute (§9) |

Principles: the **cancelling party bears the cost**; deposits **protect the wronged party**; refunds are
**rule-based and fair**, consistent with the no-silent-under-fill / reopen flows already defined in the
networks.

---

## 9. Disputes

- **Who can open:** any party to a booking — **organizer, worker, or vendor**.
- **States:** `Opened → Under Review → Resolved` (with `Escalated` for hard cases).
- **Outcomes:** full refund · partial refund · release to provider · deposit forfeiture · reputation
  adjustment (§10) · no action.
- **Reviewer:** the platform / an **expert** reviewer (the "expert" role referenced by the Learning
  Architecture — its authority is an undefined dependency, audit E2/§14).

Disputes feed reputation as **organizer-confirmed / expert** signals (never auto). No legal design here.

---

## 10. Ratings and reputation

**Two-sided**, reusing the Learning Architecture's signal classes (auto / organizer-confirmed / expert):

| Reputation | Captures | Source |
|---|---|---|
| **Worker** | reliability + quality | `WORKER §9` (reuse) |
| **Vendor** | reliability + quality + actual-vs-quote | `VENDOR` (reuse) |
| **Organizer** *(new here)* | how good an organizer is to work for — clear briefs, pays on time, low chaos | workers/vendors rate the organizer |

- **Relationship to Learning Architecture:** all ratings are signals; **safety/verification moves only by
  expert**, never softened by good statistics.
- **Relationship to future verification:** strong reputation + **W2/V2 verification** unlocks higher-
  trust roles and the upper market ladder (R4); verification authority is a future dependency (§14).
- **Organizer reputation matters** because it influences how readily resources accept offers — a fair,
  reliable organizer fills roles faster.

---

## 11. Commissions

- **Charged ON:** **platform-mediated transactions** — a booking that is **discovered through the
  platform and paid through the platform** (R3+). The platform earns when it genuinely brokered **and**
  processed the transaction.
- **NOT charged on:**
  - **external relationships** (R0 — coordinated off-platform),
  - **private / imported relationships** (the organizer's own workers/vendors used off-market, `VENDOR
    §2–3`),
  - **discovery/coordination without a platform transaction**,
  - **pre-existing relationships** the organizer brought to the platform.
- **Supports** external, private, and marketplace relationships **side by side** without penalizing the
  organizer for using their own network.

This is the **anti-organizer guard**: the platform **never taxes the organizer's own relationships** —
consistent with the helper-not-protagonist philosophy (`MASTER §11.2`), Vendor ownership (`§2`), and the
"monetized layer = the transaction" reading of `MASTER §11.8`.

---

## 12. Resource Market ladder

The market's **transaction maturity**. It **consumes** the Worker/Vendor tiers (W/V) — it does not
restate them; each R-level notes the W/V tier it needs.

| Level | Market capability | Needs |
|---|---|---|
| **R0 — External Coordination** | records/coordinates off-platform arrangements (a coordination ledger); no on-platform transaction | W0/V0 · **today** |
| **R1 — Discovery Market** | discover + compare registered resources by capability (Sourcing matching + shared graph); contact off-platform | W1/V1 |
| **R2 — Booking Market** | on-platform **bookings** (Reserved→Confirmed→Fulfilled→Completed) without payment; commitments tracked | W1+/V1+ |
| **R3 — Transaction Market** | on-platform **payments, deposits, refunds, disputes, commissions** | **W3/V3** (transactable) |
| **R4 — Full Resource Market** | mature two-sided market: ratings at scale, verification, contracts, escrow, dispute resolution | W3/V3 + verification |

Monetization (commissions, §11) appears at **R3+**; everything below delivers coordination value with no
fees. R0/R1 are realizable now.

---

## 13. Relationship ownership

Consistent with the Worker and Vendor Networks: **the market coordinates relationships; it does not own
them.**

| Owned by | What |
|---|---|
| **Organizer** | their vendor/worker relationships, private notes, negotiated pricing, contacts (`VENDOR §2`) |
| **Worker** | their profile, availability, capabilities, reputation (`WORKER`) |
| **Vendor** | their business profile, public capabilities, pricing they publish (`VENDOR`) |
| **Resource Market** | the **transaction record** (booking, deposit, payment, dispute, rating) — **not** the relationship |

Private/external relationships stay **private and un-commissioned** (§11). The market adds a transaction
record on top of a relationship; it never appropriates the relationship itself.

---

## 14. Future integrations (interfaces only)

| System | Interface from the Resource Market |
|---|---|
| **Verification Layer** | W2/V2 verification + the **expert** authority (audit E1/E2) — gates higher-trust bookings (R4) |
| **Trust Layer** | aggregates reputation/verification across markets into a single trust signal |
| **Payment Engine** | **executes** §7 (deposits, balances, payouts) — Stripe/other |
| **Insurance** | optional coverage attached to a booking (workers/events) |
| **Contracts** | a confirmed booking's terms become a contract record |
| **Escrow** | holds deposits/payments between Confirmed and Completed (§6/§7) |

Interfaces only — none designed here.

---

## Architecture summary

The **Resource Market** is the **supply-side transaction and coordination layer** that lets organizers
**discover, compare, quote, select, book, and manage** workers and vendors — sitting **on top of** the
Worker Network, Vendor Network, and Sourcing Engine without replacing them.

- It **owns** the booking lifecycle, deposits, payment coordination, refunds, disputes, two-sided
  ratings, and commissions; it does **not** own matching, participants, trust rules, or relationships.
- It **reuses** Sourcing matching (discovery), the Worker/Vendor ladders (participants), the Learning
  trust classes (reputation), and the Event Lifecycle freeze (Confirmed before Registration Closed).
- It **works before maturity** (R0 external coordination) and scales through R1→R4 as the W/V tiers
  mature; **commissions apply only at R3+ on platform-mediated transactions**, never on the organizer's
  own/external relationships (the anti-organizer guard).
- It is **distinct from the Event Request Market** (demand-side), resolving the "Marketplace" overload.
- **UNKNOWN → ASK, never invent**; under-fill is never silent.

## Relationship to existing architecture

```
OPE ──────────────▶ plan + resource needs (with budget references)
  │
Sourcing Engine ──▶ needs → requests → matching  (discovery, §3)
  │
Worker Network /  ─▶ participants + ladders (W/V) + lifecycles + ownership
Vendor Network
  │
RESOURCE MARKET ──▶ discover → compare → quote/offer → select → book → pay → fulfil → rate
                    (transaction + coordination ONLY; reuses all of the above)
```

Each layer keeps its existing responsibilities: **OPE** plans, **Sourcing** matches, the **Networks**
supply participants and own relationships, and the **Resource Market** adds the **transactional and
coordination layer** — booking, deposits, payments, refunds, disputes, ratings, and commissions — without
redefining anything the lower documents already own.

_Architecture only. No UI, schema, API, payment-processor, or legal design. Consistent with the source of
truth, the approved OPE/Sourcing/Worker/Vendor architecture, the Learning Architecture, the Event
Lifecycle, and the consistency audit (resolves C3)._

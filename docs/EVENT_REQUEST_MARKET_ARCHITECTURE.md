# Event Request Market — Architecture

> **Type:** business architecture (concepts, workflows, system behavior). **Not** UI, schema, API,
> payment, contract, or bidding design.
> **Role:** the **demand-side market** — connects **customer demand** with the **right organizer**
> (`Customer → Organizer`), then hands off to OPE for planning. It does **not** manage worker/vendor
> fulfillment (that is the Resource Market) or process payment (existing booking checkout / a future
> Payment Engine).
> **Consolidates & modernizes:** `OPE_V1 §9` + `MASTER §2/§6` (the final block in
> `FINAL_ARCHITECTURE_AUDIT`), aligned to the current architecture set.
> **Reuses (does not redefine):** `WORKER_NETWORK` (invitation waves, new-participant fairness),
> `TRUST_AND_VERIFICATION` (standing), `OPE_LEARNING_ARCHITECTURE` (signal classes), `OPE_MASTER_SPEC` /
> `OPE_V1 §9.2` (preliminary assessment), `OPE_EVENT_LIFECYCLE`, `ORGANIZER_OPERATING_SYSTEM_PRINCIPLE`,
> `RESOURCE_MARKET`.
> **Status:** forward-looking; the request/proposal/booking **primitives are partly implemented**
> (`customer_requests`, `proposals`, `bookings`).
> **Date:** 2026-06-11.

## 0. Disambiguation — two markets

| | **Event Request Market** *(this doc)* | **Resource Market** *(separate)* |
|---|---|---|
| Flow | **Customer → Organizer** | Organizer → Worker / Vendor |
| Side | **demand-side** — customers seek organizers | supply-side — organizers seek resources |
| This market | **discovers & matches organizers** | books & coordinates resources |
| Out of scope here | worker/vendor fulfillment, payment, contracts | — |

The two are **chained**: this market matches a customer to an organizer; the organizer then **plans via
OPE** and **sources via the Resource Market**. The Event Request Market ends at the **match + handoff**.

---

## Architectural principles

- **Organizer-first.** ActivLife Hub is an Organizer Operating System
  (`ORGANIZER_OPERATING_SYSTEM_PRINCIPLE`). This market's purpose is to **connect customer demand with an
  appropriate organizer** — not to commoditize organizers or insert the platform between them and the
  customer.
- **No first-click race.** **No** first-responder-wins, **no** open bidding wars, **no** organizer
  auctions, **no** lead-sale marketplaces. Matching is **controlled** — ranked, fairness-balanced, and
  wave-gated. Organizers **accept**, they do not bid in a race.
- **Invitation waves** (reused from `WORKER_NETWORK §5`): `Request → Wave 1 → Wait → Wave 2 → Wait →
  Wave 3` — the system **expands gradually**, minimizing unnecessary invitations.
- **No response ≠ penalty.** Missing one request does **not** make an organizer unreliable; there is **no
  automatic punishment** (reuses `WORKER` no-response handling).
- **New-organizer fairness.** Experienced organizers must **not permanently monopolize demand**; reuse
  the fairness principles already approved in `WORKER §9A`.

---

## Required matching factors

| # | Factor | What it means |
|---|---|---|
| 1 | **Geography** | the organizer serves the request's region/location (service area) |
| 2 | **Event Type / Capability** | the organizer can run this kind of event (pattern/category capability — Celebration/Class/etc.) |
| 3 | **Similar Event Experience** | the organizer has **completed similar events** before (per-capability reputation, Trust/Learning) |
| 4 | **Trust Standing** | the organizer's cross-party **Trust level** (`TRUST_AND_VERIFICATION §6`) — verified, proven, reliable |
| 5 | **Current Capacity** | the organizer's current workload — not at/over capacity (§6) |
| 6 | **Customer Wait Preference** | fast response vs broad search (§9) — tunes wave size/windows |

These are **matching concepts, not an algorithm**. Hard filters: geography, capability, capacity,
required verification (for safety/regulated event types). Soft ranking: experience, trust, fit —
**balanced by fairness** (§8). No price-based ranking (no auction).

---

## 1. Event request model

A **request** is a customer's description of an event they **want but that does not yet exist**
(demand-first; `MASTER §2`). It carries: event type/intent, date/timeframe, location, rough guest count,
optional budget, special requirements, **delivery mode** (marketplace vs direct, `OPE_V1 §9.3`), and
**wait preference** (§9).

**Entry points:**
- a **direct request** (the customer describes the event), or
- a **converted plan** — a consumer Activity Planner plan turned into a request ("one tap turns this plan
  into a request," `ACTIVITY_PLANNER_MVP §8`).

On entry, OPE produces a **preliminary assessment** (`OPE_V1 §9.2`: prep hours, staffing/equipment/
vendor/logistics estimates, budget range, risks) so **both sides start from a grounded picture**, not a
one-line wish.

---

## 2. Request qualification

Before matching, the request is **qualified** — complete and feasible enough to match well. **UNKNOWN →
ASK, never invent the customer's intent:** if location, type, date, or scale is missing/ambiguous, the
market **asks the customer** (the demand-side analog of the OPE clarification loop).

Qualification also performs a **feasibility check**: is this an event type the platform serves and for
which **qualified organizers exist**? If not, the customer is told honestly (no silent dead-match) —
consistent with the no-silent-fallback ethos. The preliminary assessment (§1) is generated here.

---

## 3. Organizer matching

Matching selects **qualified, available, trusted** organizers using the six factors and engages them via
**controlled, wave-based** invitations:

- **Marketplace mode** — the request (with its assessment) is offered to a **ranked, fairness-balanced
  set** of matched organizers in **waves** (§4); accepting organizers respond with **proposals** (each
  starting from the OPE draft). The customer **selects by fit**, not by a price race.
- **Direct mode** — the customer picked an organizer first (e.g. a public profile `/o/<slug>`); the
  request routes to **that one organizer** (a single targeted match, `OPE_V1 §9.3`).

No bidding, no auction, no first-click — organizers **accept** within a window (§5); the customer chooses.

---

## 4. Invitation waves

| Wave | Purpose |
|---|---|
| **Wave 1** | the **best-matched, fairness-balanced** small set — gives top-fit organizers (and a reserved share of new organizers, §8) the first opportunity |
| **Wait** | the **response window** (§5) — organizers accept/decline/pass |
| **Wave 2** | **expand** if not enough accepted — next-best matches |
| **Wait → Wave 3** | **broaden** further under wait/feasibility pressure |

Wave sizing = `f(acceptances still needed, expected acceptance rate, customer wait preference)` — the
same governance as `WORKER §5`. The system **fills the request with the fewest invitations**, never
spamming all organizers (no lead marketplace).

---

## 5. Response window

Each invited organizer has a **bounded response window** (initial concept: **~15 minutes**) to
**accept / decline / pass**. Architecturally, the window **drives wave progression**: if not enough
accept within it, the next wave releases. The exact duration is a **tunable**, not part of the
architecture.

- **No-response within the window = a pass to the next wave, with no penalty** (principle).
- **Shorter** windows favor **speed** (fast-response customers); **longer** windows favor
  **consideration** (broad-search customers) — see §9.

---

## 6. Capacity management

An organizer's **current workload** affects eligibility. An organizer at or near capacity (too many
active events/requests) is **matched less, or not at all**, to protect **quality**, the **organizer**,
and the **customer's outcome**.

- Capacity is **organizer-owned** (they set their availability/limits).
- It is both a **soft factor** (#5, lowers ranking as load rises) and a **hard gate** (overloaded →
  not invited).
- This also **supports fairness** (§8): it stops a few high-capacity incumbents from absorbing all demand.

---

## 7. Trust integration

The **Trust Layer** (`TRUST_AND_VERIFICATION`) influences matching — this market **consumes** standing,
it does not redefine it:

- **Verification is a prerequisite** — being an organizer at all requires the certified-organizer
  credential + access (the access model, `MASTER` Addendum). Safety/regulated event types may require
  **higher verification**.
- **Trust standing is a ranking factor** (#4) — higher-trust/proven organizers rank higher and are more
  visible (Trust §12 trust impact).
- **Trust never permanently excludes** new organizers (§8) — standing raises priority, it does not close
  the door.
- **Objective over subjective** (Trust §3): a customer's "the event was boring" is **not** an organizer-
  trust hit; **patterns** of cancellation/no-show/non-delivery are.

---

## 8. New-organizer fairness

Reuses `WORKER §9A` directly — applied to organizers:

- **Neutral starting standing** — a newly-certified organizer starts at a **neutral baseline**, not last.
- **First-opportunity reserve** — each wave reserves a **share for new/under-exposed organizers**, so a
  zero-history organizer has a real path to a **first client** (opportunity to be *invited*, not a
  guarantee of being *selected* — the customer still chooses).
- **Rotation / anti-saturation** — among comparable organizers, invitations **rotate**, so experienced
  organizers **do not monopolize demand**.
- **Graduated by stakes** — new organizers are matched first to **lower-stakes** requests, earning
  standing safely; high-stakes/regulated requests still require the relevant verification (§7).
- **No permanent exclusion** — inactivity → dormancy (re-activatable), not a black hole.

This is essential: the mission ("more organizers", `MASTER §11.1`) fails if new organizers can never get
a first client.

---

## 9. Customer wait strategy

A trade-off the customer tunes (factor #6):

| Strategy | Behaviour | Trade-off |
|---|---|---|
| **Fast response** | narrow Wave 1 of top matches, short window | quickest match, **fewer options** |
| **Broad search** | larger/more waves, longer windows | **more organizer options/proposals**, slower |

Direct mode is the fastest (one organizer); Marketplace mode supports broad search. The system **defaults
to a sensible balance** and **respects the customer's stated preference**, tuning wave size and window
accordingly. It never sacrifices **fairness** (§8) or **quality** (capacity, §6) for raw speed.

---

## 10. Acceptance workflow

```
Request ─▶ (qualified + assessed) ─▶ Invited (waves) ─▶ Organizer Acceptance ─▶ Matched ─▶ Planning ─▶ OPE
                                          └─▶ Decline / Pass (no penalty) ─▶ next wave
```

| Step | Meaning |
|---|---|
| **Request** | qualified, with its OPE preliminary assessment |
| **Invited** | wave-based invitation to matched organizers (§4) |
| **Acceptance** | an organizer **expresses willingness** (marketplace: a **proposal** from the OPE draft; direct: a yes) — **not a bid** |
| **Matched** | the organizer is selected — by the **customer** (marketplace, choosing on fit) or by acceptance (direct) |
| **Planning → OPE** | the matched organizer plans the event (§11) |

Reuses the existing `customer_requests` / `proposals` / `bookings` primitives (`OPE_V1 §9`), framed as
**controlled matching**, not a race. Payment (existing booking checkout) and contracts are **out of scope
here**.

---

## 11. Handoff to OPE

**Matching ends; planning begins.** Once an organizer is **Matched**, the request **hands off**:

- the organizer uses **OPE** to produce the full plan/proposal (building on the preliminary assessment);
- the engagement becomes a normal **event lifecycle** (`OPE_EVENT_LIFECYCLE`: Draft → Planning → Ready →
  …);
- downstream, the organizer **sources workers/vendors via the Resource Market**.

The Event Request Market's responsibility **ends at the handoff** — it does **not** own planning (OPE),
execution (Lifecycle), or sourcing (Resource Market). Clean boundary, no redefinition.

---

## 12. Learning feedback loop

Reuses `OPE_LEARNING_ARCHITECTURE` — outcomes improve future matching:

| Signal | Improves | Class |
|---|---|---|
| Organizer **acceptance rate** (per type/region) | wave sizing + match priority | auto |
| **Win rate** (accepted by customer) | which organizers to surface | auto |
| **Event completion + customer satisfaction** (objective records, not taste) | Trust standing + ranking | organizer-confirmed |
| **No-show / cancellation** | Trust standing | organizer-confirmed |
| Serious issues | review | **expert / ALH staff** |

**No-response is not a negative signal** (principle). The loop sharpens the six matching factors over
time (e.g. the expected acceptance rate that sizes waves) — without ever moving standing on **subjective**
signals (Trust §3).

---

## Event Request Market summary

- The **demand-side market**: `Customer → Organizer`, distinct from the supply-side Resource Market.
- **Controlled, wave-based matching** — **no first-click race, no bidding, no auctions, no lead sales**;
  organizers **accept** within a **response window**, the customer **chooses on fit**.
- **Six matching factors** — geography, capability, similar-event experience, trust standing, capacity,
  customer wait preference — **balanced by new-organizer fairness** so incumbents never monopolize demand.
- **No-response ≠ penalty**; **UNKNOWN → ASK** at qualification; **no silent dead-match**.
- **Ends at the handoff to OPE** — it discovers and matches the organizer; OPE plans, the Lifecycle
  executes, the Resource Market sources.
- Reuses the **Worker waves/fairness**, the **Trust Layer**, the **Learning loop**, and the **OPE
  assessment** — redefining none of them.

## Relationship to existing architecture

```
Customer demand
     │
EVENT REQUEST MARKET ── qualify (UNKNOWN→ASK) ─ match (waves, fairness) ─ accept ─ MATCH
     │  consumes: Trust standing (Trust Layer)         reuses: Worker waves/fairness
     │  reuses:   Learning signal classes              uses:   OPE preliminary assessment
     ▼  handoff
OPE ───────────▶ plan/proposal  ──▶  EVENT LIFECYCLE (Draft→…→Closed)  ──▶  RESOURCE MARKET (source workers/vendors)
```

- **Trust Layer** owns trust/verification; this market **consumes** standing as a ranking factor.
- **Learning Architecture** owns the signal classes; this market **reuses** them for matching outcomes.
- **OPE** owns planning; this market **hands off** at the match and never plans.
- **Resource Market** owns supply-side fulfillment; this market **precedes** it (demand → match →
  plan → source) and never touches worker/vendor fulfillment or payment.

_Architecture only. No bidding, auctions, lead sales, payment flows, contracts, or worker/vendor
fulfillment. Consolidates and modernizes `OPE_V1 §9`; consistent with the full approved architecture set
and the Organizer-Operating-System principle._

# One-Time Planner — Ticket Sales & Participant Payment Audit

> **Type:** audit only. No code, no doc edits, no architecture/billing changes, nothing committed.
> This file is the requested output; no existing document was modified.
> **Question:** does the current architecture / product / pricing / onboarding / billing /
> implementation set imply a **one-time planner** user can **sell tickets** or **accept participant
> payments**?

---

## Terminology note (important)

"One-Time Planner" is **not a single defined term** in the docs. Two distinct one-time / consumer
concepts exist, and the contradiction lives between them:

- **Event User / "One Event License"** — `MASTER_PRODUCT_DECISIONS.md:550-573`. A per-event,
  $9.99 one-time license holder who is **explicitly not** an organizer.
- **Activity Planner** — `ACTIVITY_PLANNER_MVP_V1.md`. A consumer product (one-time per-plan unlock,
  ~$9.99) that **only generates a plan**.

These are the natural referents of "one-time planner." The first is granted ticket-selling; the
second is explicitly denied it. That mismatch is the core finding.

---

## Direct answers

### Q1 — Is ticket sales currently defined as: (A) organizer-only, (B) all users, (C) inconsistent?

**→ (C) Inconsistent across documents.**

- **Granted to a non-organizer** in governance: the Event User (One Event License) **"May sell
  tickets and manage participants"** — `MASTER_PRODUCT_DECISIONS.md:555`.
- **Restricted to organizers** everywhere else:
  - `ACTIVITY_PLANNER_MVP_V1.md:134-137` — the consumer surface does **not** include "client
    proposals, quoting, organizer margin/platform fee, **marketplace earning** … (these stay
    organizer-only)."
  - `ACTIVITY_PLANNER_MVP_V1.md:165-169` — explicitly out of scope: "marketplace earning, the
    Organizer dashboard … no transacting with venues/suppliers here."
  - `OPE_ACTIVITY_TAXONOMY.md:71` — "**Org-Only** = served via certified organizers, not consumer
    self-serve"; `:194-196` — "money-handling … served through certified organizers … not the
    consumer self-serve planner."
  - `MASTER_PRODUCT_DECISIONS.md:319-320` — "the professional output layer (client proposals,
    **marketplace earning**, the organizer dashboard) additionally requires **certified organizer +
    active subscription**."
  - Implementation reality: `IMPLEMENTATION_GAP_AUDIT_V2.md:56-58` & `IMPLEMENTATION_GAP_AUDIT.md:51-53`
    — an attendee "**cannot buy a ticket from the event page**; they can only pay an **invoice the
    organizer creates**," and self-serve participant checkout is **retired**.

### Q2 — Is Stripe Connect assumed for: (A) organizers only, (B) all event creators, (C) inconsistent?

**→ (A) Organizers only** in every document that actually names Connect — **with an unresolved gap**
(see Q4): the Event-User ticket-selling grant has **no payment rail defined** for it.

- `MASTER_PRODUCT_DECISIONS.md:533-534` — all money flows via "the same Stripe Connect invoice
  checkout path (**destination charge to the organizer's connected account**)."
- `IMPLEMENTATION_GAP_AUDIT_V2.md:49-53,172-175` — "Live money path = **organizer-issued invoice over
  Stripe Connect** … settles to organizer … **all customer money … settles to the organizer via
  Connect**."
- `IMPLEMENTATION_GAP_AUDIT.md:46-53` — "destination charge, settles to the organizer, 100% to
  organizer … only once the organizer has completed **Stripe Connect onboarding**."
- **Gap:** no document defines a Connect (or any) payment rail for an Event User / Activity Planner.
  The billing architecture is silent on non-organizers, while `MASTER:555` says they may sell tickets
  — so Connect is *stated* organizer-only but *implied* needed for a non-organizer that nothing wires.

### Q3 — Every document where a one-time planner is described as selling tickets / collecting payments / receiving money from participants

**Exactly one:**

| Document | Line | Quote | Referent |
|---|---|---|---|
| `MASTER_PRODUCT_DECISIONS.md` | **555** | "May **sell tickets and manage participants**." | **Event User** (One Event License, $9.99 one-time; explicitly *not* an organizer) |

No other document describes a one-time planner / consumer / Activity Planner selling tickets,
collecting payments, or receiving participant money. The Activity Planner docs **explicitly exclude**
it (`ACTIVITY_PLANNER_MVP_V1.md:134-137, 165-169`). Marketing copy makes no such consumer promise —
`HOMEPAGE_CONTENT_V2.md:43-44` references "Certified organizers · Secure payments" as a platform
trust line, not a consumer capability.

### Q4 — Contradictions

1. **Event User ticket-selling vs organizer-only everywhere else (primary).** `MASTER:555` grants a
   non-organizer the right to "sell tickets and manage participants," while the Activity Planner spec,
   OPE taxonomy, the §11 monetization gating, the billing architecture, and both implementation audits
   restrict ticketing / payments / marketplace earning to **certified organizers**. Direct conflict.

2. **Terminology conflation: "Event User" vs "Activity Planner."** The licensing decision
   (`MASTER:550-573`) invents an **Event User / One Event License** who may sell tickets, but the
   product/pricing docs only define an **Activity Planner** consumer that is "plan generation only"
   (`ACTIVITY_PLANNER_MVP_V1.md:1-9, 134-137`). Whether these are the same person/tier is never
   reconciled — so "can a one-time planner sell tickets?" has two answers depending on which name a
   reader uses.

3. **No payment rail for the granted capability.** `MASTER:555` grants ticket-selling, but the billing
   architecture (`MASTER:533-534`) routes **all** money to "the organizer's connected account" and
   defines no Connect onboarding, account, or checkout for an Event User. The capability is asserted
   without a settlement mechanism.

4. **Implementation contradicts the grant outright.** Even for organizers, "self-serve booking
   checkout is **RETIRED**" and attendees cannot buy a ticket from the event page
   (`IMPLEMENTATION_GAP_AUDIT_V2.md:47-58`). So the Event-User "sell tickets" right is not only
   undefined for non-organizers — the self-serve ticket-purchase path does not exist for **anyone**
   today.

5. **Pricing inconsistency (secondary).** The licensing decision lists **Organizer License —
   $19.99 / month** (`MASTER:575`), while `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:32-34,80` lists the
   **Organizer Platform — $9.99 / month**; and the Planner one-time and an organizer subscription both
   appear as $9.99 elsewhere (already flagged in `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_REVIEW.md:83-87`). Not
   a payment-capability contradiction, but an unreconciled pricing conflict in the same tier area.

---

## Evidence index (file:line)

**Grants ticket-selling to a one-time / non-organizer user:**
- `MASTER_PRODUCT_DECISIONS.md:550-557` (Event User), `:555` ("May sell tickets and manage
  participants"), `:570-573` (One Event License $9.99, "Does not grant organizer status").

**Restricts ticketing / payments / earning to organizers:**
- `ACTIVITY_PLANNER_MVP_V1.md:1-9` (consumer, "Not organizers"), `:134-137` ("stay organizer-only"),
  `:165-169` (out of scope: marketplace earning, payments), `:202-208` (paid plan unlock only).
- `OPE_ACTIVITY_TAXONOMY.md:71`, `:194-196` (org-only money handling, not consumer self-serve).
- `MASTER_PRODUCT_DECISIONS.md:311-322` (no free core; professional/earning layer requires certified
  organizer + subscription).

**Money rail = organizer Stripe Connect only:**
- `MASTER_PRODUCT_DECISIONS.md:524-541` (all money via Connect invoice, destination charge to "the
  organizer's connected account").
- `IMPLEMENTATION_GAP_AUDIT.md:44-53,158-161`; `IMPLEMENTATION_GAP_AUDIT_V2.md:47-58,172-175`
  (organizer-only Connect; self-serve checkout retired; settles to organizer).

**Pricing conflicts (secondary):**
- `MASTER_PRODUCT_DECISIONS.md:570,575` ($9.99 One Event / $19.99 Organizer) vs
  `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:32-34,76-80` ($9.99 Planner one-time / $9.99 Organizer
  Platform / month); flag in `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_REVIEW.md:83-87`.

---

## Bottom line

- **One document** (`MASTER_PRODUCT_DECISIONS.md:555`) says a one-time, non-organizer **Event User**
  may **sell tickets and manage participants**.
- **Every other relevant document** — product (Activity Planner), taxonomy, monetization gating,
  billing architecture, and both implementation audits — treats ticket sales, participant payments,
  and Stripe Connect as **certified-organizer-only**, and the implementation has **no self-serve
  ticket/payment path at all** (it is retired).
- The platform therefore **does not consistently define** whether a one-time planner can sell tickets
  or accept participant payments. As stated, it is an **unreconciled contradiction**: granted once at
  the licensing layer, denied everywhere at the product/billing/implementation layer, and backed by no
  payment rail.

*(Audit only — current-state reality of the documents. No recommendations, no changes, nothing
committed.)*

# Ticket Seller — Operating Model (Principle / Decision Record)

> **Status:** product-decision record. **Fixes product decisions only** — no code, no implementation,
> no database, no API, no UI, no architecture redesign. Exists to **prevent future architectural
> discussions from repeating**.
> **Not being built now.** Ticket Seller is **not** on the current implementation path; this document
> only records *what the role is and is not* so the boundary is settled in advance.
> **Frozen context (unchanged):** OPE V2 architecture is frozen; Budget Workspace architecture is
> complete. This document does **not** alter either.

---

## 1. Purpose

Record the **operating model of the Ticket Seller role** as a settled product decision: what a Ticket
Seller is, how it differs from the Organizer and the Client, the problem it solves, and — most
importantly — the workflows and modules it **does and does not** use. The goal is to **stop the
recurring debate** about whether Ticket Seller is "a lighter Organizer." It is not.

---

## 2. Scope

- **In scope:** the *definition*, *boundaries*, *role comparison*, and *responsibility split* of the
  Ticket Seller operating model; which existing platform capabilities it reuses; which future modules
  are expected (as placeholders only).
- **Out of scope:** any design of those future modules; any change to OPE V2, Discovery, FED, IR,
  Project, Budget Workspace, Commercial Proposal, or Vendor Marketplace; any schema, API, UI, payments,
  or implementation detail. **Placeholders are named, never designed.**

---

## 3. Core Principle

> **Ticket Seller is a separate operating model, not a simplified Organizer.**
>
> An Organizer **plans and produces** an event (Discovery → FED → IR → Project → Budget → execution).
> A Ticket Seller **publishes an event they already know and sells tickets to it.** The Ticket Seller
> path **never enters** the organizer planning pipeline. The platform **does not assume** a Ticket
> Seller needs organizer workflows, and must not graft them on "for completeness."

Two distinct value paths coexist on one platform:
- **Organizer path:** "Help me figure out *how* to deliver this event" → planning engine.
- **Ticket Seller path:** "I already know my event — let me **publish and sell**" → direct publish +
  ticketing.

Neither is a subset of the other. They **share platform primitives** (identity, payments rails,
event entity, notifications), but they are **different products for different jobs.**

---

## 4. Ticket Seller definition

A **Ticket Seller** is a platform role whose job is to **create, publish, and sell admission to an
event directly** — without any planning, sourcing, costing, or proposal workflow.

The Ticket Seller already knows their event (what it is, when, where). They do not need the platform
to help them *design* or *cost* it. They need the platform to let them **list it, define ticket
types, take orders, issue tickets, manage attendees, and check people in.**

**Canonical Ticket Seller workflow (decision):**
```
Create Event → Configure Event → Create Ticket Types → Publish → Sell Tickets → Check-in → Event
```

The Ticket Seller is **responsible only for publishing and selling tickets** — not for delivering the
event's internal logistics through any organizer pipeline.

---

## 5. Comparison: Client · Organizer · Ticket Seller

| Dimension | **Client** | **Organizer** | **Ticket Seller** |
|---|---|---|---|
| **Core job** | *Wants* an event delivered | *Plans & produces* an event | *Publishes & sells tickets to* an event |
| **Mental model** | "Organize this for me" | "Help me figure out how to deliver it" | "I already know my event — let me sell it" |
| **Entry point** | Request / brief | Discovery session | **Create Event (direct)** |
| **Uses Discovery / FED / IR** | — (is the source of the request) | **Yes** | **No** |
| **Uses Project (canonical plan)** | No | **Yes** | **No** |
| **Uses Budget Workspace** | No (receives a proposal) | **Yes** | **No** |
| **Uses Commercial Proposal** | **Receives** one | **Produces** one | **No** (sells tickets, not a service) |
| **Uses Vendor Marketplace** | No | **Yes** | **No** |
| **What they sell / buy** | *Buys* the Event Organization Service | *Sells* the Event Organization Service | *Sells* **admission (tickets)** to their own event |
| **Primary surface** | Proposal / engagement | Organizer Workspace | **Ticketing surface** (publish, orders, attendees, check-in) |
| **Relationship to the event** | Commissions it | Delivers it | Owns & fronts it directly |

**One-line distinctions:**
- **Ticket Seller ≠ Organizer:** the Organizer runs the **planning/production pipeline**; the Ticket
  Seller runs a **publish-and-sell** flow and never touches that pipeline.
- **Ticket Seller ≠ Client:** the Client **commissions** an event and **receives** a proposal; the
  Ticket Seller **owns** their event and **sells admission** to it.

---

## 6. What problem does Ticket Seller solve?

People and organizations who **already have a defined event** and simply need to **publish it and sell
tickets** — a concert, class, workshop, meetup, fundraiser, screening, community night. They do **not**
need help planning, sourcing vendors, costing, or producing a commercial proposal. Today the only path
is the organizer planning pipeline, which is **overkill and wrong-shaped** for this job.

Ticket Seller solves: *"Let me list my event and sell admission, fast, without being forced through a
planning engine I don't need."*

---

## 7. Responsibilities (workflows that belong to Ticket Seller)

1. **Create Event** — register the event directly (no Discovery/FED/IR).
2. **Configure Event** — set the event's public details (title, date/time, location, description).
3. **Create Ticket Types** — define admission products (e.g., General, VIP, Early-bird), prices,
   quantities.
4. **Publish** — make the event and its ticket types publicly purchasable.
5. **Sell Tickets** — take orders and payment for admission.
6. **Manage Attendees** — the list of ticket holders.
7. **Check-in** — admit attendees at the event.
8. **(View) Analytics & Payouts** — sales/attendance reporting and receiving proceeds.

These map to the named **future modules** (placeholders only, §10): Ticket Types · Orders · Tickets ·
Attendees · Check-in · Analytics · Payouts.

---

## 8. Excluded responsibilities (explicitly NOT Ticket Seller)

The Ticket Seller operating model **does not use** any of the following — by decision, not omission:
- **Discovery** (no discovery session).
- **FED** (Future Event Description).
- **IR** (Implementation Requirements).
- **Project** (the canonical OPE plan).
- **Budget Workspace** (no cost lines, vendor quotes, organizer fee, or totals).
- **Commercial Proposal** (a Ticket Seller sells **tickets**, not an Event Organization Service).
- **Vendor Marketplace** (no sourcing of resources/roles).

Equivalently: **no planning, no sourcing, no costing, no proposing.** The platform must **not** assume
a Ticket Seller needs these and must not route them through any organizer workflow.

---

## 9. Shared platform capabilities (what both roles share)

Ticket Seller and Organizer are different operating models but live on **one platform** and share its
**foundational primitives** (shared, not the planning pipeline):
- **Identity & accounts** — the same user/account and auth layer; a single person may hold either or
  both roles (§11).
- **The Event entity** — both ultimately reference an event; the Organizer arrives at one via planning,
  the Ticket Seller creates one directly. (Same primitive, different path to it.)
- **Payments rails** — the platform's payment/payout infrastructure (Stripe etc.) — *infrastructure
  only; specific money flows are out of scope here*.
- **Notifications / messaging** — platform comms.
- **Platform shell** — navigation, settings, branding.

What is **intentionally different**: the **entire planning/production pipeline** (Discovery → FED → IR
→ Project → Budget → Proposal → Marketplace) belongs to the Organizer model **only**; the **ticketing
surface** (publish, ticket types, orders, attendees, check-in, payouts) belongs to the Ticket Seller
model **only**. Sharing happens at the **primitive** layer, never at the **workflow** layer.

---

## 10. Future evolution

**Existing modules reused (today's platform):** identity/accounts, the Event entity, payments/payout
rails, notifications, platform shell. **The OPE V2 planning pipeline and Budget Workspace are NOT
reused** by the Ticket Seller path.

**Future modules expected (placeholders only — do NOT design here):**
`Ticket Types` · `Orders` · `Tickets` · `Attendees` · `Check-in` · `Analytics` · `Payouts`.
These are **names reserved** to anchor future discussion; this document deliberately specifies **none**
of their internals.

**Role interchange (decisions):**
- **Can an Organizer also be a Ticket Seller?** **Yes.** The same account may operate in both models
  (e.g. plan one event as Organizer, publish-and-sell another as Ticket Seller). The roles are
  **additive capabilities on one identity**, not mutually exclusive accounts.
- **Can a Ticket Seller later become an Organizer?** **Yes.** A Ticket Seller may adopt the Organizer
  model for a future event by entering the planning pipeline (Discovery → …). This is a **role
  expansion**, **not** a migration or upgrade of the Ticket Seller's existing published events — those
  remain in the ticketing model. Becoming an Organizer **never retro-fits** planning artifacts onto an
  already-published Ticket Seller event.
- **Direction of the boundary:** crossing roles means **entering the other model's workflows**, never
  blending them on a single event. One event is governed by **one** operating model.

---

## 11. Summary of the fixed decisions

- Ticket Seller is a **separate operating model**, **not** a simplified Organizer.
- Ticket Seller **creates and publishes events directly** and is responsible **only for publishing and
  selling tickets**.
- Ticket Seller **does not use** Discovery, FED, IR, Project, Budget, Commercial Proposal, or Vendor
  Marketplace.
- Canonical flow: **Create Event → Configure → Create Ticket Types → Publish → Sell → Check-in →
  Event.**
- Both roles **share platform primitives** (identity, Event entity, payments rails, notifications), and
  are **intentionally different** at the workflow layer.
- **One identity may hold both roles**; role interchange is **additive**, governed **per event by a
  single operating model**.
- Future ticketing modules are **named placeholders only** — not designed here.

---

## 12. Open questions (deferred — do not resolve here)

These are flagged so future work has a list, **not** resolved in this decision record:
- **OQ1 — Payments/payout specifics:** how Ticket Seller proceeds, platform fees, taxes, and refunds
  flow (deferred; shares rails with the platform but the money model is a separate decision).
- **OQ2 — Event-entity reconciliation:** the exact relationship between a directly-created Ticket
  Seller event and the OPE-produced Project event (same `Event` primitive vs. parallel types) — a
  data-model decision for when ticketing is actually built.
- **OQ3 — Surface placement:** whether the ticketing surface is a distinct workspace or a mode within
  the existing shell.
- **OQ4 — Mixed events:** whether an Organizer-planned event may *also* sell tickets via the Ticket
  Seller modules (a per-event single-model rule is asserted in §10; the integration mechanics are
  deferred).

---

*Decision record only. No code, no implementation, no schema, no API, no UI. OPE V2 and Budget
Workspace unchanged. Future ticketing modules are placeholders, not designs. Not committed, not
pushed.*

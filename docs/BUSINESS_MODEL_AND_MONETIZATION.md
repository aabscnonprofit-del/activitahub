# Business Model & Monetization — ActivLife Hub

> **Type:** business strategy document. **Not** architecture, implementation, pricing-page copy, or a
> financial forecast.
> **Defines:** how ActivLife Hub earns money, what is charged, what is **never** charged, and the
> incentives the model must preserve.
> **Source of truth:** `MASTER_PRODUCT_DECISIONS.md` (§7 monetization, §11.8 principle, §3 certification,
> §4 payments), `OPE_V1_TECHNICAL_DESIGN.md`, `WORKER_NETWORK_ARCHITECTURE.md`,
> `VENDOR_NETWORK_ARCHITECTURE.md`, `RESOURCE_MARKET_ARCHITECTURE.md`.
> **Date:** 2026-06-10.

---

## Core principle

**ActivLife Hub earns money when it creates value.**

The platform charges for **tools it provides** and **transactions it genuinely brokers and manages** — not
for the mere existence of relationships inside the ecosystem. Specifically:

> **The platform must not monetize organizer-owned relationships simply because they exist.**

This is the strategic spine of the whole model and the direct expression of the platform's
helper-not-protagonist philosophy (`MASTER §11.2`): the organizer is the hero; the platform is paid for
helping, never for standing between an organizer and a relationship they already own.

---

## Revenue streams

### 1. Organizer subscription — *primary revenue*

The main, recurring revenue source. It buys **access** to the organizer toolset:
- **OPE** (planning engine),
- planning, management, and execution tools,
- organizer workflows (clients, calendar, participants, promotion, etc.).

**Principles:**
- Subscription pays for **capability the platform builds and runs** — clear value for a clear fee
  (consistent with `MASTER §11.8`: "no free core; gating by access/credential").
- It is **gated by certification + active subscription** (the access model in `MASTER` Addendum / §3): a
  one-time **certification** establishes the credential; the **subscription** sustains access after the
  30-day included window.
- Exact tiers and price are a **business decision, not set here** (`MASTER P11` open).

### 2. Resource Market commissions

A commission on **platform-mediated supply-side transactions** in the Resource Market — a **worker or
vendor booked, paid, and managed through the platform** (`RESOURCE_MARKET §11`).

- **Approved assumption: 3% commission**, applied **only when the platform creates and manages the
  transaction**.
- It funds the **brokerage + coordination value** the Resource Market adds (discovery → booking →
  payment → dispute/ratings), **not** the existence of the participants.
- It applies at the **R3+ transaction tier** of the Resource Market ladder; nothing below R3 carries a
  fee.

### 3. Premium services — *future, optional*

Optional, value-added revenue layered on top — paid only by those who want the extra protection or reach:
- **escrow**, **insurance**, **guaranteed replacement**, **premium promotion**, **advanced
  verification**, **premium certifications**.
- These are **opt-in** and **additive**; none is required to use the core platform.
- **Prices are not defined here.**

*(Consumer-side note: per `MASTER §11.8` the Activity Planner is intended to be a paid consumer product;
its model and free-tier scope are an open pricing decision — see Future Pricing Decisions — not a
separate stream resolved in this document.)*

---

## Non-revenue principles (what is never charged)

### No commission on existing relationships
If an organizer brings **their own vendor, worker, or contractor**, the platform **does not
automatically charge commission**. A relationship the organizer already owns is theirs.

### No commission on imported networks
**Importing a network creates no monetization obligation.** Import accelerates the organizer's planning
(`VENDOR §3`); it never converts the organizer's contacts into a platform revenue stream.

### No commission on private coordination
**Private relationships remain private** (`VENDOR §2`). Coordinating with one's own resources off the
marketplace incurs no fee, and the platform never exposes or appropriates those relationships.

---

## Resource Market commission conditions

The Resource Market may charge commission **only when all three are true**:
1. **Discovery** occurred **through the platform**,
2. **Booking** occurred **through the platform**, and
3. **Transaction management** (payment/escrow/coordination) occurred **through the platform**.

**The platform must not charge commission merely because participants exist inside the ecosystem.** A
worker or vendor being *registered* is not a billable event; only a *brokered, managed transaction* is.
This is the explicit **anti-organizer guard** (`RESOURCE_MARKET §11`).

---

## Incentive alignment — why the model exists

The model is shaped to grow all three sides while keeping trust:

- **Encourage organizer adoption** — organizers pay for tools that demonstrably help them, and are
  **never penalized for using their own network**; they keep their relationships and their margins.
- **Encourage vendor adoption** — vendors are acquired by **demonstrated demand** (`VENDOR §6`), not cold
  recruitment, and are not taxed for relationships they already had with an organizer.
- **Encourage worker adoption** — workers join **free** (`WORKER §3`); the platform earns only when it
  brokers paid work, aligning the platform's income with workers actually getting hired.
- **Avoid anti-organizer behavior** — the platform's incentive is to **create new value** (new
  discovery, new transactions, new protection), not to insert itself into value the organizer already
  created.
- **Avoid relationship confiscation** — because the platform never claims ownership of imported/private
  relationships, organizers can safely bring their networks in. **Trust enables contribution; confiscation
  would destroy it.**

In short: **the platform prospers when its users prosper** — it is paid for tools and brokered
transactions, and grows by being worth using, not by locking people in.

---

## Future pricing decisions (unresolved — not resolved here)

- **Subscription levels** — number/shape of tiers (`MASTER P11`: price still open, $9.99 vs $29).
- **Free-tier scope** — whether/where any free entry exists, and the consumer **Activity Planner**
  monetization model (currently a temporary free state vs the §11.8 "paid product" intent).
- **Premium service pricing** — escrow / insurance / guaranteed replacement / promotion / verification.
- **Enterprise plans** — pricing for larger organizers/agencies.
- **Certification pricing** — the credential model is set (one-time paid certification, `MASTER §3`); exact
  figures remain a business decision.

These are **flagged, not decided.**

---

## Approved monetization summary

- **Earn when value is created** — never monetize relationships just because they exist.
- **Three revenue streams:** (1) **organizer subscription** (primary — tools/OPE/workflows, gated by
  certification + subscription); (2) **Resource Market commission** (**3% assumed**, **only** on
  platform-mediated discover-book-manage transactions, R3+); (3) **premium services** (future, opt-in).
- **Never charged:** existing relationships, imported networks, or private coordination. Registration is
  not a billable event; only a **brokered, managed transaction** is.
- **Commission preconditions:** discovery **and** booking **and** transaction management, all through the
  platform.
- **Incentive:** grow organizer, vendor, and worker adoption by being worth using — **no anti-organizer
  behavior, no relationship confiscation.**
- **Open:** subscription tiers/price, free-tier & consumer-planner scope, premium pricing, enterprise,
  certification figures.

_Business strategy only. No architecture, implementation, pricing-page copy, or financial forecasting.
Consistent with the Master Product Decisions, the OPE design, and the Worker/Vendor/Resource-Market
architecture._

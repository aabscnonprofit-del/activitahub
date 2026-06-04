# Master Product Decisions — ActivLife Hub

> **Purpose:** the single source of truth for future **ActivLife Hub** development
> discussions. Product and engineering decisions are recorded, referenced, and amended
> here.
> **Status:** living document · **Last updated:** 2026-06-04
> **Status legend:** ✅ Decided & verified · 🟡 Decided, partially built · 📐 Designed, not built · ❓ Open

> Brand note: the product brand is **ActivLife Hub** (as shown across the UI). The
> repository/package name `activitahub` is historical and does not change the brand.

---

## 1. Current product vision

**ActivLife Hub is a trust-first platform connecting people who want real-world
experiences and events with vetted, skilled organizers.** ✅

- Discovery is **emotional / scenario-based**, organized around real moments and
  communities — not generic categories.
- **Trust is the product:** organizers carry meaningful, paid credentials (Verified
  and/or Certified — §3) before they can transact.
- **Organizer capability is the moat:** OPE™ (§5) gives organizers planning leverage
  no generic events site offers.
- Multi-language: English · Español · Français · Русский.

---

## 2. Marketplace structure

The platform runs **two independent supply/demand models**:

### Ready Activities (supply-first) ✅
Organizers publish activities in advance; users discover and join them.
*Examples:* Yoga on Lisbon Beach · Painting Workshop near the Louvre · Sunset Run
around Diamond Head. Backed by the `activities` table + marketplace search.

### Event Requests (demand-first) 🟡
Users request an event that does not yet exist; organizers fulfill it.
*Examples:* Wedding · Birthday · Community Festival · Charity Run · Corporate Event ·
Custom Event. Backed by `customer_requests` + proposals; OPE produces a preliminary
assessment before the request reaches organizers (§5, §6).

---

## 3. Organizer model

Progressive trust tiers:

- **Regular users** ✅ — participants who discover and join Ready Activities and post
  Event Requests. Default state on sign-up (participant-first).
- **Organizers** ✅ — users who have opted into the organizer path and can create
  activities / receive requests once credentialed and subscribed.
- **Verified Organizer** 🟡 — an **identity & legitimacy** badge earned via a paid
  **verification** step (real person/business, vetted). Signals "this is a trustworthy,
  accountable organizer."
- **Certified Organizer** ✅ — a **skill & quality** badge earned by paying for and
  completing certification (course and/or final exam). Signals "this organizer is
  trained to ActivLife Hub standards."

**Both badges are possible on one organizer** — Verified and Certified are independent
and stackable (an organizer can hold either, both, or neither). They answer different
questions: Verified = *who they are*; Certified = *what they can do*.

> Implementation note: **Certified** is live in the role/onboarding model
> (`certified_organizer`, `onboarding_status`). **Verified** is a newly-defined badge
> in this document and is **not yet represented in the schema** — it will need a data
> model + verification flow when prioritized. 📐

---

## 4. Stripe / payment status

The payment spine is Stripe, with a webhook as the single authoritative writer of
billing state. Verified end-to-end in **Stripe test mode** (`STRIPE_CHECKOUT_QA.md`):

- **Certification payment — VERIFIED** ✅ (one-time; case 1.1). Webhook →
  `payment_complete`, customer + `payments` row written.
- **Subscription payment — VERIFIED** ✅ (recurring; case 2.1). Webhook →
  `subscriptions` active, profile → `certified_organizer` / `subscribed`.
- **Dashboard unlock — VERIFIED** ✅ — gate (`certified_organizer` + active
  subscription) satisfied; dashboard reachable.

Pending (not yet verified): billing portal / cancel / past-due / invoice cases, webhook
robustness, and booking-payment/refund cases. 🟡

---

## 5. OPE™ — Organizer Planning Engine

**Core organizer value proposition.** Design: `docs/OPE_V1_TECHNICAL_DESIGN.md`. 📐

- **Organizer Planning Engine** — turns an event scenario or inbound Event Request into
  a structured, editable plan with a cost estimate.
- **Scenario knowledge base** — a curated, versioned, **internal** knowledge base of
  planning know-how and pricing references (timelines, tasks, resources, regional
  notes). Not user-facing (see §9).
- **Scenario adaptation** — the engine adapts a base scenario to the specifics
  (guests, region, budget, venue, vibe, constraints) rather than emitting a fixed
  template.
- **Preliminary planning assessment** — for Event Requests, OPE estimates prep hours,
  staffing, equipment, vendors, logistics, budget, and operational risks **before** the
  request reaches organizers.
- **Budget / cost estimation** — a **deterministic** engine computes all money
  (low / likely / high). The LLM proposes *what*; the engine computes *how much*. Never
  mixed.
- **Organizer editing** — organizers edit quantities, staffing, schedule, budget, and
  requirements; OPE **recalculates deterministically** (no new LLM call).

---

## 6. Event Request Marketplace

An Event Request (with its OPE assessment) reaches organizers in one of two modes:

- **Marketplace Mode** 📐 — the request becomes visible to qualified organizers;
  organizers submit proposals; the client selects an organizer.
- **Direct Organizer Mode** 📐 — the client selects an organizer first; the request is
  routed only to that organizer.

Both converge on the existing proposal → booking → payment path. ✅

---

## 7. Monetization

Revenue streams, current and planned:

- **Verification fee** 🟡 — paid step to earn the **Verified Organizer** badge (§3).
  Amount/cadence TBD.
- **Certification fee** ✅ — one-time payment to pursue certification
  (**$99** beginner course · **$29** experienced skills test).
- **Organizer subscription** ✅ — recurring fee to operate (access the dashboard);
  **$9.99/month** per the billing flow.
- **Lead / proposal fees** 🔜 *(future)* — charging organizers for access to / responding
  to Event Request leads.
- **Commission** 🔜 *(future)* — a platform percentage on bookings. **Not implemented
  today** (booking checkout currently charges the full amount with no platform cut).

> Note: the $49/$29/$19 values used during the Stripe test pass were throwaway QA
> prices, not product prices.
> Open: reconcile the public Pricing page ($29/mo tier) with the $9.99/mo billing flow.

---

## 8. Current roadmap

1. **Finish DB migration verification** — confirm 015/016/phase9 applied and consistent
   (015 organizer slugs verified present; keep DB state validated). 🟡
2. **Booking payments / refunds — later** — defer full booking-payment + refund test
   pass until after the core organizer path and OPE direction are settled.
3. **OPE design review before implementation** — review `docs/OPE_V1_TECHNICAL_DESIGN.md`
   (incl. its §13 open questions) and sign off **before** any OPE code is written.

Sequencing principle: verify the operational payment + organizer path → review OPE
design → implement OPE → revisit booking payments/refunds and future monetization.

---

## 9. Important constraints

These are guardrails for every future decision:

- **Do not turn the project into a generic Meetup clone.** ActivLife Hub is
  trust-first and organizer-capability-first, not an open social-events feed.
- **Do not overbuild social features early.** Resist feeds, follows, comments, group
  chat, and similar engagement mechanics until the organizer/marketplace core proves out.
- **OPE™ is a core organizer value proposition** — protect it as a differentiator;
  prioritize organizer planning leverage over breadth of consumer features.
- **Scenarios are an internal knowledge base, not a user-facing catalog.** Users never
  browse "scenarios"; the scenario KB powers OPE's assessments and plans behind the
  scenes.

---

## Source-of-truth index

- **OPE & Event Request Marketplace:** `docs/OPE_V1_TECHNICAL_DESIGN.md`
- **Stripe / payments status:** `STRIPE_CHECKOUT_QA.md`, `lib/stripe/*`,
  `lib/actions/billing.ts`, `app/api/stripe/webhook/route.ts`
- **Schema:** `supabase/migrations/001`–`016`, `supabase/seed/*`
- **Access control / gates:** `middleware.ts`
- **Taxonomy:** `lib/categories.ts`
- **Copy & prices (per-locale):** `messages/{en,es,fr,ru}.json`

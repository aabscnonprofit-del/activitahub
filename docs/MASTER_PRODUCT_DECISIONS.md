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
  (**$99.00** beginner course · **$39.99** experienced skills test).
- **Organizer subscription** ✅ — recurring fee to operate (access the dashboard);
  **$19.99/month** per the billing flow.
- **Lead / proposal fees** 🔜 *(future)* — charging organizers for access to / responding
  to Event Request leads.
- **Commission** 🔜 *(future)* — a platform percentage on bookings. **Not implemented
  today** (booking checkout currently charges the full amount with no platform cut).

> Note: the $49/$29/$19 values used during the Stripe test pass were throwaway QA
> prices, not product prices.
> Open: reconcile the public Pricing page ($29/mo tier) with the $19.99/mo billing flow.

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

## 10. New decisions — 2026-06-04

> Added 2026-06-04. These **extend** §1–§9; no prior decision is changed.
> Full journey detail: `docs/ORGANIZER_CAREER_PATH_V1.md`.

### 10.1 Primary Audience ✅ Decided & verified
**Primary Audience:** aspiring organizers seeking a new income source, side income, or a new
career path. Typical examples:
- career changers
- unemployed individuals seeking a profession
- parents returning to the workforce
- immigrants building a new life
- community leaders who already organize people informally

**Core promise:** *"Turn your ability to bring people together into a profession."*

**Secondary Audience:** experienced organizers seeking efficiency, planning leverage, better
proposals, and more clients.

### 10.2 ActivLife Hub is an Organizer Career Platform ✅ Decided
ActivLife Hub is **not only a marketplace** — it is an **Organizer Career Platform**. It helps
people: 1) Learn → 2) Get Certified → 3) Find Clients → 4) Run Events → 5) Earn Income →
6) Grow as Professional Organizers. Marketplace, Certification, and OPE are **components
supporting this journey**, not the end in themselves.

### 10.3 OPE Primary Outcome — Client Proposal Generator ✅ Decided
OPE's **primary outcome** is a **Client Proposal Generator**: help organizers create professional
client proposals in **minutes instead of hours**. Generated outputs include:
- Executive Summary
- Event Timeline
- Staffing Plan
- Resource Plan
- Budget Estimate
- Risk Assessment
- Proposal-ready Document

**Priority order:**
1. Client Proposal Generator
2. Attach Proposal to Client Request
3. Proposal PDF Export
4. Convert Proposal into Marketplace Activity

> This **answers OPE design §13 Q4** (output destination priority): proposal generation is
> primary; "convert to activity" drops to priority 4.

### 10.4 Success Definition ✅ Decided
For aspiring organizers, **success is not certification**. Success is reaching:
**First Client → First Event → First Income.**
**Long-term success:** stable recurring income as an organizer.
Certification is a **milestone, not the final goal**. (Consistent with the Career Path north-star,
`ORGANIZER_CAREER_PATH_V1.md` §5.)

---

## 11. Platform Structure & Engine — 2026-06-05

> Added 2026-06-05 from the architectural consolidation
> (`MASTER_DECISIONS_UPDATE_PROPOSAL.md` → reviewed in `MASTER_DECISIONS_APPLY_PLAN.md`).
> These **extend** §1–§10; no prior decision is changed.
> Sources: `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`, `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`.

### 11.1 Mission ✅ Decided
**"The World Needs More Organizers."** Society runs on the people who bring others together —
friendship, community, celebration, and shared activity are created, not automatic. Our mission is to
**increase the number of organizers in the world** and, where they want it, turn that ability into a
profession. (The "why" behind the §1 vision.)

### 11.2 Philosophy ✅ Decided
**"People create the best moments of real life. We help."** The human is the hero; ActivLife Hub is
the **helper, not the protagonist**. We do not create friendship or communities — we make it easier
for the people who do. We measure success by what people achieve with our help.

### 11.3 Core Product Filter ✅ Decided
Every new feature must answer: **"Does this help people become better organizers?"** If **no**, it is
**potential scope creep** and is cut. This is the positive, testable complement to the §9 constraints.

### 11.4 Platform Structure — three loops ✅ Decided
ActivLife Hub is **three interconnected product loops** (a layer above the §2 marketplace models):
- **Activity Planner** — for everyday users (plan one specific activity; see §11.5).
- **Organizer Academy** — for people learning the profession (Learn → Certify → First Client → First
  Income).
- **Organizer Platform** — for working organizers (efficiency, scale, clients; OPE, proposals,
  audience building, activity management, analytics).

Funnel: organize *one* activity → learn the craft → run it as a business.

### 11.5 Activity Planner ✅ Decided
An **official user-facing surface**: help an everyday user organize **one specific activity without
becoming an organizer** (e.g. Birthday, Picnic, BBQ, Immigrant Meetup, Family/Hobby Gathering). It is
a **surface over OPE Core** (§11.6), **not a separate product**, and it can bridge to the marketplace
(a user's plan can become an Event Request — demand).
> **Supersedes** the OPE design non-goal "No customer-facing planner (organizer-only)"
> (`OPE_V1_TECHNICAL_DESIGN.md` §1.3). **OPE §1.3 is to be amended separately** (not in this file).

### 11.6 Single Engine Strategy ✅ Decided
Activity Planner and the Organizer Platform are **surfaces over one shared OPE Core**
(scenario · knowledge base · planning workflow · cost engine). They differ only in **input depth,
output template, capability gating, and pricing layer**. The **OPE Core is shared**; only the
**professional output layer** (client proposals, quoting, marketplace earning) is organizer-gated.
The **Knowledge Base and Pricing logic are shared Core content**, authored once per category (Wedding
is the template), serving users, organizers, and Event-Request assessments alike. No second engine.

### 11.7 Two-sided Design & Homepage Positioning ✅ Decided
- **Design for both sides:** **User = demand**, **Organizer = supply**; neither side works alone. Every
  major decision considers both sides and the health of the loop between them.
- **Homepage order:** **user-first** (first screen speaks to demand — find/plan/make an activity real),
  **organizer-second** (second level recruits supply — "turn it into a profession"). Lead with demand
  to build the audience, then convert a meaningful slice into supply.

### 11.8 Monetization Principle, Subscription & Gating ✅ Decided (model)
**Monetization principle:** *Every meaningful value layer of ActivLife Hub has a pricing model.*
There is **no free core product** — each of the three loops (§11.4) is a **paid** product:
- **Activity Planner** — a **paid** user-facing product.
- **Organizer Academy** — **paid** (the certification path).
- **Organizer Platform** — **paid** (organizer subscription, per §4).

Gating is therefore by **access / credential, not by free-vs-paid**: any paying user can use the
Activity Planner; the professional output layer (client proposals, marketplace earning, the organizer
dashboard) additionally requires **certified organizer + active subscription** (per §4). The specific
pricing model per layer (one-time, subscription, or per-use) is left to implementation — **no specific
prices are set here**; the paid model and the principle are decided.

### 11.9 Deferred & open items (tracked, not yet decided)
- **Deferred** (decide before OPE build, see `MASTER_DECISIONS_UPDATE_PROPOSAL.md`):
  **P9** OPE artifact & "proposal" naming standard; **P10** canonical OPE output schema.
- **Open** (no decision yet): **P11** subscription price ($9.99 vs $29 — see §4); **P12** Verified
  Organizer data model + verification fee (see §3/§7); **P13** career-journey model consolidation
  (6-step §10.2 vs 9-stage Career Path).

---

## Source-of-truth index

- **OPE & Event Request Marketplace:** `docs/OPE_V1_TECHNICAL_DESIGN.md`
- **Stripe / payments status:** `STRIPE_CHECKOUT_QA.md`, `lib/stripe/*`,
  `lib/actions/billing.ts`, `app/api/stripe/webhook/route.ts`
- **Schema:** `supabase/migrations/001`–`016`, `supabase/seed/*`
- **Access control / gates:** `middleware.ts`
- **Taxonomy:** `lib/categories.ts`
- **Copy & prices (per-locale):** `messages/{en,es,fr,ru}.json`

---

## Decision — Certification-triggered 30-day Organizer Platform access (2026-06-07)

**Status: FINAL · implemented (DB migration pending manual apply).**

Certification includes a time-boxed Organizer Platform access window:

- **Beginner Path ($99.00)** includes: Organizer Course · Qualification Exam · ActivLife Organizer Certificate · **30 days of Organizer Platform Access**.
- **Experienced Path ($39.99)** includes: Qualification Test · ActivLife Organizer Certificate · **30 days of Organizer Platform Access**.

Rules (non-negotiable):
1. The 30-day access **begins only when certification is successfully completed** (the ActivLife Organizer Certificate is issued) — **not at payment time**.
2. **No Organizer Platform publishing privileges before certification.**
3. After the included 30 days expire, an **active Organizer Platform subscription** is required to continue publishing, managing, and accepting bookings.
4. **Retakes / re-certification do not extend or re-grant** the window (granted once, on first certification).
5. If a user subscribes during the included window, the **paid subscription starts immediately** (no Stripe trial/deferral implemented).

**Implementation:** the window is an internal entitlement on `profiles.organizer_access_until` (TIMESTAMPTZ, nullable), set at first certification by an `AFTER INSERT ON certificates` trigger (`supabase/migrations/017_organizer_access.sql`). Effective access = `role ∈ {certified_organizer, admin}` **AND** (`subscription.status ∈ {active, trialing}` **OR** `organizer_access_until > now()`), centralised in `lib/auth/organizer-access.ts` and enforced in `middleware.ts` (dashboard) and the organizer write actions. **No Stripe pricing change; no Stripe trial.**

## Decision — Final Billing Architecture (2026-06-16) ✅ Decided

**Customer Request → Proposal → Booking → Invoice(s) → Payment.**

**Rules:**

1. **Booking is agreement only** — it records the accepted engagement.
2. **Booking is not a payment rail** — it does not hold or move customer money.
3. **All customer money flows through invoices** — invoices are the single payment surface.
4. **Future deposit, final, and additional invoices all use the same Stripe Connect invoice
   checkout path** (destination charge to the organizer's connected account); there is no
   separate per-kind payment mechanism.
5. **OPE must create/coordinate invoices, not direct Stripe payments** — OPE issues and
   sequences invoices; it never calls Stripe checkout directly.

**Rationale:** one money rail keeps charge routing, the webhook, refunds, and Connect
gating consistent, decouples the agreement record from the money record, and gives OPE a
single billing surface to drive milestone-based invoicing.

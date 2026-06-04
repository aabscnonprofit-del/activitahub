# Master Product Decisions — ActivitaHub

> **Purpose:** the single source of truth for ActivitaHub's architectural and business
> decisions. Future product/engineering discussions reference and amend **this** file.
> **Status:** living document · **Last updated:** 2026-06-04
> **Grounding:** every decision below is tied to a real artifact (migration, file, or
> design doc). Where the codebase is internally inconsistent or a decision is not yet
> made, it is called out under **Open decisions (§10)** rather than papered over.

**Legend:** ✅ Decided & shipped · 🟡 Decided, partially built/verified · 📐 Designed, not built · ❓ Open

---

## 1. Platform vision

**ActivitaHub is a two-sided platform connecting people who want real-world
experiences and events with trusted, certified organizers.** ✅

- **Two supply/demand models** (see §6): organizers publish **Ready Activities** that
  users discover and join; users post **Event Requests** for events that don't exist
  yet, which organizers fulfill.
- **Discovery is emotional/scenario-based**, not generic SaaS categories — built around
  real moments and communities (`lib/categories.ts`, migration `016`).
- **Multi-language from day one:** English, Español, Français, Русский (`next-intl`,
  `messages/*.json`). ✅
- **Trust is the core differentiator:** only certified, subscribed organizers can
  transact; public organizer profiles carry verifiable certification (§3).

**Stack of record:** Next.js 15 (App Router, Server Components + Server Actions) ·
TypeScript · Tailwind · Supabase (Postgres + RLS + `SECURITY DEFINER` RPCs) · Stripe ·
zod · next-intl. ✅

> **Brand-name note (❓):** the package/repo is **ActivitaHub**, but UI copy renders
> **"ActivLife Hub"** (e.g. onboarding/billing headers, certificate text). Canonical
> public brand name is undecided — see §10.

---

## 2. Organizer model

- **Participant-first default.** ✅ Sign-up lands a new user on `/account` as a
  participant; becoming an organizer is an explicit opt-in path (`middleware.ts`,
  "Participant-first flow" commit).
- **Role enum** (`user_role`, migration `001`): `guest · student · organizer ·
  certified_organizer · admin`. ✅
- **Two onboarding paths** to become an organizer (`lib/stripe/config.ts`):
  - **Beginner** → paid certification **course** (academy).
  - **Experienced** → paid **skills test** (exam-only).
- **Onboarding state machine** (`onboarding_status`):
  `not_started → path_selected → payment_complete → certified → subscribed`. ✅
- **Organizer workspace** is `/dashboard/*`: activities, venues, calendar, clients,
  requests, proposals, bookings, analytics, profile, settings (migrations `006`,
  `008`, `009`, `013`; `app/[locale]/dashboard/*`). ✅

See the canonical state machine note in the memory file `org-access-state-machine`
and §3/§4 below for what each transition unlocks.

---

## 3. Verified / certified organizers

**Certification is mandatory to operate.** ✅ It is the platform's trust spine.

- Path → **one-time certification payment** → **academy course and/or final exam**
  (`submit_exam` RPC, migrations `003`/`005`) → profile advances to **`certified`**.
- A **verifiable certificate** is issued: public verification page `/verify/<code>`
  plus QR (the `qrcode` dependency; certificate copy in `messages/*`). ✅
- **Public organizer profile** at **`/o/<slug>`** (migration `015`, organizer slugs)
  with a **certified badge**, activities, and social proof ("Trust + social proof"
  commit). ✅
- Certification is **never auto-revoked** on subscription loss; losing an active
  subscription only **gates dashboard access**, not the certification itself
  (`lib/stripe/sync.ts`). ✅

---

## 4. Subscription model

- **An active recurring subscription is required to access the organizer dashboard.** ✅
  Gate (`middleware.ts`): `role ∈ {certified_organizer, admin}` **AND** a
  `subscriptions.status = 'active'` row (admins bypass).
- **Stripe-backed, webhook-authoritative.** ✅ Subscription checkout
  (`createSubscriptionCheckout`), self-serve **billing portal**
  (`createBillingPortalSession`), and a webhook that is the *single writer* of billing
  state (`app/api/stripe/webhook/route.ts`, `lib/stripe/sync.ts`).
- **Statuses handled:** `active · past_due · cancelled` (Stripe `canceled` → DB
  `cancelled`). `cancel_at_period_end` keeps access until period end. ✅
- **Price:** **$9.99 / month** per the activation/billing copy
  (`billing.noSubscription`, `messages/*`). 🟡
  > **Inconsistency (❓):** the public **Pricing page** advertises a **$29/month** tier
  > while the billing/activation flow charges **$9.99/month**. Canonical price must be
  > reconciled — see §10.
- **Verification status:** subscription checkout → active → dashboard unlock is
  **verified end-to-end in Stripe test mode** (`STRIPE_CHECKOUT_QA.md`, case 2.1).
  Portal/cancel/past-due/invoice cases (2.3–2.6) are **pending**. 🟡

---

## 5. OPE — Organizer Planning Engine

**Full design:** `docs/OPE_V1_TECHNICAL_DESIGN.md`. 📐 (designed, not implemented)

- **What:** given an event **scenario** (or an inbound Event Request), OPE produces a
  structured, editable **plan** — phased timeline, tasks, resource/vendor/staffing needs,
  venue suggestions — plus a **cost estimate** (low / likely / high).
- **Hard architectural rule:** the **LLM proposes content** (what tasks, what resources,
  suggested quantities); a **deterministic cost engine computes all money** — they never
  overlap. Estimates are reproducible, testable, auditable.
- **Grounding:** a curated, versioned **knowledge base** (planning know-how + pricing
  reference), retrieved by category/region/tags in v1 (no embeddings yet; pgvector is a
  documented future step).
- **Model:** Claude (Sonnet default, Opus "deep plan" toggle), prompt-cached KB; new
  `@anthropic-ai/sdk` dependency at build time.
- **Spend control:** per-organizer generation quotas tied to subscription; deterministic
  recompute on edits (no new LLM call).
- **Open product questions** for OPE live in that doc's **§13** (pricing-data curation,
  quotas/model policy, currency, primary output, KB launch breadth).

---

## 6. Event Request Marketplace

**Design:** `docs/OPE_V1_TECHNICAL_DESIGN.md` §9. 🟡 (request/proposal primitives shipped;
OPE assessment + delivery modes designed)

- **Two models:**
  - **Ready Activities** (supply-first) — `activities` table, marketplace discovery. ✅
  - **Event Requests** (demand-first) — `customer_requests` (migration `008`). ✅
- **OPE preliminary assessment** runs **before** a request reaches organizers: prep
  hours, staffing, equipment, vendor, logistics, **budget range**, and **operational
  risks**. 📐
- **Two delivery modes** (📐):
  - **A. Marketplace Mode** — request visible to qualified organizers → **proposals**
    (`send_proposal`) → client accepts (`accept_proposal` → booking).
  - **B. Direct Organizer Mode** — client picks an organizer first; request routed only
    to them.
- **Organizer editing:** organizers receive the OPE draft and adjust quantities,
  staffing, schedule, budget, requirements; OPE **recalculates deterministically**. 📐
- Both modes converge on the existing **proposal → booking → payment** path. ✅

---

## 7. Marketplace architecture

- **Data layer:** Supabase Postgres with **RLS on every table** and **`SECURITY
  DEFINER` RPCs** for all state transitions and complex reads. ✅ Conventions: `uuid`
  PKs, shared `updated_at` trigger, `_select`/`_modify` policy pairs, JSONB for flexible
  filters/params.
- **Core entities** (migrations `006`–`013`): `profiles`, `organizer_profiles`,
  `activities`, `venues`/`venue_photos`, `clients`, `calendar_events`,
  `customer_requests`/`request_matches`/`proposals`, `bookings`, `payments`,
  `subscriptions`, `reviews`, `notifications`, `email_notifications`. ✅
- **Discovery:** `search_marketplace(p_filters jsonb)` + `get_marketplace_activity` +
  `get_public_organizer` RPCs (migration `007`). ✅
- **Category taxonomy** (migration `016`, `lib/categories.ts`): 3 emotional groups —
  **Personal & Family**, **Communities & Groups**, **Premium & Niche** — 21 scenario
  categories; legacy generic categories retained for back-compat. ✅
- **Matching flow:** `match_request` → `send_proposal` → `accept_proposal` →
  `cancel/complete/refund_booking` (migrations `008`/`009`). ✅
- **Supporting systems:** reviews (`011`), analytics + email queue (`013`), admin
  (`014`), production hardening — security headers, resilience, input validation
  ("Phase 8" commit). ✅

---

## 8. Monetization

Revenue streams, as currently built/intended:

1. **One-time certification fee** ✅ — **$99** beginner course · **$29** experienced
   skills test (`messages/*`, `lib/stripe/config.ts`). Real Stripe one-time payment;
   verified end-to-end in test mode (`STRIPE_CHECKOUT_QA.md` case 1.1).
2. **Recurring organizer subscription** 🟡 — **$9.99/month** (see §4 price caveat).
   Gates the dashboard; verified end-to-end in test mode (case 2.1).
3. **Booking payments** ✅ — customers pay for confirmed bookings via Stripe Checkout
   (dynamic price, `createBookingCheckout`); refund lifecycle exists
   (`request/process/reject` refund, migration `012`).
4. **OPE (future lever)** 📐 — generation quotas / "deep plan" tier could become a
   monetized capability.

> **Platform commission / take-rate on bookings is NOT implemented** (❓). No
> `application_fee`/commission constant exists in the code; booking checkout charges the
> full amount with no platform cut. Whether ActivitaHub takes a % of bookings is an
> **open business decision** — see §10. The test-mode prices used during the Stripe test
> pass ($49/$29/$19) were **throwaway QA values**, not product prices.

---

## 9. Roadmap

**Shipped (code committed; see git history & migrations `001`–`016`):** ✅
foundations & auth · billing/Stripe subscriptions · academy & certification ·
organizer core (activities/venues/calendar/clients) · marketplace & search ·
requests/proposals/bookings · booking payments & refunds · reviews · analytics &
email · admin · organizer public slugs · emotional category taxonomy & Phase 9
marketplace seeding.

**In flight / verified-partially:** 🟡 Stripe checkout test pass — certification &
subscription paths verified end-to-end; billing-portal/cancellation/past-due, webhook
robustness, and booking-payment/refund cases remain (`STRIPE_CHECKOUT_QA.md`).

**Designed, not built:** 📐 **OPE v1** (`docs/OPE_V1_TECHNICAL_DESIGN.md`) and the
**Event Request Marketplace** assessment + delivery modes (that doc §9).

**Sequencing principle:** complete and verify the operational payment flow before
building OPE; OPE v1 before its v1.1/v2 extensions (async generation, semantic KB,
vendor directory, multi-currency). Detailed OPE phasing lives in the OPE doc §12 — this
file does not duplicate it.

---

## 10. Open decisions (must resolve before they block work)

| # | Decision | Status |
|---|---|---|
| 1 | **Canonical brand name** — "ActivitaHub" vs "ActivLife Hub" in UI | ❓ |
| 2 | **Subscription price** — reconcile $9.99/mo (billing) vs $29/mo (pricing page) | ❓ |
| 3 | **Platform commission on bookings** — take a % or not; if so, how much | ❓ |
| 4 | **OPE product questions** — pricing-data curation, quotas/model policy, currency, primary output, KB launch breadth (OPE doc §13) | ❓ |
| 5 | **Event Request delivery** — confirm both Marketplace + Direct modes ship in the same release | ❓ |

---

## Source-of-truth index

- **Stripe / payments:** `STRIPE_CHECKOUT_QA.md`, `lib/stripe/*`, `lib/actions/billing.ts`,
  `lib/actions/bookingPayments.ts`, `app/api/stripe/webhook/route.ts`
- **OPE & Event Request Marketplace:** `docs/OPE_V1_TECHNICAL_DESIGN.md`
- **Schema:** `supabase/migrations/001`–`016`, seeds in `supabase/seed/*`
- **Access control:** `middleware.ts` (zone gates), RLS policies per migration
- **Taxonomy:** `lib/categories.ts` (+ migration `016`)
- **i18n / copy & prices:** `messages/{en,es,fr,ru}.json`

> **STATUS: SUPERSEDED** — historical V1 product snapshot (2026-06-10). The current product source of truth is `GLOBAL_PRODUCT_SPECIFICATION.md` + `CURRENT_ARCHITECTURE.md`. Kept for record; do not treat as current.

# ActivLife Hub — Source of Truth — v1.0

> Reconstruction of the project from conversation history + verified codebase
> state. **Only information that was actually discussed, approved, or implemented
> is included.** Items that were never discussed are marked as such; nothing is
> invented. Date of reconstruction: 2026-06-10.

---

## 1. Project Mission
- ActivLife Hub exists to **help more people become activity organizers and turn that into a profession**, and to help participants discover and join activities.
- Approved positioning (footer/site): **"Platform for activity organizers — helping people discover activities and helping organizers run them."**
- Mission framing (home): "Friendship, community and celebration don't happen on their own — someone makes them happen. We help more people become the organizers their communities need, and turn that ability into a profession."

## 2. Core Product Definition — what ActivLife Hub actually is
A **platform for activity organizers** with two connected sides:
- **Organizer side:** run activities, participants, promotion and operations from one place (the Organizer Platform — a paid subscription unlocked after certification).
- **Participant side:** a **marketplace** where participants discover, request and book activities from certified organizers, plus a consumer **Activity Planner** (OPE).
Confirmed live product surfaces: marketplace, organizer dashboard/tools, academy, certification, pricing, public marketing pages, and the Planner.

## 3. Planner / OPE (Organizer Planning Engine)
- **Purpose:** turn a small set of event details + location into a complete plan — timeline, checklists, budget, key risks + mitigations, ready-to-send messages, and an upgrade/proposal path.
- **Architecture (verified):** `compose` (merge data modules → tasks/phases/milestones/cost-drivers/risks/templates + derived quantities) → `cost engine` (quantities × seed price bands → low/likely/high + contingency) → `output builder` (the 6-section `ACTIVITY_PLANNER_OUTPUTS_V1`) → `AI layer` (deterministic templating: summary, levers note, messages, upgrade) → `personalization` (headline + theme/audience-aware text).
- **Scenario generation model:** `category → module set (+ subtype, e.g. birthday young-kids when children present) → derived quantities → cost drivers priced by location → 6-section output`. Implemented scenarios: **birthday, BBQ, networking**.
- **Approved principles:**
  - **Frozen-field guard** — generated text may never alter facts (date, price, location, organizer). FINAL.
  - **Deterministic**, no real LLM; "AI" = template generation behind the guard.
  - **Pricing must be location-aware from the start; Honolulu seed is a temporary fallback only — not hardcoded as the product.** FINAL.
  - If no local pricing exists, still generate the plan and show a clear fallback note; never block.
- **Current implementation status:** Engine **ported into `lib/ope/`** and wired to a **working `/plan-an-event` form + result page (Phase A + B)**. Pricing today = Honolulu seed (birthday, BBQ) + a `PricingProvider` fallback chain (local → historical → external → fallback-seed); networking has no pricing → plan generates with a budget-unavailable note. **Not yet:** Stripe checkout, save, PDF, email (deliberately out of scope for this phase).

## 4. Organizer Platform
- A **paid monthly subscription ($9.99/month)**, **unlocked after certification**. The $29/$99 certification products include a **30-day Organizer Platform access window that begins at certification**; after it, an active subscription is required to keep publishing.
- Confirmed live capabilities: activity creation/publishing, marketplace listings, customer requests & proposals, bookings, payments & refunds (Stripe), participant management, promotion generator + promo images, activity alerts + push, the Organizer Command Center, reviews/trust, calendar, clients, venues, analytics. OPE is included as **Early Access**.
- **Organizer Command Center** (dashboard home): Requires Attention, Upcoming Activities (today/tomorrow/week), Participant Overview, Marketplace Requests, Promotion Status, Weekly Snapshot, Quick Actions. Operational (not analytics). Implemented.

## 5. Academy
- Two entry paths: **Beginner Course ("Foundations")** and **Experienced Fast-Track**. Both are **seeded and published** in production.
- Foundations (beginner): 3 modules / 9 lessons. Fast-Track (experienced): 2 modules / 4 lessons. Documented full curriculum = 8 modules (intro, working inside the platform, using OPE, fundamentals, working with participants, working with vendors, safety & responsibility [mandatory], building a career).
- Enrollment selects the course by the user's `selected_path` (beginner → Foundations, experienced → Fast-Track).

## 6. Certification
- Two one-time products: **Experienced Qualification Test — $29** and **Beginner Course + Certification — $99**.
- Flow: onboarding path select → Stripe one-time payment → `payment_complete` → Academy course/exam → pass exam → **certificate issued** → DB trigger grants `certified_organizer` role + 30-day `organizer_access_until` window.
- Mastery-based exam (retakes encouraged; safety competency mandatory). Credentials: **Certified** (proof of skill) and **Verified** (proof of identity), stackable. Certification gates the subscription.

## 7. Activity Categories
20-category emotional/occasion taxonomy in three groups (plus legacy categories):
- **Personal & Family:** birthday, kids_party, wedding, anniversary, baby_shower, reunion, graduation.
- **Communities & Groups:** hiking_club, language_meetup, cultural_community, faith_community, hobby_group, alumni, fan_community.
- **Premium & Niche:** luxury_picnic, sunset_yacht, private_chef, glamping, volcano_dinner, survival_camp, underwater_photography.
Used across marketplace, activity creation, alert interests, and promotion.

## 8. Participant Management
Implemented and verified in production (migration 020): per-activity **participant list** (name/email/phone/status/notes), **RSVP** via unique token link (Confirm/Maybe/Decline), **automatic reminders** (configurable, default 7d/24h/2h; runs as a daily cron on the current plan), **event updates** broadcast, **check-in & no-show**, **attendance tracking**, aggregate stats on the dashboard. Sources: **marketplace bookings import** + **manual add**. Statuses: invited, confirmed, maybe, declined, checked_in, no_show.

## 9. Crew Network
**Not found in this project's conversation history. No specification, decision, or implementation.** No approved definition exists.

## 10. Vendor Network
**No dedicated product was specified or implemented.** Vendors appear only as an **Academy curriculum topic** ("Working with Vendors — venues, contractors and negotiation") and as OPE module data (resources/cost drivers). No vendor-network feature, schema, or approved decision exists.

## 11. Marketing System (Organizer Marketing Automation)
- Specified in `docs/ORGANIZER_MARKETING_AUTOMATION_V1.md` (workflow audit → automation opportunities → generator → alerts → email → social → prioritization). Principle: **generate once → distribute everywhere → notify the right people**.
- **Implemented:** **Promotion Generator** (multi-channel text — Facebook/Instagram/Telegram/WhatsApp/Email/short-ad/description, 6 languages, frozen-field guard); **Promo Images** (square 1080×1080, story 1080×1920, wide 1200×628; server SVG → client PNG); **Activity Alerts + Web Push** (opt-in prefs by category/location/language, matching engine, in-app + browser push, daily digest cron).
- **Specified but NOT built:** email campaigns, social auto-publishing (FB/IG/X/LinkedIn), Telegram, WhatsApp, AI marketing assistant.

## 12. Communication System
- **In-app notifications** table (typed). **email_notifications queue** + trigger exists, but **no SMTP/email sender is wired** (known blocker). **Web push** via VAPID (configured in production).
- Channels used: activity alerts, participant reminders, event updates, booking/proposal/request notifications, RSVP. OPE produces ready-to-send message templates (invitation/reminder/thank-you/feedback).

## 13. AI Components
- **"AI" = deterministic templating behind the frozen-field guard**, not a real LLM. Used by: OPE AI layer (summary/levers/messages/upgrade/headline), promotion generator, promo image copy.
- Approved principle: a real LLM may later slot in **behind the same guard**; facts must remain immutable.

## 14. Revenue Model
- **Activity Planner — $9.99 one-time** (checkout **not wired** today).
- **Certification (experienced test) — $29 one-time.**
- **Academy + Certification (beginner) — $99 one-time.**
- **Organizer Platform — $9.99 / month subscription** (after certification; $29/$99 include a 30-day access window first).
- Booking payments + refunds through Stripe (organizer↔customer).

## 15. User Roles
- Roles: **guest, student (participant), certified_organizer, admin.**
- Onboarding statuses: not_started → path_selected → payment_pending → payment_complete → certified → subscribed.
- Entitlement: organizer access = `role ∈ {certified_organizer, admin}` AND (active/trialing subscription OR live 30-day access window).

## 16. MVP Definition
- **Organizer funnel:** marketing pages → onboarding (path select) → certification payment → academy/exam → certification → subscription → Organizer Platform tools.
- **Marketplace:** participants discover/request/book; organizers respond with proposals → bookings → payments.
- **Planner MVP:** Phase A+B (form → engine → result in browser).

## 17. Implemented Features (verified live this project)
Marketplace + requests/proposals; bookings + payments + refunds; reviews; certification + Academy (both courses seeded/published); Organizer Platform tools; Participant Management (RSVP/reminders/updates/check-in/attendance, migration 020); Activity Alerts + Web Push (migration 019); Promotion Generator; Promo Images; Organizer Command Center; six-language localization (en/es/fr/ru/de/pt) at key parity; Planner MVP (engine wired, Phase A+B); certification-triggered 30-day access window (migration 017); pricing → onboarding path-carry.

## 18. Partially Implemented Features
- **Planner / OPE** — engine works and renders in browser, but no checkout/save/PDF/email; pricing data only Honolulu (+ fallback).
- **Subscription** — flow implemented and gated behind certification; **live Stripe price/mode/webhook correctness was never independently verified** (env values unreadable; one historical webhook incident).
- **Email** — queue + trigger exist; **no SMTP sender** → emails are queued, not delivered.

## 19. Not Implemented Features
Planner Stripe checkout, save plans, PDF export, email sending; email campaigns; social auto-publishing; Telegram/WhatsApp integrations; AI marketing assistant; Crew Network; Vendor Network (as a product); multi-city pricing data (only Honolulu seed exists); ActivLife historical-pricing learning; editable/correctable budget UI; Google OAuth (present in code, not confirmed enabled).

## 20. Approved Architectural Decisions
- **Certification-triggered 30-day Organizer Platform access** ($29/$99 include 30 days from certification; subscription required after; no publishing before certification). — **FINAL**
- **Pricing = $29 / $99 / $9.99.** — **FINAL** · Previous $29.99 / $99.99 / $19.99 — **SUPERSEDED**
- **Organizer subscription gated behind certification** (no subscription checkout before certified). — **FINAL**
- **Frozen-field guard** for all generated content (date/price/location/organizer immutable). — **FINAL / ACTIVE**
- **Webhook is the single authoritative writer of billing state** (Stripe → service-role). — **ACTIVE**
- **Activity Alerts + Push are live capabilities** (removed from "Coming Soon"). — **FINAL** · listing them as future — **SUPERSEDED**
- **Pricing CTAs carry the path** (`?path=experienced` → Fast-Track, `?path=beginner` → Foundations); onboarding auto-selects. — **FINAL**
- **Planner pricing must be location-aware; Honolulu = fallback only.** — **FINAL**
- **Six languages (en/es/fr/ru/de/pt) maintained at key parity.** — **ACTIVE**
- **OPE Planner positioning:** "Early Access" → now wired as Planner MVP (Phase A+B). — **ACTIVE**
- **Participant reminder cron runs daily** (current hosting plan allows daily crons only). — **ACTIVE**
- **Promotion: generate once → distribute everywhere.** — **ACTIVE**
- **"Nothing free long-term"** for the Planner; payment to be added after the generated result is confirmed good. — **ACTIVE** (model not yet finalized — see Open Questions)

## 21. Development Priorities (current agreed order)
1. **Planner MVP Phase A + B** — engine wired + working form/result. ✅ done.
2. **Planner Phase C + D** — save plans, then Stripe $9.99 checkout/entitlement (after the generated result is confirmed good).
3. **Unblock real organizer sales:** verify live Stripe config (price/mode/webhook); resolve the sign-up **email-confirmation / SMTP** gate; align the Platform "Start" CTA with certify-first.
4. **Marketing roadmap (post-MVP):** owned channels first (Telegram), then email campaigns (needs SMTP), then approval-gated social (Meta/WhatsApp).

## 22. Open Questions (discussed, never finalized)
- **Planner commercial model** — free-generate-then-pay vs pay-before vs quota; user stated "nothing free long-term" and "decide after the result is good." **Not finalized.**
- **What the Planner $9.99 unlocks** (save / PDF / itemized budget / messages) and whether it's consumer one-time vs organizer-included. **Not finalized.**
- **Live Stripe verification** — actual live price amounts/mode/webhook never confirmed (env values unreadable). **Open.**
- **SMTP provider** for email confirmation + email features. **Not chosen.**
- **Multi-region pricing data sources** — `PricingProvider` abstraction designed; real local/historical providers not chosen or built. **Open.**
- **Crew Network / Vendor Network** — never defined or scoped. **Open / undefined.**
- **Localization nuance** — pt-PT vs pt-BR; German "du" vs "Sie". Noted, not decided.
- **Google OAuth** — present in code; enablement status not confirmed.

---

### Notes on method
This document reflects only what was discussed/approved/implemented in the project's conversation history and verified against the codebase. Sections **9 (Crew Network)** and **10 (Vendor Network)** have **no source material** and are marked accordingly rather than filled with assumptions.

> **STATUS: SUPERSEDED** — review of the V1 snapshot. Current source of truth: `GLOBAL_PRODUCT_SPECIFICATION.md`. Kept for record.

# Source of Truth v1.0 — Review

> Review of `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md`. Findings only — the source
> document is **not** rewritten here. Each finding lists: **Section · Issue ·
> Correction · Evidence**. Verified against the codebase on 2026-06-10.

---

## 1. Incorrect

### 1.1 Category count is wrong
- **Section:** §7 Activity Categories
- **Issue:** Header says "20-category … taxonomy," but the body lists 21 (premium group has 7, including `underwater_photography`). The two contradict each other.
- **Correction:** It is **21** grouped categories (personal 7 + community 7 + premium 7). The body listing is correct; the "20" label is wrong.
- **Evidence:** `lib/categories.ts` — `grep -c '{ key:'` → 21; `group:'premium'` → 7 (incl. `underwater_photography` line 61). `supabase/migrations/016_marketplace_categories.sql` → 21 `ADD VALUE`.

### 1.2 Reminder cadence overstated (2-hour reminder is not actually delivered)
- **Section:** §8 Participant Management; §20 ("reminder cron runs daily")
- **Issue:** Doc says reminders default "7d/24h/2h." Stored offsets are 168/24/2 h, but the daily cron buckets them to **day granularity** via `Math.round(h/24)`: 168→7 days, 24→1 day, **2→0 (day-of)**. The "2 hours before" reminder is never sent as a 2-hour reminder — it collapses to day-of.
- **Correction:** State that offsets are stored as 7d/24h/2h but the daily cron delivers at **day granularity (7 days before / 1 day before / day-of)**; sub-day timing is not honored on the current plan.
- **Evidence:** `app/api/cron/participant-reminders/route.ts:54` `const daysBefore = Math.round(h / 24)`; `vercel.json` schedules `0 13 * * *` (daily).

### 1.3 Planner "personalization" overstated
- **Section:** §3 Planner/OPE ("AI layer … personalization (headline + theme/audience-aware text)")
- **Issue:** Only the **headline** generator (`genHeadline`) was ported. The deeper theme/audience-aware message rewriting from `personalize-ope.mjs` was **not** ported into the live engine.
- **Correction:** The ported engine includes the AI layer + a theme-aware **headline**; the fuller personalization (message rewriting by theme/audience) remains only in the original CLI script, not in `lib/ope`.
- **Evidence:** `lib/ope/engine.ts` contains `genHeadline` + standard `genMessages`; no port of the `personalize-ope.mjs` message logic.

---

## 2. Incomplete

### 2.1 Promotion Generator is not fully "Implemented" — persistence is not live
- **Section:** §11 Marketing System; §17 Implemented Features
- **Issue:** Listed flatly as "Implemented." Promotion **text/image generation** works, but **saving/history** depends on migration 018 (`promotion_packages`), which is **not applied in production**.
- **Correction:** Classify as: generation **live**, package **persistence/history not live** (pending migration 018). Move the "save" portion to Partially Implemented.
- **Evidence:** `HEAD /rest/v1/promotion_packages` → **HTTP 404** (table absent in prod). `supabase/migrations/018_*` exists but unapplied.

### 2.2 Academy "8-module curriculum" ≠ seeded content
- **Section:** §5 Academy
- **Issue:** "Documented full curriculum = 8 modules" reads as live content. The **seeded** courses are Foundations (3 modules) + Fast-Track (2 modules) = **5 modules total**. The 8-module list is landing-page (marketing) copy.
- **Correction:** Distinguish: **seeded/live = 5 modules** (3 beginner + 2 experienced); the **8-module curriculum is the academy landing-page outline**, not the seeded course content.
- **Evidence:** Verified seeded counts (Foundations 3/9, Fast-Track 2/4) vs `academyLanding` curriculum (8 modules) in `messages/*`.

### 2.3 Localization scope not bounded
- **Section:** §17 (six-language localization); §14
- **Issue:** Implies broad localization. In reality only **UI chrome** is localized at key parity. **OPE-generated plan content** and **Academy course content** are English-only (modules/courses authored in English).
- **Correction:** Note that 6-language parity covers UI strings; **generated plans and course content are English-only**.
- **Evidence:** `data/ope/modules/*` and seeded course content are English; `messages/*` parity covers UI keys only.

### 2.4 Migration-application status is uncertain for several features
- **Section:** §17 / §18 generally
- **Issue:** "Implemented" claims assume migrations are applied. 018 is confirmed **not** applied; the task list still shows **015/016/phase9 "user runs SQL" pending**, so some "implemented" features may not be live in prod.
- **Correction:** Add a caveat that production status depends on migration application; explicitly mark which migrations are confirmed applied (017 access window, 019 alerts, 020 participants — verified) vs unconfirmed/unapplied (018; possibly 015/016/phase9).
- **Evidence:** 018 → 404 (above); session task #7 "Apply migrations 015/016/phase9 (user runs SQL)" still pending.

---

## 3. Misclassified

### 3.1 Google OAuth placed under "Not Implemented"
- **Section:** §19 Not Implemented (also §22)
- **Issue:** The Google sign-in **action exists in code**; only provider-level enablement is unconfirmed. Listing it as "not implemented" is inaccurate.
- **Correction:** Reclassify as **Partially Implemented** — code present, enablement unconfirmed.
- **Evidence:** `signInWithGoogle` action present in auth code; provider toggle not verifiable from repo.

### 3.2 Promo images listed as an "AI component"
- **Section:** §13 AI Components ("promo image copy")
- **Issue:** Promo **images** render frozen activity facts + a localized CTA deterministically — there is no AI/templating layer. Only the promo **text** generator uses the templating ("AI") path.
- **Correction:** Keep the promotion **text** generator under AI components; classify promo **images** as deterministic fact-rendering (not AI).
- **Evidence:** Promo image generation builds SVG from activity fields directly; no generator/templating step.

---

## 4. Missing

### 4.1 Organizer public profile slugs (`/o/<slug>`) not listed
- **Section:** §4 Organizer Platform / §17 Implemented
- **Issue:** A shipped feature — shareable public organizer profile pages at `/o/<slug>` — is absent from the document.
- **Correction:** Add to §4/§17 as an implemented feature.
- **Evidence:** Commit `de4…` "Organizer public slugs: shareable /o/<slug> profile URLs" (in `git log`).

### 4.2 Pricing coincidence not flagged ($9.99 appears twice)
- **Section:** §14 Revenue Model
- **Issue:** Both the Planner one-time price and the Organizer subscription are stated as **$9.99**. This may be intentional or an error; it is not flagged for confirmation.
- **Correction:** Flag the duplicate $9.99 (Planner one-time vs subscription monthly) as needing explicit confirmation.
- **Evidence:** §14 lists "Activity Planner — $9.99 one-time" and "Organizer Platform — $9.99 / month."

---

## 5. Discussed/Approved but Absent

### 5.1 "Hire an Organizer" (User Path #3) omitted
- **Section:** §9 Crew Network / §10 Vendor Network / §22 Open Questions
- **Issue:** §9 and §10 are marked "not found," but the session **did** design a third user path — **"Hire an Organizer"** (the path where a participant engages a certified organizer to run their event) — as a read-only report. The doc omits it entirely, leaving the closest discussed concept invisible.
- **Correction:** Add "Hire an Organizer (User Path #3)" as a **discussed-but-not-finalized** design (report-only, not built) — and cross-reference it from the empty Crew/Vendor sections so the reviewer knows it was the nearest concept actually discussed.
- **Evidence:** Session deep-audit of organizer purchase entry points + the three-user-path design discussion (guest planner / certify-to-organize / hire-an-organizer).

---

## Items reviewed and confirmed accurate (no change needed)
- §6 Certification — $29/$99, 30-day access window from certification, gates subscription: **correct** (migration 017 verified applied).
- §3 Planner status — engine ported, Phase A+B live, no checkout/save/PDF/email, Honolulu fallback only: **correct**.
- §8 Participant Management core (RSVP/check-in/attendance, migration 020): **correct** (only the reminder cadence nuance in 1.2 needs fixing).
- §20 FINAL/SUPERSEDED markers for pricing ($29/$99/$9.99 vs old $29.99/$99.99/$19.99) and certification-gated subscription: **correct**.
- §9/§10 "no Crew/Vendor product exists": **correct** (the only addition is the cross-reference in 5.1).

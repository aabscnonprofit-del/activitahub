# Organizer Growth Program — Gap Audit (vs. current codebase)

> **Type:** audit only. No code, no implementation, no architecture/billing changes, nothing
> committed. Current-state reality.
> **Source of truth:** `ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md`, `MASTER_PRODUCT_DECISIONS.md`.
> **Goal:** map the 90-Day Organizer Growth Program against what exists, partially exists, or must
> be built. Complexity is a rough build-size estimate (Small / Medium / Large), not a plan.

---

## Area-by-area findings

### 1. Organizer registration date tracking — 🟡 Partial
- **Inspected:** `supabase/migrations/001_profiles.sql:62` (`profiles.created_at`),
  `017_organizer_access.sql:18-28` (`profiles.organizer_access_until`),
  `005_certification.sql:94` (`certificates.issued_at`).
- **Current:** `profiles.created_at` = account creation. "Became an organizer" is **derived**
  (min `certificates.issued_at`, or first `organizer_access_until` set to NOW()+30d at first cert).
  No denormalized "became-organizer" / "program-start" date.
- **Gap:** the program's clock ("begins on the organizer registration date") has no single
  authoritative column. Must decide which timestamp anchors the 90 days and pin it per organizer.
- **Complexity:** **Small.**

### 2. Organizer subscription tracking — ✅ Exists
- **Inspected:** `002_billing.sql:114-127` (`subscriptions` table: `status`, `stripe_subscription_id`,
  `current_period_end`, `cancel_at_period_end`), `lib/stripe/sync-core.ts:23-62`,
  `lib/auth/organizer-access.ts:32-40`, `app/api/stripe/webhook/route.ts:61-68`.
- **Current:** subscriptions mirrored from Stripe via webhook; status (active/trialing/…) and
  `current_period_end` tracked; access derived from subscription OR cert window.
- **Gap:** none for *tracking*. (Granting free months is a separate capability — see Area 9.)
- **Complexity:** **None / Small.**

### 3. Training purchase tracking — 🟡 Partial (exists, conflated)
- **Inspected:** `002_billing.sql:70-81` (`payments`: `kind`, `status`, `amount`, `currency`,
  `created_at`), `app/api/stripe/webhook/route.ts:204-230`, `003_academy.sql:243-254` (enrollments).
- **Current:** a `payments` row with `kind='beginner_course'` (≈ training-path purchase),
  `status='completed'`, `amount`, `created_at`. Course/exam access flows from it.
- **Gap:** "training" and "certification" share the same `payments` model keyed by `kind` (path),
  not a distinct "training fee" vs "certification fee". Fee amount is recoverable, but the
  program's reimbursement needs a clear "what was paid, when, refundable y/n" per organizer.
- **Complexity:** **Small** (read-side derivation).

### 4. Certification purchase tracking — 🟡 Partial (exists, conflated)
- **Inspected:** `002_billing.sql:70-81` (`payments.kind='experienced_test'`),
  `005_certification.sql:87-97,236-255` (`certificates.issued_at`, `score`),
  `017_organizer_access.sql:27-59`.
- **Current:** `payments` row for the experienced path + a `certificates` row on pass.
  Amount + date available.
- **Gap:** same conflation as Area 3 — no explicit "certification fee paid" record distinct from
  the path payment; fine for reimbursement *eligibility* but must be derived.
- **Complexity:** **Small.**

### 5. Completed activity tracking — 🟡 Partial → effectively **Missing at the unit the program counts**
- **Inspected:** `lib/actions/activities.ts:93` (`ACTIVITY_STATUSES`),
  `006_organizer_core.sql:31-32` (`activity_status` enum = `draft|published|archived`),
  `009_bookings.sql:22,156-171` (`booking_status` incl. `completed`, `complete_booking()` RPC),
  `020_participants.sql:36` (`checked_in_at`, `no_show`), `calendar_events` (no completion state).
- **Current:** **Activities have NO `completed` status** — only draft/published/archived.
  Completion exists only at **booking** level (`bookings.completed`) and **participant** level
  (check-in). `calendar_events` (sessions) carry no completion state.
- **Gap:** the program rewards **completed activities**, but there is no activity-level (or
  occurrence-level) "Completed" concept to count. A countable unit must be defined and made to
  transition to Completed (manual and/or date-based), without cancellation. **This is the central
  gap of the whole program.**
- **Complexity:** **Medium–Large.**

### 6. Recurring activity handling — 🟡 Partial
- **Inspected:** `lib/ope/types.ts:45-51` (`Recurrence`), `lib/ope/activities.ts:23-43`
  (`recurringCapable`), `006_organizer_core.sql:109-123` (`calendar_events`),
  `007_marketplace.sql:121-125` (upcoming-sessions aggregation).
- **Current:** recurrence is an **OPE planning-time modifier only**. Stored activities are
  singletons with no recurrence rule; a recurring class manifests as multiple `calendar_events`
  (`event_type='session'`) under one `activity_id`. Participants attach to the activity, not the
  occurrence.
- **Gap:** the program says "each occurrence may count as a separate completed activity," but
  occurrences (`calendar_events`) cannot independently reach Completed and aren't the counted unit.
  Needs an occurrence-as-countable-unit model tied to completion.
- **Complexity:** **Medium–Large** (interacts with Area 5).

### 7. Activity counting by time period — 🟡 Partial
- **Inspected:** `013_analytics_email.sql:54-101` (`organizer_analytics` RPC),
  `lib/analytics/queries.ts:7-13`, `app/[locale]/dashboard/analytics/page.tsx`.
- **Current:** all-time counts (`total_bookings`, `completed_bookings`) and **6-month-by-calendar-
  month** aggregates. No count within an arbitrary **30-day window from a per-organizer start date**.
- **Gap:** the program's three 30-day periods (and the 15-in-90 reimbursement threshold) need
  windowed counting of *completed activities* anchored to the registration date — does not exist.
- **Complexity:** **Medium** (small once Area 5's countable unit exists).

### 8. Internal credit / balance capability — ❌ Missing
- **Inspected:** grep of all migrations + `lib/actions/admin.ts:6-24`; "balance/credit/wallet/ledger"
  appear only as **notification dedup ledgers** (`019`, `020`), not financial.
- **Current:** no wallet, balance, or credit ledger on `profiles`/`subscriptions`/`payments`; no
  grant/debit RPC. All money flows through Stripe.
- **Gap:** Part 2 reimbursement requires a non-cash **internal balance** usable for subscription /
  internal promotion / future services — none exists (schema, logic, admin tooling all absent).
- **Complexity:** **Large.**

### 9. Free-month entitlement capability — ❌ Missing
- **Inspected:** `lib/actions/billing.ts:84-94,129-139` (checkout = price_id + quantity only, no
  coupon/discount), `017_organizer_access.sql:24-28` (cert 30-day window is set once, not a grantable
  trial). `subscriptions.status` supports `trialing` but nothing creates/extends trials.
- **Current:** no coupons, discounts, trial extension, comp, or "free month" grant path. The only
  free access is the one-time 30-day cert window (non-extensible).
- **Gap:** Part 1's core reward (up to **3 free organizer months, applied after day 90**) has no
  mechanism — neither Stripe-side (coupon/trial credit) nor platform-side (deferred entitlement).
- **Complexity:** **Medium–Large.**

### 10. Anti-fraud signals — ❌ Missing (raw data partially present)
- **Inspected:** `lib/actions/participants.ts` (participant counts/status/check-in),
  `bookings.participant_count`, `lib/actions/admin.ts` + `014_admin.sql` (only review moderation +
  `setSuspended`).
- **Current:** raw signals **exist** (participant count, `profile_id IS NULL` for manual-only,
  `checked_in_at`, `no_show`, booking headcount) but there is **no** fraud logic: no duplicate/near-
  identical activity detection, no "no participants other than organizer" flag, no velocity check,
  no audit trail, no admin fraud view.
- **Gap:** Part 4 ("exclude suspicious activities from reward calculations") has data to draw on but
  no detection, scoring, or exclusion mechanism.
- **Complexity:** **Large** (full); **Medium** for a minimal exclusion rule.

### 11. Promotion link architecture — 🟡 Partial
- **Inspected:** `lib/marketing/facts.ts:119-120` (URL = `/{locale}/marketplace/{activity.id}`),
  `lib/marketing/promotion-generator.ts:205-256` (URL embedded in all 7 channels),
  `assertFactsPreserved()` `:268-282`.
- **Current:** **every** promotional asset links to the **activity page**; there is **no** one-time
  vs recurring distinction and no option to target the organizer profile.
- **Gap:** Part 5 requires recurring-activity promotion to point at the **organizer profile /
  recurring page** (not a single occurrence); not implemented.
- **Complexity:** **Medium.**

### 12. Organizer profile architecture — 🟡 Partial
- **Inspected:** `app/[locale]/o/[slug]/page.tsx`, `organizers/[id]/page.tsx`,
  `components/organizer/OrganizerProfileView.tsx:71-98`, `015_organizer_slugs.sql:119-136`
  (stable unique `slug`), `lib/marketplace/queries.ts:77-92` (`get_public_organizer`).
- **Current:** stable shareable **slug** exists (`/o/{slug}`); profile shows bio, badge, rating,
  languages, and a **static activities list** (title/category/city/price) linking to each activity.
- **Gap:** the profile does **not** auto-display **upcoming occurrences/dates** (the RPC fetches no
  `calendar_events`), which Part 5 requires so a durable organizer link shows "what's coming up."
- **Complexity:** **Medium.**

---

## Summary table

| # | Area | Verdict | Complexity |
|---|---|---|---|
| 1 | Organizer registration date | 🟡 Partial | Small |
| 2 | Organizer subscription tracking | ✅ Exists | None/Small |
| 3 | Training purchase tracking | 🟡 Partial (conflated) | Small |
| 4 | Certification purchase tracking | 🟡 Partial (conflated) | Small |
| 5 | Completed activity tracking | 🟡 Partial → Missing (counted unit) | **Medium–Large** |
| 6 | Recurring activity handling | 🟡 Partial | Medium–Large |
| 7 | Activity counting by time period | 🟡 Partial | Medium |
| 8 | Internal credit / balance | ❌ Missing | **Large** |
| 9 | Free-month entitlement | ❌ Missing | Medium–Large |
| 10 | Anti-fraud signals | ❌ Missing (raw data partial) | Large (Medium minimal) |
| 11 | Promotion link architecture | 🟡 Partial | Medium |
| 12 | Organizer profile architecture | 🟡 Partial | Medium |

**Already usable as-is:** subscription tracking (2); registration/training/cert dates are derivable
(1, 3, 4). **Hard blockers (nothing to build on):** completed-activity unit (5), internal balance
(8), free-month grant (9), anti-fraud exclusion (10).

---

## Minimum implementation required for V1

*Only what is strictly required to launch the 90-Day Program credibly. Listed as required
capabilities (gaps to close), not as a design. Ordered by dependency.*

**Must-have (the program cannot run without these):**

1. **A countable "completed activity" unit (Area 5, +6).** Define and persist what counts —
   activity-level Completed and/or occurrence-level Completed for recurring series — with a real
   transition to Completed and exclusion of cancelled. *Today: activities have no Completed status;
   only bookings do. This is the foundational blocker.*
2. **A fixed program-start date per organizer (Area 1).** Pin the authoritative "registration date"
   the 90 days run from. *Today: derivable but not stored as the program anchor.*
3. **Windowed completed-activity counting (Area 7).** Count completed units per the three 30-day
   periods (3/5/7) and the 15-in-90 reimbursement threshold, anchored to #2. *Today: only all-time
   and 6-month-by-month exist.*
4. **Free-month entitlement, deferred to post-90-days (Area 9).** A way to grant up to 3 free
   organizer months that apply **after** the first 90 days while normal fees are paid during. *Today:
   no coupon/trial/grant mechanism of any kind.*
5. **Minimal anti-fraud exclusion (Area 10).** At least the rules the program names as examples
   (e.g. exclude activities with no participants other than the organizer; exclude obvious near-
   duplicates) so counts can't be trivially gamed. *Today: raw participant data exists, no exclusion
   logic.*

**Required only if Part 2 (reimbursement) ships in V1:**

6. **Internal platform balance/credit (Area 8)** plus the read-side fee derivation (Areas 3–4) and
   the 15-activity trigger. *Today: no balance/ledger exists at all.* — If Part 2 is deferred, V1 can
   launch Part 1 (free months) without this.

**Required only if Part 5 (promotion rules) is in V1 scope:**

7. **Recurring vs one-time promotion targeting (Area 11)** and **upcoming-occurrences on the
   organizer profile (Area 12).** *Today: promotions always link to the activity page; the profile
   shows no dates.* — These support the program's growth intent but are not part of the reward
   engine; they can be staged separately.

**Already sufficient for V1 (no build needed):** subscription tracking (Area 2).

---

*Audit only — current-state reality. No code changes, no implementation, no recommendations beyond
identifying the gaps and the minimum V1 requirement set. Nothing committed.*

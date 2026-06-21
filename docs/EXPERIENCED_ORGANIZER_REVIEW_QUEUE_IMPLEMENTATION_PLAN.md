# Experienced Organizer Review Queue — Implementation Plan

> **Scope:** implement the **Experienced Organizer Review Queue** exactly as accepted in
> `ORGANIZER_ONBOARDING_SPEC_V1.md §3`. Build **in front of** the existing experienced (Fast Track)
> course → final exam → certification flow. **No redesign, no new business rules, no new verification
> doctrine; trust-first model unchanged; public links are supporting-only; activation timing is an
> internal detail.** No code in this document.
> **Built baseline reused (verified):** `profiles.onboarding_path` (`beginner|experienced`),
> `onboarding_status`; Fast Track course (`courses.slug='fast-track'`, `path='experienced'`);
> `get_exam`/`submit_exam`; `certificates` + grant trigger; admin actions pattern
> (`lib/actions/admin.ts`).

---

## 1. Data Model

**New enum — `experienced_application_status`:**
`under_review` · `approved` · `activated` · `rejected` · `redirected`.

**New table — `experienced_applications`** (one active row per profile):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid FK → profiles | unique active application per profile |
| `status` | `experienced_application_status` | default `under_review` |
| `link_instagram` | text null | optional supporting link |
| `link_facebook` | text null | optional |
| `link_meetup` | text null | optional |
| `link_linkedin` | text null | optional |
| `link_website` | text null | optional |
| `link_portfolio` | text null | optional |
| `submitted_at` | timestamptz | set on submit |
| `reviewed_by` | uuid FK → profiles, null | admin who decided (null if never manually reviewed) |
| `reviewed_at` | timestamptz null | manual decision time |
| `decision_note` | text null | internal note |
| `activate_after` | timestamptz null | **INTERNAL** — earliest activation moment; never exposed to users |
| `activated_at` | timestamptz null | when exam access turned on |
| `created_at` / `updated_at` | timestamptz | |

**Notes / constraints:**
- All six link columns are **optional**; an application with **zero links is valid** (links are
  supporting information only — never required proof). Links are stored as plain URLs; basic URL-shape
  validation only (no verification, no scraping — trust-first unchanged).
- `activate_after` and the logic that sets/advances it are **internal**; no user-facing field maps to
  it (no countdown, ETA, or queue position).
- **RLS:** applicant may **read** own row and **insert/update** only the link fields while
  `under_review`; **status transitions and activation are service-role/admin-only** (mirrors how
  `submit_exam`/grant-trigger already restrict privileged writes).
- Index on `(status, activate_after)` for the internal activation worker; index on `profile_id`.

**No changes to** `certificates`, `submit_exam` issuance, the grant trigger, pricing, or the Academy
content. Reuses `profiles.onboarding_path` for the redirect outcome.

---

## 2. Status Flow

```
            submit application (optional links)
                       │
                       ▼
                 ┌────────────┐
                 │ under_review│
                 └─────┬───────┘
        ┌──────────────┼───────────────────────────┐
   manual approve   (auto, internal       manual reject / redirect
        │            activation window)             │
        ▼                 │                ┌─────────┴─────────┐
   ┌──────────┐           │                ▼                   ▼
   │ approved │───────────┤          ┌──────────┐        ┌────────────┐
   └────┬─────┘           │          │ rejected │        │ redirected │
        │   activation    │          └──────────┘        └──────┬─────┘
        └────────┬────────┘                                     │ set onboarding_path='beginner'
                 ▼                                               ▼
           ┌──────────┐                                  → New Organizer (Academy) path
           │ activated│  → Fast Track exam access unlocked
           └──────────┘
```

- `under_review → activated` is reachable **two ways**: (a) a manual **approve** then activation, or
  (b) the **internal automatic** path (the platform is *not required* to manually review every
  application). Both converge on `activated`.
- `activated` is the only state that **unlocks the experienced final exam**. Certification afterward is
  the **existing** flow (Fast Track lessons → `submit_exam` → certificate → role/30-day grant) — unchanged.
- `rejected` and `redirected` are terminal for the experienced application.
- Statuses are additive to onboarding; they **gate exam access only** — they do not move payment or
  alter certification.

---

## 3. User Journey

1. **Choose experienced path** (existing `onboarding_path='experienced'` selection).
2. **Application screen** — optional supporting links (Instagram / Facebook / Meetup / LinkedIn /
   website / portfolio); all may be left blank. Submit → creates the application in `under_review`.
3. **Under Review screen** — shows status **only**. Copy promises **no timeframe**, shows **no
   countdown / queue position** (activation timing is internal). e.g. *"Your experienced-organizer
   application is under review. We'll let you know when your certification exam is ready."*
4. **Outcome:**
   - **Activated** → exam unlocked: *"You're approved to take the certification exam."* → existing
     Fast Track course → final exam → certificate.
   - **Rejected** → *"We can't approve the experienced route for this application,"* with a clear
     **offer to take the standard Academy path**.
   - **Redirected** → *"We've set you up on the standard Organizer Academy path,"* → sent into the
     Foundations (beginner) course (existing).

No new transacting capability appears here; this is intake + gating only.

---

## 4. Admin Journey

*(Manual review is optional — the queue functions without it; this surface is for when admins choose
to act.)*

1. **Review queue list** — applications in `under_review`, showing profile, submitted time, and any
   optional links (rendered as plain outbound links; informational only).
2. **Open an application** — view links + context.
3. **Decide** (reusing the existing admin-action pattern, `lib/actions/admin.ts`):
   - **Approve** → status `approved` (activation then follows via the internal window).
   - **Reject** → status `rejected` (+ optional internal note).
   - **Redirect to Academy** → status `redirected` (+ set `onboarding_path='beginner'`).
4. **No-action is valid** — unreviewed applications still activate via the internal process.

Admin access reuses the existing `admin` role gate (middleware + server checks); no new role.

---

## 5. UI Changes

- **New:** Experienced application form (optional links + submit).
- **New:** Under Review status screen (status-only, no timing).
- **New:** Activated / Rejected / Redirected outcome messages (3 short states) + routing.
- **New:** Admin "Experienced Review Queue" surface (list + open + Approve/Reject/Redirect).
- **Changed:** onboarding routing for `onboarding_path='experienced'` now passes through the
  application/Under-Review states before exposing the Fast Track course/exam entry.
- **Changed:** the experienced **exam entry** (Fast Track exam page CTA) is **locked until
  `activated`** (the page already gates on access/enrollment — add the application-activated condition).
- **i18n:** new copy keys for the above in the 6 supported locales (status, outcomes, admin labels).

No changes to beginner-path screens, certification display, or the marketplace.

---

## 6. Backend Changes

- **Migration:** the enum + `experienced_applications` table + RLS + indexes (§1).
- **Server actions (reusing existing patterns):**
  - `submitExperiencedApplication(links)` → create row `under_review` (validates URL shape only;
    blanks allowed).
  - `getMyExperiencedApplication()` → status for the user-facing screens (returns status only; never
    `activate_after`).
  - Admin: `approveExperiencedApplication`, `rejectExperiencedApplication`,
    `redirectExperiencedApplicationToAcademy` (admin-gated; the redirect one also sets
    `onboarding_path='beginner'`).
- **Internal activation mechanism:** a privileged/service-role job that advances eligible
  `under_review`/`approved` rows to `activated` per `activate_after`. **The window/algorithm is internal
  and not user-exposed.** (Mechanism choice — scheduled worker vs on-read evaluation — is an
  implementation detail.)
- **Exam-access gate:** the experienced (Fast Track) final exam path checks
  `experienced_applications.status = 'activated'` for the user before delivering/accepting the exam.
  Beginner path is untouched; `submit_exam`'s existing checks are unchanged (this is an additional
  precondition for the experienced course only).
- **No changes** to `submit_exam` issuance, the grant trigger, `certificates`, pricing, or Academy content.

---

## 7. Implementation Sequence

1. **Data model** — migration: enum, `experienced_applications`, RLS, indexes.
2. **Applicant backend** — `submitExperiencedApplication`, `getMyExperiencedApplication`.
3. **Applicant UI** — application form + Under Review screen + outcome messages + onboarding routing.
4. **Exam-access gate** — lock experienced exam entry on `activated`.
5. **Admin surface + actions** — queue list, Approve / Reject / Redirect (Redirect sets
   `onboarding_path='beginner'`).
6. **Internal activation mechanism** — the variable-window worker that moves rows to `activated`
   (internal default behavior set here).
7. **Redirect-to-Academy wiring** — route redirected users into the existing Foundations flow.
8. **i18n + copy** for all new states across the 6 locales.
9. **Verification** — tsc/lint; manual run of the four outcomes (activate / reject / redirect / no-op
   auto-activate); confirm no timing is exposed and beginner path is unaffected.

---

## 8. Blockers

- **B1 — Payment ordering (must confirm; not invented here).** Today the experienced route is "pay →
  exam." This plan gates **exam access** (not payment) on `activated`, so payment placement stays as
  built. If the accepted intent is "review before payment," that ordering must be confirmed — it would
  be a sequencing decision, and this plan does **not** assume it. *(Blocks only the routing detail, not
  the queue.)*
- **B2 — Internal activation default behavior** (auto-activate-after-window vs require-manual-approve as
  the default) must be chosen by implementers. It is explicitly an **internal** detail per the accepted
  spec, so it is a configuration decision, **not** a product blocker.
- **Non-blockers (reused, already built):** admin role/gating, the Fast Track course + exam + cert
  flow, `onboarding_path` for redirect, the admin-action pattern.

---

## 9. Estimated Scope

| Component | Rough size |
|---|---|
| Migration (enum + table + RLS + indexes) | **S** |
| Applicant server actions (submit, read) | **S** |
| Admin actions (approve/reject/redirect) | **S** (reuses admin pattern) |
| Internal activation mechanism | **S–M** (depends on worker vs on-read) |
| Exam-access gate addition | **S** |
| Applicant UI (form + Under Review + 3 outcomes + routing) | **M** |
| Admin review surface | **S–M** |
| i18n copy (6 locales) | **S** |
| Verification pass | **S** |

**Overall: Small–Medium**, additive only — one migration, ~5 server actions, ~4 applicant screens, one
admin surface, one internal activation mechanism, one exam-gate edit. No changes to certification,
pricing, verification doctrine, or the trust-first model.

*(Implementation plan — based only on accepted decisions. No code, no redesign, no new business rules.
Nothing committed.)*

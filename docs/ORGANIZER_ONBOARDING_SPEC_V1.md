# Organizer Onboarding — Specification (V1)

> **Status:** Specification of record (2026-06-20). Defines **how a person becomes an Organizer**.
> **Not a redesign.** No new business model, certification program, course content, or exam questions.
> Built only from existing decisions; every concrete value is sourced. Where a step the brief asks for
> does **not** exist in current architecture, it is flagged as a **gap** (identified, not solved).

**Authoritative sources used:** `MASTER_PRODUCT_DECISIONS.md`, `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md`,
`ACTIVLIFE_HUB_ORGANIZER_FOUNDATION_V1.md`, `ORGANIZER_ACADEMY_CURRICULUM_V1.md`,
`ORGANIZER_ACADEMY_MODULES_V1.md`, `VERIFIED_ORGANIZER_EXAM_STRUCTURE_V1.md`,
`CERTIFICATION_EXAM_BLUEPRINT_V1.md`, `COMPLETED_ACTIVITY_SPEC_V1.md`,
`ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md`, and migrations `001/002/003/005/017` (schema of record).

---

## 1. Executive Summary

Becoming an Organizer means reaching **Certified Organizer** status and holding **Organizer Platform
access** (a certification-included 30-day window, then an active subscription). Certification is the
single credential; it can be reached two ways (`ACTIVLIFE_HUB_ORGANIZER_FOUNDATION_V1.md:158-176`,
`MASTER_PRODUCT_DECISIONS.md:564-571`):

- **New Organizer Path** — Registration → Academy → Exam → Certification → Organizer.
- **Experienced Organizer Path** — Registration → Experienced Organizer Application (Review Queue,
  *Under Review*) → (test-out) Experienced Competency Exam → Certification → Organizer.

Both routes converge on the **same certification standard and the same safety-mastery requirement**
(`CERTIFICATION_EXAM_BLUEPRINT_V1.md:172-173`); the route differs, the standard does not. Certification
issues an ActivLife Organizer Certificate, sets the profile to `certified_organizer`, and grants a
**30-day Organizer Platform access window**; after it, an **active subscription** is required
(`017_organizer_access.sql:5-9,45-48`; `MASTER_PRODUCT_DECISIONS.md:345-362`).

Organizer status is what unlocks the platform's transacting capabilities — **ticket sales, participant
payments, Stripe Connect, customer requests, and the Organizer Growth Program are all Organizer-only**
(`MASTER_PRODUCT_DECISIONS.md:596-607`). A non-organizer (Event User / One-Time Planner) can plan one
event but cannot transact and must become an Organizer to do so.

---

## 2. New Organizer Path

**Flow:** Registration → Academy → Exam → Certification → Organizer.

### Entry requirements
- A registered account (`profiles`, `001_profiles.sql`).
- Selecting the **beginner** onboarding path (`onboarding_path = 'beginner'`, `001_profiles.sql:29-32`)
  and paying the **beginner certification product** (one-time; `payment_kind='beginner_course'`,
  `002_billing.sql:36-40`). Price per pricing decision — see §7/§9 (sourced as **$99** in
  `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md`, **$99.00** in `MASTER_PRODUCT_DECISIONS.md:154-156`).
- **Enrollment requires payment first:** a student may enroll only when `onboarding_status ∈
  {payment_complete, certified, subscribed}` (`003_academy.sql` enrollment RLS).

### Transitions
1. **Registration → payment:** on successful checkout, `onboarding_status → payment_complete`.
2. **Payment → Academy:** enrollment into the **Foundations** course for the beginner path
   (3 modules / 9 lessons per `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md`).
3. **Academy progression:** sequential, **mastery-gated, not time-gated** — "progression gated on
   demonstrated competence, not time spent" (`ORGANIZER_ACADEMY_CURRICULUM_V1.md:18`). Module 1 first;
   **Module 7 (Safety & Responsibility) mastery is a hard gate before graduation — no exceptions**
   (`ORGANIZER_ACADEMY_MODULES_V1.md:24-25`).
4. **Academy → Exam:** after required modules/lessons are passed, the candidate takes the course
   **final exam** (`quiz_kind='final_exam'`, one per course, `005_certification.sql:23-36`).

### Completion criteria
- Pass the final exam at the passing score (see §4) **and** satisfy the safety-mastery requirement.
- On pass, certification issues automatically (see §5).

### Resulting status
- **Certified Organizer** (`profiles.role='certified_organizer'`, `onboarding_status='certified'`),
  holding the **30-day Organizer Platform access window** (`017_organizer_access.sql:37-48`).

---

## 3. Experienced Organizer Path

**Flow (authoritative):** Registration → **Experienced Organizer Application (Review Queue → Under
Review)** → **Experienced Competency Exam (test-out)** → Certification → Organizer. Certification "can
be reached … by passing the experienced-organizer competency exam (the test-out route for people who
already organize real events)" (`ACTIVLIFE_HUB_ORGANIZER_FOUNDATION_V1.md:174-176`;
`VERIFIED_ORGANIZER_EXAM_STRUCTURE_V1.md:21-42`). The competency **exam remains the verification
instrument**; the Review Queue is an **intake/triage** step in front of it (this does not redesign the
exam or certification).

### Experienced Organizer Review Queue (intake)

When a person applies for the experienced route, the application enters the **Review Queue** with
status **Under Review**.

- **Optional supporting links.** The applicant **may** provide public links — Instagram, Facebook,
  Meetup, LinkedIn, a website, or a portfolio. These are **supporting information only** and are **not
  required proof of experience**: an application is valid with **no links at all**, and links never
  replace the competency exam.
- **Review is optional, not guaranteed per application.** The platform **may** perform manual review of
  an application but is **not required to review every application**.
- **Variable activation window.** A **variable review window may pass before activation**. The exact
  timing/algorithm that decides when an Under-Review application activates is an **internal
  implementation detail** and **must not be exposed to users** (no countdown, queue position, or
  promised time is shown).

### Review outcomes

An Under-Review application resolves to one of three outcomes:

- **Approved** → activated to proceed on the experienced route (admitted to the **Experienced
  Competency Exam**). Certification still requires passing that exam (§4, §5).
- **Rejected** → the experienced route ends for this application.
- **Redirected to Academy** → the applicant is sent to the standard **New Organizer Path** (beginner
  Academy + final exam) to certify the trained way — the same credential by the other route
  (`MASTER_PRODUCT_DECISIONS.md:564-571`).

### What evidence of experience may be submitted
- **Only the optional public links above** (Instagram / Facebook / Meetup / LinkedIn / website /
  portfolio), as **supporting information**. There is **no required portfolio, prior-event audit, or
  credential check** — experience is ultimately demonstrated through the **competency exam**
  (`VERIFIED_ORGANIZER_EXAM_STRUCTURE_V1.md:21-27`), with links serving only to support optional review.

### Exam outcomes (for applications that reach the exam)
The competency exam (sections A–I, transferable judgment; ActivLife-specific competencies 1–2 are
**out of scope** and handled at onboarding — `VERIFIED_ORGANIZER_EXAM_STRUCTURE_V1.md:52-57`) yields:
- **Pass** — meets the passing standard and the safety bar.
- **Fail** — below the passing standard.
- **Automatic rejection (disqualifying failures), regardless of other scores:** any serious safety
  failure, dishonesty toward the client, inventing facts, or hostile/unprofessional handling of people
  (`VERIFIED_ORGANIZER_EXAM_STRUCTURE_V1.md:210-219`).

### Approval path
- **Approved (Review Queue) → pass the Competency Exam → Certification** issues automatically (same
  trigger as §5): certificate, role upgrade, 30-day window. Resulting status: **Certified Organizer**.

### Rejection path
- **Rejected at review** → the experienced application is declined (the applicant may instead take the
  Academy path).
- **Fail the exam → retake** under the documented retake policy (§4): targeted remediation on failed
  areas, a short review/cooldown, and a sensible cap on consecutive attempts; "retaking is normal … no
  penalty or stigma" (`CERTIFICATION_EXAM_BLUEPRINT_V1.md:140-141`;
  `ORGANIZER_ACADEMY_CURRICULUM_V1.md:134-136`). *(Enforcement is a gap — see §4 and G3.)*

### Fallback path into Academy
- **Redirected to Academy** is the explicit fallback: a review can route the applicant to the **New
  Organizer Path** (beginner Academy + final exam) instead of the exam, and a candidate who does not
  pass the test-out may likewise certify the trained way — the same credential by the other route
  (`MASTER_PRODUCT_DECISIONS.md:564-571`).

---

## 4. Exam Rules

Only the requested parameters; **no question content is defined here.**

| Parameter | Value | Source / status |
|---|---|---|
| **Number of questions** | **NOT DEFINED** | No fixed count in schema or docs; `submit_exam` counts whatever questions exist (`005_certification.sql:215`). *(Gap G5.)* |
| **Passing score** | **70%** | `passing_score INTEGER NOT NULL DEFAULT 70` (`003_academy.sql:132`); checked as `score >= passing` in `submit_exam` (`005_certification.sql:234`). |
| **Timer / time limit** | **NOT DEFINED** | No exam timer/timeout field or enforcement exists (`005_certification.sql` `submit_exam` has no time check). *(Gap G6.)* |
| **Retake policy** | **Documented intent, not enforced** | Recommended: remediation on failed areas, short cooldown, cap on consecutive attempts (`ORGANIZER_ACADEMY_CURRICULUM_V1.md:134-136`; `CERTIFICATION_EXAM_BLUEPRINT_V1.md:140-141`). Implementation today allows repeated attempts with no enforced cooldown/cap. *(Gap G3.)* |
| **Safety mastery (both routes)** | **Required to certify** | Module 7 / safety domain mastery is required independent of overall performance (`ORGANIZER_ACADEMY_MODULES_V1.md:24-25`; `CERTIFICATION_EXAM_BLUEPRINT_V1.md:106`). |
| **Certification trigger** | **Pass the final/competency exam** | `submit_exam` computes `score`, and on `score >= passing` inserts the certificate (`005_certification.sql:233-248`), which fires the access-grant trigger (§5). |

---

## 5. Certification Rules

### Certification status
On a passing exam, atomically (`005_certification.sql:246-248`, `017_organizer_access.sql:27-59`):
- **Certificate issued** — one per `(profile_id, course_id)`; code format `AH-XXXXXXXXXXXX`; stores
  `score`, `issued_at`.
- **Role upgraded** — `profiles.role → certified_organizer` (admins never demoted).
- **Onboarding status** — `→ certified` (never demotes `subscribed`).

### Rights granted (the access window)
- **30 days of Organizer Platform access**, anchored to the certificate's `issued_at`
  (`017_organizer_access.sql:45-48`). "Passing certification … grants 30 days of Organizer Platform
  access — NOT payment time" (`017_organizer_access.sql:5-9`).
- The window is set **once**; **retakes/re-certification do not extend or re-grant it**
  (`017_organizer_access.sql:10,41-48`).
- **After the 30 days, an active subscription is required** to keep publishing, managing, and
  accepting bookings (`MASTER_PRODUCT_DECISIONS.md:345-362`;
  `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:32-34`).

### What certification does NOT do
- It does not, by itself, grant a permanent subscription; access lapses to subscription-gated after
  the window. No publishing privileges exist **before** certification
  (`MASTER_PRODUCT_DECISIONS.md:345-362`).

---

## 6. Organizer Rights and Capabilities

A user with **Certified Organizer + active Organizer Platform access** (the 30-day window or an active
subscription) holds the organizer workspace and its capabilities
(`ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:34`):

- activity creation / publishing; marketplace listings;
- **customer requests & proposals** *(Organizer-only)*;
- bookings; **payments & refunds via Stripe Connect** *(Organizer-only)*;
- participant management; promotion generator + promo images; activity alerts + push;
- Organizer Command Center; reviews/trust; calendar; clients; venues; analytics; OPE (Early Access).

**Organizer-only gates (must hold Organizer status):**
- **Ticket sales / participant payments / Stripe Connect / payouts** — Organizer-only
  (`MASTER_PRODUCT_DECISIONS.md:596-607`); money settles to the **organizer's** connected account
  (`MASTER_PRODUCT_DECISIONS.md:533-534`).
- **Customer requests & proposals** — the professional output layer is organizer-gated
  (`MASTER_PRODUCT_DECISIONS.md:319-320`; `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:34`).
- **Organizer Growth Program** — rewards **real organizer activity**; available only to Organizers
  (`ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md:10-20`). It counts **Completed Activities**
  (`COMPLETED_ACTIVITY_SPEC_V1.md:38-47`).

**Completed Activity** (the experience/rewards/statistics unit) is organizer-attested: scheduled time
occurred + not cancelled + organizer marked it successfully completed; reviews, payments, tickets, and
Stripe status are not required (`COMPLETED_ACTIVITY_SPEC_V1.md:10-21,38-47`).

---

## 7. Dependencies

This onboarding spec depends on, and must stay consistent with:

1. **Organizer subscription model** — certification grants a 30-day window; ongoing access needs an
   active subscription (`MASTER_PRODUCT_DECISIONS.md:345-362`).
2. **Stripe Connect = Organizer-only** (`MASTER_PRODUCT_DECISIONS.md:596-607,533-534`).
3. **Customer requests = Organizer-only** (`MASTER_PRODUCT_DECISIONS.md:319-320`).
4. **Organizer Growth Program = Organizer-only** (`ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md`).
5. **Completed Activity V1** — the experience/reward counting unit (`COMPLETED_ACTIVITY_SPEC_V1.md`).
6. **Existing Academy architecture** — paid enrollment, sequential mastery-gated modules, safety
   gate, single final exam, certificate-on-pass (`003_academy.sql`, `005_certification.sql`,
   `017_organizer_access.sql`, Academy curriculum/modules docs).
7. **User Status Levels** — Event User vs Verified vs Certified; the One-Time Planner payment boundary
   (`MASTER_PRODUCT_DECISIONS.md:550-607`).

---

## 8. Open Questions (gaps — identified, not solved)

- **G1 — Subscription price is unreconciled.** `MASTER_PRODUCT_DECISIONS.md:575-580,156` says
  **$19.99/month**; `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:32-34` says **$9.99/month**. This spec uses
  "active subscription" without committing to a figure. *(See §9; also flagged in
  `ONE_TIME_PLANNER_PAYMENT_AUDIT.md`.)*
- **G2 — Experienced-path intake is now DECIDED (Review Queue) but not yet in schema/code.** The
  **Experienced Organizer Review Queue** (§3) is the decided intake: optional public supporting links,
  **Under Review** status, three outcomes (approve / reject / redirect to Academy), optional (non-
  mandatory) manual review, and a variable, internally-timed activation window. No DB status, tables, or
  code for this queue exist yet — implementation remains to be built. *(The activation-timing algorithm
  is intentionally internal and not user-exposed — by design, not a gap.)*
- **G3 — Retake policy is documented but not enforced** (no cooldown/cap/remediation in code).
- **G4 — "Redirect to Academy" is decided; the automated handoff is unbuilt.** The Review Queue (§3)
  makes *Redirected to Academy* an explicit outcome, and a failed test-out may also certify via Academy;
  the automated transition mechanics are not yet specified or built.
- **G5 — Exam question count is undefined** (and no questions are seeded — by design here).
- **G6 — Exam timer/time limit is undefined** (no field, no enforcement).
- **G7 — "Verified Organizer" status is defined but not in the schema** (`MASTER_PRODUCT_DECISIONS.md`
  notes it is not yet represented). Onboarding currently produces **Certified**, not **Verified**, as
  the transacting credential.
- **G8 — Completed Activity has no activity-level DB status yet** (`activities` enum is
  `draft|published|archived`; only bookings carry `completed`) — per `COMPLETED_ACTIVITY_SPEC_V1.md` and
  the gap audits. Relevant because Organizer onboarding feeds the Growth Program, which counts Completed
  Activities.
- **G9 — Beginner/experienced certification prices are inconsistent** across docs (beginner $99 vs
  $99.00; experienced **$29** in SOURCE_OF_TRUTH vs **$39.99** in `MASTER_PRODUCT_DECISIONS.md:154-156,
  345-362`).

---

## 9. Contradiction Audit

| # | Contradiction | Where | Note |
|---|---|---|---|
| 1 | **Organizer subscription price** — $19.99/mo vs $9.99/mo | `MASTER_PRODUCT_DECISIONS.md:575-580,156` vs `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md:32-34` | Unresolved; this spec stays price-agnostic ("active subscription"). |
| 2 | **Experienced certification price** — $29 vs $39.99 | `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md` vs `MASTER_PRODUCT_DECISIONS.md:154-156,345-362` | Unresolved pricing conflict. |
| 3 | **"Same exam" vs "separate experienced exam."** Blueprint says both routes face the **same exam** (`CERTIFICATION_EXAM_BLUEPRINT_V1.md:172-173`); the experienced exam structure defines a **separate competency exam** that excludes ActivLife-specific competencies 1–2 (`VERIFIED_ORGANIZER_EXAM_STRUCTURE_V1.md:52-57`). | Two docs | Reconcilable as "same standard, route-specific instrument," but the wording conflicts; flagged, not resolved. |
| 4 | **Experienced path shape** — earlier "test-out exam only" vs a review/intake step. | **Resolved** | The **Experienced Organizer Review Queue** (§3) adds an intake/triage — optional supporting links, *Under Review*, approve/reject/redirect-to-Academy — **in front of** the unchanged test-out exam. Certification and verification are **not** redesigned; queue is decided but not yet implemented (G2). |
| 5 | **Verified vs Certified as the transacting credential.** User statuses define **Verified Organizer** (experience verified), but onboarding and access gating produce **Certified** + subscription; Verified is **not in the schema**. | `MASTER_PRODUCT_DECISIONS.md:564-567` vs schema | Onboarding currently certifies; Verified status unimplemented (G7). |
| 6 | **One-Time Planner ticket-selling** (historical). `ONE_TIME_PLANNER_PAYMENT_AUDIT.md` records a prior "Event User may sell tickets" line; `MASTER_PRODUCT_DECISIONS.md:550-562,596-607` now states Event User **may NOT** sell tickets / transact (Organizer-only). | MASTER (now fixed) vs audit (historical) | Already reconciled in MASTER; consistent with this spec. No further action here. |

*(Specification of record. Defines onboarding using existing decisions only; gaps are identified and
left unsolved per scope. No code, schema, pricing, or architecture changes are made here.)*

# Academy / Exam / Certification — Implementation Evidence Report

> **Purpose:** verify the findings of `ACADEMY_EXAM_CERT_READINESS_AUDIT.md` by listing, for every
> capability claimed as implemented, the concrete **file / migration / page-component / RPC-action /
> seed** paths and the **current operational status** (Fully / Partially / Design-only).
> **Method:** each path was independently confirmed to exist on disk; seed **row counts** were read
> from the seed files (not statement counts); RPC/trigger definitions located by `grep`.
> **No redesign, no recommendations, no future architecture. Nothing committed.**

**Status legend:** ✅ Fully implemented · 🟡 Partially implemented · ⚪ Design-only.

---

## A. Academy

| Capability | File / lib | Migration | Page / Component | RPC / Server action | Seed | Status |
|---|---|---|---|---|---|---|
| Course/module/lesson schema | — | `003_academy.sql:63` (courses), `:76` (modules), `:87` (lessons) | — | — | — | ✅ |
| Enrollment + progress schema | — | `003_academy.sql:100` (enrollments), `:114` (lesson_progress) | — | — | — | ✅ |
| Seeded course content | — | — | — | — | `supabase/seed/academy_content.sql` | ✅ |
| Enrollment (get-or-create) | `lib/academy/queries.ts:41` (`getOrCreateEnrollment`) | `003_academy.sql` enrollment RLS | — | server-side query | — | ✅ |
| Lesson progress (start/complete) | `lib/actions/academy.ts:11` (`markLessonStarted`), `:33` (`markLessonComplete`) | `003_academy.sql:114` | — | server actions | — | ✅ |
| Academy dashboard | — | — | `app/[locale]/academy/page.tsx` | — | — | ✅ |
| Lesson viewer | `components/academy/CourseOutline.tsx` | — | `app/[locale]/academy/lessons/[lessonId]/page.tsx` | `markLessonComplete` (form action) | — | ✅ |
| Academy access gate | `lib/academy/queries.ts:29` (`hasAcademyAccess`) | — | `middleware.ts` (academy zone) | — | — | ✅ |

**Seed verified (row counts read from `academy_content.sql`):** **2 courses** (Foundations/beginner,
Fast Track/experienced), **5 modules** (3 + 2), **13 lessons** (9 beginner: 3/3/3 + 4 experienced: 2/2),
with substantive lesson text. **Confirms** the readiness audit's "2 courses, 3+2 modules, 9+4 lessons."

**One Design-only item inside Academy:**

| Capability | Path | Status |
|---|---|---|
| Lesson-level quiz (non-graded) | `academy_content.sql:138-161` ("Risk Assessment Check", 2 questions / 5 options, `kind` defaults to `lesson`) | ⚪ Design-only — its own comment: *"Phase 3B turns these into a graded exam."* No grading path for `kind='lesson'`. Matches the audit's "lesson quizzes structural only." |

---

## B. Exam

| Capability | File / lib | Migration | Page / Component | RPC / Server action | Seed | Status |
|---|---|---|---|---|---|---|
| Exam schema (quizzes/questions/options) | — | `003_academy.sql:127/138/148`; `005_certification.sql:21-40` (adds `course_id`,`kind`) | — | — | — | ✅ |
| Exam attempts schema | — | `005_certification.sql:67` (`exam_attempts`) | — | — | — | ✅ |
| Exam delivery (no answer keys) | `lib/academy/certification.ts:25` (`getExam`), `:8` (`getFinalExamId`) | `005_certification.sql:113` (`get_exam` RPC), grant `:298` | `app/[locale]/academy/exam/page.tsx` | RPC `get_exam` | — | ✅ |
| Exam grading + pass check | `lib/actions/exam.ts:19` (`submitExam`) → `:40` `rpc('submit_exam')` | `005_certification.sql:163` (`submit_exam`), **superseded by `023_fix_submit_exam_certificate_code.sql:22`** | `components/academy/ExamForm.tsx` (`:31` `useActionState(submitExam)`, `:69` `<form action>`) | server action + RPC `submit_exam` | — | ✅ |
| Passing score | — | `003_academy.sql:132` (`DEFAULT 70`); enforced in `submit_exam` | — | — | seed sets `passing_score=70` per exam | ✅ |
| All-lessons prerequisite | — | `005_certification.sql` `submit_exam` enrollment/progress gate | — | RPC `submit_exam` | — | ✅ |
| Seeded final-exam content | — | — | — | — | `supabase/seed/certification_exams.sql` | ✅ |
| Exam timer / time limit | — | — | — | — | — | ⚪ Design-only / absent — no field, no enforcement (confirms audit). |
| Retake cap / cooldown | — | — | — | unlimited attempts; only first pass certifies (idempotent) | — | ⚪ Design-only — no cap (confirms audit). |

**Seed verified (row counts read from `certification_exams.sql`):** **2 `final_exam` quizzes**
(Foundations `course…001`, Fast Track `course…002`), both `passing_score=70`; **Foundations = 4
questions / 11 options** (`:15-53`); **Fast Track = 3 questions / 8 options** (`:63-92`). Total **7
questions / 19 options**. **Confirms** the audit's "Foundations 4Q, Fast Track 3Q"; the audit's option
estimate ("11 + 9 ≈ 20") is **19** (Foundations 11 + Fast Track 8) — minor correction.

**Verification note (live definition):** the audit cited `submit_exam` at `005_certification.sql:163`;
the **operative** definition is the later patch **`023_fix_submit_exam_certificate_code.sql:22`** (same
function, certificate-code fix). Strengthens, not contradicts, the "fully implemented" finding.

---

## C. Certification

| Capability | File / lib | Migration | Page / Component | RPC / Server action | Seed | Status |
|---|---|---|---|---|---|---|
| Certificates schema | — | `005_certification.sql:87` (`certificates`, unique `(profile_id,course_id)`) | — | — | — | ✅ |
| Atomic issuance on pass + code | — | issuance inside `submit_exam` (`005:163` / **patched `023:22`**); code `AH-XXXX` | — | RPC `submit_exam` | — | ✅ |
| Public verification | `lib/academy/certification.ts:65` (`verifyCertificate`) | `005_certification.sql:269` (`verify_certificate`), grant `anon` `:300` | `app/[locale]/verify/[code]/page.tsx:29` | RPC `verify_certificate` | — | ✅ |
| Certificate display + QR | `lib/academy/certification.ts:35`/`:50` (`getCertificate`,`getLatestCertificate`) | — | `app/[locale]/academy/certificate/page.tsx` | server-side query | — | ✅ |
| Role grant + 30-day window | — | `017_organizer_access.sql:27` (trigger fn), trigger `:56` `certificates_grant_access`; **superseded by `024_fix_grant_access_onboarding_cast.sql:26`** | — | DB trigger (AFTER INSERT on certificates) | — | ✅ |
| No re-grant on retake | — | `017_organizer_access.sql` (COALESCE guard) | — | — | — | ✅ |
| Post-window subscription gate | `lib/auth/organizer-access.ts:32` (`hasOrganizerAccess`), `lib/auth/organizer-access.server.ts:16` | — | `middleware.ts:159-196` | server gate | — | ✅ |

**Verification note (live definition):** the audit cited the grant trigger fn at
`017_organizer_access.sql:27`; the **operative** definition is the later patch
**`024_fix_grant_access_onboarding_cast.sql:26`** (onboarding-status cast fix). Trigger
`certificates_grant_access` (`017:56`) still points at the function name. Confirms "fully implemented."

---

## D. Verdict on the Readiness Audit's findings

**Confirmed.** Every capability the readiness audit listed as implemented is backed by a real file,
migration, page/component, RPC/action, and (where claimed) seed — all confirmed present:

- **Academy** — ✅ schema, content (2 courses / 5 modules / 13 lessons), enrollment, progress, UI, gate.
- **Exam** — ✅ schema, `get_exam`/`submit_exam`, student page + `ExamForm`, 70% pass, all-lessons gate,
  seeded final exams (7 Q / 19 options). Timer ⚪ and retake-cap ⚪ absent — as the audit stated.
- **Certification** — ✅ issuance, verification (RPC + public page), display + QR, role grant + 30-day
  window (no re-grant), post-window subscription gate.

**Minor corrections found during verification (do not change the audit's conclusion):**
1. Seeded exam **options = 19**, not ~20 (Foundations 11 + Fast Track 8).
2. The **operative** `submit_exam` and grant-trigger definitions live in later **fix migrations
   `023` / `024`**, not only `005` / `017` (the audit cited the originals).
3. The Academy seed also contains a **lesson-level sample quiz** that is **⚪ design-only** (ungraded) —
   consistent with the audit's "lesson quizzes structural only," recorded here explicitly.

**Not re-verified here (out of this report's scope — the audit listed them as unbuilt/decisions, not
"implemented"):** Experienced Review Queue, full 8-module/Module-7 curriculum depth, price
reconciliation, analytics, revocation. No claim of implementation was made for these, so there is
nothing to verify.

*(Evidence report — path-level verification only. No redesign, no recommendations, no future
architecture. Nothing committed.)*

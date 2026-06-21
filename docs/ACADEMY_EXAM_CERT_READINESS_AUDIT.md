# Academy / Exam / Certification — Readiness Audit

> **Type:** audit only. No redesign, no new architecture, no new business rules. Strict blocker
> classification. Goal: can development start **now** using already-decided requirements?
> **Accepted (do not redesign):** Completed Activity V1, Organizer Growth Program, Organizer
> Onboarding Spec V1, Experienced Organizer Review Queue.
> **Headline finding:** Academy, Exam, and Certification are **not greenfield — the core is already
> built, seeded, and gated end-to-end.** Readiness is therefore high; the one decided-but-unbuilt
> item is the **Experienced Review Queue** (additive, non-blocking for the three core systems).

> **Reconciliation note:** `ORGANIZER_ONBOARDING_SPEC_V1.md` was written conservatively and understated
> the build (it said "no student-facing exam yet," and flagged G5 exam-question-count / G6 timer as
> undefined). This deeper audit finds the exam flow **is** built and questions **are** seeded. G5 is
> effectively satisfied by seed; G6 (timer) remains an unbuilt non-blocker. The onboarding spec is not
> changed here — this only records current reality for the readiness call.

---

## 1. Academy Readiness

**Fully defined / BUILT**
- Schema: `courses, modules, lessons, enrollments, lesson_progress, quizzes, quiz_questions,
  quiz_options` (`003_academy.sql:63-156`) + RLS (enrollment-gated) (`:190-320`).
- **Real content seeded:** 2 courses — Foundations (beginner, 3 modules / 9 lessons) and Fast Track
  (experienced, 2 modules / 4 lessons) with substantive lesson text (`seed/academy_content.sql:8-134`).
- Server actions: `markLessonStarted`, `markLessonComplete` (rolls up enrollment) (`lib/actions/academy.ts:11-126`).
- Student UI: academy dashboard (`app/[locale]/academy/page.tsx:50-142`), lesson viewer
  (`app/[locale]/academy/lessons/[lessonId]/page.tsx`), `CourseOutline`. Access gating
  (`lib/academy/queries.ts:22-34`, `middleware.ts:203-217`).

**Partially defined**
- **Content depth.** Only the minimal 2-course / 7-lesson-each seed exists. The fuller documented
  curriculum (8 modules, `MODULE_1..12_CONTENT_V1.md`, incl. **Module 7 Safety mastery gate**) is **not**
  seeded. The built courses are internally consistent but shallower than the curriculum docs.
- **Lesson-level quizzes** (`kind='lesson'`) are structural only — no grading/feedback (Phase 3A).

**Missing**
- A distinct **safety-mastery gate** as a certification precondition (the built gate is "all lessons
  complete," not "Module 7 safety mastered"). Only relevant if the full curriculum is loaded.

**Blocks implementation?** **No.** Academy is implemented and usable as seeded.

---

## 2. Exam Readiness

**Fully defined / BUILT**
- Schema: `quizzes(kind: lesson|final_exam, course_id)`, `quiz_questions`, `quiz_options(is_correct)`,
  `exam_attempts` (`005_certification.sql:21-77`); answer keys **admin-only** via RLS (`003_academy.sql:312-320`).
- Delivery RPC `get_exam()` returns questions + option **labels only**, no `is_correct`
  (`005_certification.sql:113-159`).
- Grading RPC `submit_exam()`: enrollment + **all-lessons-completed prerequisite**, percentage score,
  `score >= passing_score` (`:163-266`).
- **Passing score = 70%** (`003_academy.sql:132`; enforced `005:234`).
- Student flow BUILT: exam page (`app/[locale]/academy/exam/page.tsx`), `ExamForm.tsx`, submit action
  (`lib/actions/exam.ts:19-47`).
- **Exam questions seeded:** Foundations (4 Q) + Fast Track (3 Q) with answer keys
  (`seed/certification_exams.sql:8-92`).

**Partially defined**
- **Question bank depth** — minimal (4 / 3). Works, but thin vs a real exam.
- **Retake handling** — attempts are recorded and only the first **pass** certifies (idempotent), but
  there is **no cap/cooldown** (unlimited retakes). Documented retake intent is not enforced.

**Missing**
- **Exam timer / time limit** — no field, no enforcement.
- Per-question feedback; admin pass/fail analytics.

**Blocks implementation?** **No.** Exam is implemented and graded server-side with seeded content.

---

## 3. Certification Readiness

**Fully defined / BUILT**
- `certificates` table (one per `(profile_id, course_id)`), atomic issuance on pass with code
  `AH-XXXXXXXXXXXX` (`005_certification.sql:87-97,240-248`).
- Public `verify_certificate()` RPC (anon-safe) (`:269-295`); student certificate page + QR
  (`app/[locale]/academy/certificate/page.tsx`); public verify page (`app/[locale]/verify/[code]/page.tsx`).
- **Access grant on certify:** trigger sets `role=certified_organizer`, `onboarding_status=certified`,
  `organizer_access_until = issued_at + 30 days` (set **once**; never re-granted on retake)
  (`017_organizer_access.sql:27-59`).
- Post-window **subscription requirement** + gating: `hasOrganizerAccess` (`lib/auth/organizer-access.ts:32-40`),
  server gating (`organizer-access.server.ts:16-37`), middleware (`middleware.ts:159-196`).

**Partially defined**
- **Certification product price** is inconsistent across docs (experienced **$29** vs **$39.99**;
  subscription **$9.99** vs **$19.99**) — affects what checkout charges, not the cert mechanics.

**Missing**
- Certificate **revocation** / access reset; recertification beyond the no-re-grant guard.

**Blocks implementation?** **No.** Certification (issue → role → 30-day window → subscription gate) is
implemented end-to-end.

---

## 4. Implementation Blockers (strict classification)

| Issue | Class | Why |
|---|---|---|
| Academy core (schema/content/UI/progress) | **B — does not block** | Already built + seeded. |
| Exam core (delivery/grading/flow/questions) | **B — does not block** | Already built + seeded; 70% pass enforced server-side. |
| Certification core (issue/verify/access window/gating) | **B — does not block** | Already built end-to-end. |
| **Experienced Review Queue (Under Review status, optional links, approve/reject/redirect, variable internal activation)** | **A — blocks *the Review-Queue feature only*** | Newly accepted decision; **no schema/status/UI/action exists**. Does **not** block Academy/Exam/Cert (the experienced Fast-Track exam path already works). |
| Certification product price reconciliation ($29 vs $39.99; $9.99 vs $19.99) | **A — blocks correct *charging*** (not the mechanics) | Must charge a single decided price; ambiguous today. |
| Safety-mastery gate not enforced as a distinct precondition | **B — does not block** | Built "all-lessons-complete" gate is consistent with the seeded courses; only matters if the full curriculum is loaded. |
| Full curriculum depth (8 modules / Module 7) not seeded | **B — does not block** | Content enrichment; the minimal seed is functional. |
| Exam timer | **B — does not block** | Absent today; exam works untimed. |
| Retake cap / cooldown | **B — does not block** | Unlimited retakes; only first pass certifies (idempotent). |
| Per-question feedback, admin analytics, cert revocation | **B — does not block** | Enhancements. |

**Net:** **No blocker prevents Academy / Exam / Certification implementation — because it is already
implemented.** The only **A** blockers are (i) the **Experienced Review Queue** (a new additive feature)
and (ii) **price reconciliation** for correct charging — neither blocks the three core systems.

---

## 5. Immediate Build Scope

Core Academy/Exam/Certification is already shipped, so "build scope" = the remaining decided work.

**Phase 1 — Experienced Organizer Review Queue (the one decided-but-unbuilt item).**
Per `ORGANIZER_ONBOARDING_SPEC_V1.md §3`: an `Under Review` application state; capture of **optional**
public links (Instagram / Facebook / Meetup / LinkedIn / website / portfolio) as supporting-only;
three outcomes (**approve → admit to Fast-Track exam**, **reject**, **redirect to Academy**); optional
(non-mandatory) manual review; a **variable, internal** activation window (not user-exposed). Reuses the
existing Fast-Track course + exam + certification — no exam/cert redesign.

**Phase 2 — Content & exam depth (decided curriculum).**
Load the fuller curriculum into the existing schema (more modules/lessons; expand the seeded question
bank). If the full documented curriculum (incl. **Module 7 Safety**) is adopted as the launch
curriculum, enforce the safety-mastery precondition. Pure data/seed + a gate flag on the existing engine.

**Phase 3 — Policy hardening (optional, all non-blocking).**
Exam timer; retake cap/cooldown; admin pass/fail analytics; certificate revocation / access reset;
per-question feedback.

---

## 6. Decision List

**Must decide before implementation**
- **Certification product price** — single value for experienced ($29 vs $39.99) and the subscription
  ($9.99 vs $19.99). Needed to charge correctly. *(Pre-existing cross-doc conflict.)*
- **Launch curriculum scope** — is the seeded 2-course / minimal set the launch curriculum, or must the
  full curriculum (8 modules incl. **Module 7 Safety gate**) be loaded and the safety-mastery
  precondition enforced before certifying? (Determines Phase 2 size and whether current certs meet the
  documented standard.)

**Can be decided later**
- Exam **timer** / time limit.
- **Retake cap / cooldown** policy.
- Exam **question-bank size** beyond the seeded minimum.
- Review-Queue **default activation behavior** (auto vs manual; the timing algorithm is explicitly an
  internal detail per the accepted spec).
- Certificate **revocation / recertification**, admin analytics, per-question feedback.

---

## 7. Final Verdict

**Ready for implementation.**

Justification: Academy, Exam, and Certification are **already implemented** — schema, RLS, seeded
content, enrollment + lesson progress, server-graded exam (70% pass, answer keys server-side),
atomic certificate issuance, public verification, and the certified-organizer role + 30-day window +
subscription gating are all **built and present in the codebase** (migrations `003/005/017`, seeds
`academy_content.sql` / `certification_exams.sql`, `app/[locale]/academy/*`, `app/[locale]/verify/*`,
`lib/actions/academy.ts` / `exam.ts`, `lib/auth/organizer-access*`). No item blocks these three core
systems. The only decided-but-unbuilt work is the **Experienced Organizer Review Queue** (an additive
intake feature that reuses the existing Fast-Track exam/cert with no redesign) and a **price
reconciliation** for correct charging — both are implementable immediately and neither blocks the core.
Everything else outstanding (timer, retake cap, content depth, analytics, revocation) is a non-blocking
enhancement.

*(Audit only — current-state reality. No architecture, no new business rules, nothing committed.)*

# Pre-Commit Audit — what is ready to commit

> **Audit only. No code modified, nothing committed or pushed.**
> Baseline: local `HEAD` = `origin/main` = `f1c713f`. Everything below is **uncommitted** working-tree
> state on top of `f1c713f`. Code is verified at the last run (`tsc` clean, `lint` clean, all 9 OPE
> suites pass), so readiness is gated by **manual browser testing** and **migration apply**, not by code
> defects.

**Classification key:** ① Ready for commit · ② Requires manual testing first · ③ Requires migration
apply first · ④ Should not be committed yet.

---

## Summary by classification

### ① Ready for commit — documentation only (no code/runtime dependency)
| Path | Purpose | Dep | Class |
|---|---|---|---|
| `docs/COMPLETED_ACTIVITY_SPEC_V1.md` | Completed Activity rule of record | none | ① |
| `docs/ORGANIZER_ONBOARDING_SPEC_V1.md` | Organizer onboarding spec | none | ① |
| `docs/EXPERIENCED_ORGANIZER_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md` | Review Queue plan | none | ① |
| `docs/ACADEMY_EXAM_CERT_READINESS_AUDIT.md` | Readiness audit | none | ① |
| `docs/ACADEMY_IMPLEMENTATION_EVIDENCE_REPORT.md` | Evidence report | none | ① |
| `docs/DISCOVERY_FEED_AND_SCALE_READINESS_SPEC_V1.md` | Feed/scale spec | none | ① |
| `docs/ACTIVITY_EXECUTION_AND_PROGRESS_SYSTEM_V1.md` (M) | Completed-Activity alignment | none | ① |
| `docs/OPE_CORE_V2_CHANGE_PLAN.md` (M) | Completed-Activity alignment (C7) | none | ① |
| `docs/OPE_EVENT_LIFECYCLE.md` (M) | Completed-Activity alignment | none | ① |
| `docs/ORGANIZER_CAREER_PATH_V1.md` (M) | Completed-Activity alignment (S7 note) | none | ① |
| `docs/ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md` (M) | Completed-Activity alignment (Part 3) | none | ① |

*(All docs are safe to commit now in one docs commit; none affect the running app.)*

### ② Requires manual testing first — Post-Certification UX (code-ready, no migration dep, held for browser verification)
| Path | Purpose | Dependency | Class |
|---|---|---|---|
| `lib/auth/viewer.ts` (new) | `getViewerCtaState()` — viewer org-state source of truth | reuses `organizer-access.ts` | ② |
| `components/layout/PublicHeader.tsx` (M) | `isOrganizer` prop → "Dashboard" CTA | `nav.dashboard` i18n | ② |
| `components/layout/PublicFooter.tsx` (M) | self-fetch viewer state; organizer footer link | `viewer.ts`, `nav.dashboard` | ② |
| `app/[locale]/page.tsx` (M) | homepage CTAs → "Go to dashboard" for organizers | `viewer.ts`, `organizerCta` i18n | ② |
| `app/[locale]/become-an-organizer/page.tsx` (M) | hero/final CTA adapt; no redirect | `viewer.ts`, `organizerCta` | ② |
| `app/[locale]/organizer-philosophy/page.tsx` (M) | CTA adapt | `viewer.ts`, `organizerCta` | ② |
| `app/[locale]/pricing/page.tsx` (M) | per-product CTA (cert/academy/subscription) adapt | `viewer.ts`, `organizerCta` | ② |
| `app/[locale]/academy/page.tsx` (M) | post-certification cleanup (certified-first, demote course) | `academy.goDashboard`/`reviewMaterials` i18n | ② |

### ③ Requires migration apply first — Experienced Review Queue (depends on `037` table + RPCs)
| Path | Purpose | Dependency | Class |
|---|---|---|---|
| `supabase/migrations/037_experienced_applications.sql` (new) | the migration: enum + table + RLS + 4 RPCs | apply to DB (manual) | ③ |
| `app/[locale]/onboarding/experienced/page.tsx` (new) | applicant screen (form / under-review / activated / rejected / redirected) | `get_experienced_application` RPC | ③ |
| `components/onboarding/ExperiencedApplicationForm.tsx` (new) | optional-links application form | `submit_experienced_application` RPC | ③ |
| `app/[locale]/admin/experienced/page.tsx` (new) | admin review queue (approve/reject/redirect) | `admin_list_*` / `admin_review_*` RPC + admin role | ③ |
| `lib/actions/experiencedReview.ts` (new) | submit / switch-to-academy / admin review actions | `037` RPCs | ③ |
| `app/[locale]/onboarding/page.tsx` (M) | route experienced path → `/onboarding/experienced` | `get_experienced_application` RPC | ③ |
| `app/[locale]/academy/exam/page.tsx` (M) | experienced exam gate (activated only) | `get_experienced_application` RPC | ③ |
| `lib/actions/billing.ts` (M) | B1 — experienced payment only after activation | `get_experienced_application` RPC | ③ |
| `app/[locale]/admin/layout.tsx` (M) | admin nav entry → experienced | `admin.nav.experienced` i18n + admin role | ③ |

> **Also requires an admin account to exist** to exercise the admin side (`/admin/experienced`): no
> in-app admin bootstrap exists — a manual `UPDATE profiles SET role='admin'` is required (see prior
> admin-access audit). Applicant side needs `037` only.

### ④ Should not be committed yet
| Path | Purpose | Why | Recommendation |
|---|---|---|---|
| `.claude/settings.local.json` (M) | local CLI permission settings | tracked, but local/private churn — not an intentional project change | **Exclude** (leave unstaged) |
| `supabase/migrations/036_invoices.sql` (M) | already-applied invoice migration | the only diff is **one accidental blank line** at the top of an already-deployed migration | **Revert** (`git checkout -- supabase/migrations/036_invoices.sql`); do not commit |

---

## Shared dependency — the `messages/*.json` files (de/en/es/fr/pt/ru)
Each locale file carries keys for **both** group B and group A:
- **B (UX):** `organizerCta.*`, `academy.goDashboard`, `academy.reviewMaterials`, and the relabel
  `billing.includedAccess.subscribeCta = "Extend access"`.
- **A (Review Queue):** `experiencedReview.*`, `admin.experienced.*`, `admin.nav.experienced`.

A single JSON file can't be split per group without partial staging, so the 6 message files straddle ②
and ③. They are **additive and harmless on their own** (unused keys don't break anything), but are only
meaningful with their consumers. **Recommendation:** commit each locale file **together with whichever
group ships first**, or commit messages with **both** groups if A and B ship together.

---

## A. Files related to Experienced Review Queue
- `supabase/migrations/037_experienced_applications.sql` *(also group C)*
- `app/[locale]/onboarding/experienced/page.tsx`
- `app/[locale]/admin/experienced/page.tsx`
- `components/onboarding/ExperiencedApplicationForm.tsx`
- `lib/actions/experiencedReview.ts`
- `app/[locale]/onboarding/page.tsx` (routing)
- `app/[locale]/academy/exam/page.tsx` (exam gate)
- `lib/actions/billing.ts` (B1 payment gate)
- `app/[locale]/admin/layout.tsx` (nav entry)
- `messages/*.json` (experiencedReview + admin.experienced keys — shared with B)
- `docs/EXPERIENCED_ORGANIZER_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md` (doc — already ① ready)

**Gate:** ③ apply `037` to the DB first; admin side also needs a bootstrapped admin.

## B. Files related to Post-Certification UX cleanup
- `lib/auth/viewer.ts`
- `components/layout/PublicHeader.tsx`
- `components/layout/PublicFooter.tsx`
- `app/[locale]/page.tsx`
- `app/[locale]/become-an-organizer/page.tsx`
- `app/[locale]/organizer-philosophy/page.tsx`
- `app/[locale]/pricing/page.tsx`
- `app/[locale]/academy/page.tsx`
- `messages/*.json` (organizerCta + academy keys + billing relabel — shared with A)

**Gate:** ② manual browser verification. **No migration dependency** — independently shippable from A.

## C. Files related to migration 037
- `supabase/migrations/037_experienced_applications.sql` — the migration source (enum, table, RLS, 4
  RPCs). Syntax fixed (single `DECLARE` sections). **Commit the file with group A, but apply it to the
  database before the A code runs**; the whole of group A is non-functional (and would error on the
  experienced paths) until `037` is applied.

## D. Unrelated files currently in the working tree
*(Not part of A/B/C — these belong to earlier doc tasks or are noise.)*
- **Completed Activity alignment (docs, ① ready):** `ACTIVITY_EXECUTION_AND_PROGRESS_SYSTEM_V1.md`,
  `OPE_CORE_V2_CHANGE_PLAN.md`, `OPE_EVENT_LIFECYCLE.md`, `ORGANIZER_CAREER_PATH_V1.md`,
  `ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md`.
- **Standalone spec/audit docs (① ready):** `COMPLETED_ACTIVITY_SPEC_V1.md`,
  `ORGANIZER_ONBOARDING_SPEC_V1.md`, `ACADEMY_EXAM_CERT_READINESS_AUDIT.md`,
  `ACADEMY_IMPLEMENTATION_EVIDENCE_REPORT.md`, `DISCOVERY_FEED_AND_SCALE_READINESS_SPEC_V1.md`.
- **Noise / exclude (④):** `.claude/settings.local.json` (local), `supabase/migrations/036_invoices.sql`
  (accidental blank line — revert).
- **Already committed (not in scope):** `app/[locale]/dashboard/plans/*` is **tracked** in `f1c713f`,
  unmodified — it is *not* an uncommitted change despite appearing on disk.

---

## Recommended commit sequence (no action taken here)
1. **Now:** commit the ① docs (group D docs + the three A/B plan docs) — zero risk, no app impact.
2. **Exclude/revert ④:** keep `.claude/settings.local.json` unstaged; revert the `036` blank line.
3. **After browser-testing B:** commit group **B** (UX) + its `messages` keys — independent of `037`.
4. **After applying `037` + bootstrapping an admin and testing A:** commit group **A** (incl. the `037`
   file) + its `messages` keys.

*(Audit only — no modifications, no commits, no pushes.)*

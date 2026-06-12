# OPE M3 — Implementation Plan: Class Pattern

> **Scope (strict):** add **only the Class Pattern** on top of the existing M1 (Celebration + Meetup)
> and M2 (Recurring modifier) engine.
> **NOT in scope:** Community, Vendor Network, Crew Network, Marketplace, payments, organizer
> onboarding, full instructor marketplace, revenue/charging model.
> **Authority:** `OPE_IMPLEMENTATION_READY.md`, `OPE_PATTERN_LIBRARY.md` (Class pattern),
> `OPE_KNOWLEDGE_MODEL.md` (Class blocks), `OPE_M2_IMPLEMENTATION_PLAN.md`, and the current
> `lib/ope/*` implementation.
> **Date:** 2026-06-10.

---

## 0. Current architecture (what M3 builds on)

After M1+M2, `lib/ope` is: `index.generatePlan` → `coverage.evaluateCoverage` (gate) →
`clarification.assessClarification` → `classify.classifyActivity` (registry-driven via `activities.ts`)
→ `engine.runEngine` (`assemble → budget → output → communication → applyModifiers`). Patterns today:
`celebration`, `meetup`. Modifier: `recurring`. Content: birthday/bbq/networking bundles + Honolulu
birthday/bbq pricing. Result statuses: `plan_ready | needs_clarification | unsupported |
needs_human_review | needs_certified_organizer | unsupported_modifier`.

M3 adds a **third pattern** the same way M1 added Celebration neighbours: **new content labels +
pattern + content bundle + pricing seed + gate/clarification rules** — no new engine.

---

## 1. What "Class Pattern" means in OPE

**An instructor leads participants through a skill, once (workshop) or as a series (course).** It is
distinct from Celebration (host an occasion) and Meetup (peer gathering) by three things:
- an **instructor** (provided or needed) — the first taste of staffing,
- **participants with per-seat materials** (per-head economics), and
- **registration/capacity** instead of guest RSVP.

Covers (M3 content): **yoga / fitness / dance class, art class, language class, workshop.**
Class is **Recurring-capable** (a course = weekly sessions) and reuses the M2 Recurring modifier.

---

## 2. Class-specific Knowledge Blocks (per `OPE_KNOWLEDGE_MODEL`)

| Block | What Class needs to know | Where it lives in M3 |
|---|---|---|
| **Instructor** | have-vs-need, fee, qualification note, learner ratio | `class` content bundle (cost driver + task + risk) + `instructor` input |
| **Materials / Equipment** | per-seat materials + flat equipment/AV | cost drivers `materials_per_head`, `equipment_rental` |
| **Venue** | studio/hall/indoor (not backyard/park); capacity | venue handling + `venue_hire` cost driver |
| **Registration** | seat capacity = participant count; (full registration system out of scope) | reuse `guestCount` as participant count |
| **Schedule** | session plan + (recurring) cadence + per-session reminders | timeline + M2 recurrence |
| **Safety** | instructor qualification, injury (physical), materials hazard, minors supervision | risk defs in bundle |
| **Pricing** | per-seat economics: instructor (flat) + venue (flat) + materials (per-head) | `honolulu/class` seed |
| **Communications** | enrol → confirm → prep → reminder → follow-up/next | comm templates in bundle |

The **6 universal blocks** (Attendance, Venue, Schedule, Safety, Pricing, Communications) are reused;
**Instructor + Registration + Materials** are the Class-specific additions.

---

## 3. Supported M3 scope

**SUPPORTED → `plan_ready`:**
- simple (one-time) class — yoga/art/language/workshop,
- recurring class (course) via the M2 Recurring modifier,
- class with a **fixed budget** (cost target) **or a per-participant budget** (UI multiplies to a total
  target — no revenue/charging logic).

**GATED → handoff (no plan):**
- **children-heavy class without supervision data** → `needs_human_review` (or clarify supervision first),
- **regulated classes** (driving, firearms, scuba, etc.) → `needs_human_review`,
- **medical / therapeutic** (physio, therapy) → `needs_human_review` (sensitive [S]),
- **high-risk physical** (aerial, full-contact, climbing) → `needs_certified_organizer`,
- **classes requiring instructor certification verification** → `needs_human_review` (we can't verify).

**UNSUPPORTED → honest "not yet":**
- anything requiring **licensing not modeled** → `unsupported`.

> Detection of GATED/UNSUPPORTED sub-types is by **keyword rules on `specialRequirements`** within a
> Class category (mirrors the existing domain-rule mechanism in `coverage.ts`).

---

## 4. Data / content additions

- **New pattern:** `OpePattern += 'class'`.
- **New pricing reference:** `PricingCategory += 'class'`.
- **New content labels (`PlannerCategory +=`):** `fitness_class` (yoga/dance/fitness), `art_class`,
  `language_class`, `workshop`. *(dance_class / cooking_class can be added later as content — same bundle.)*
- **New content bundle:** `data/ope/modules/class/core.v1.json`:
  - **phases:** plan → promote/enrol → prepare → run session → follow-up.
  - **tasks:** confirm-or-find instructor, book venue, prepare per-seat materials, open registration,
    set up, run session, send follow-up / next-session note.
  - **cost_drivers:** `instructor_fee` (flat, **applies_if `instructor_needed`**), `venue_hire` (flat),
    `materials_per_head` (per-participant, driver = participant count), `equipment_rental` (flat, optional).
  - **risks:** instructor qualification (always), injury (applies_if physical), materials hazard
    (applies_if art/tools), minors supervision (applies_if kids).
  - **communication_templates:** enrollment, confirmation, pre-class prep, reminder, follow-up/next.
  - **derived_quantities:** `materials = participant_count`.
  - **config_defaults:** contingency, buffers.
  - **Optional subtypes** (like birthday young-kids): `st-physical` (adds injury risk for
    fitness/dance), `st-materials` (adds art-materials risk) — selected by category.
- **New pricing seed:** `data/ope/pricing/honolulu/class.v1.json` with `instructor_fee`, `venue_hire`,
  `materials_per_head`, `equipment_rental` low/likely/high bands. All Class categories price against
  `class`.

---

## 5. Clarification behaviour (light, ≤3)

For a Class category, ask only high-value missing facts (each changes budget/risk/resources):
1. **Instructor** — "Do you have an instructor, or do you need one?" *(big budget swing: include/exclude
   `instructor_fee`).*
2. **Venue** — "Where will it be held — a studio/hall, or another space?" *(pricing + risk).*
3. **Materials** — "Will you provide materials, or should participants bring their own?" *(materials cost).*

Not asked: participant count (form-required), budget (Class **is** priced, so missing budget is fine —
unlike Meetup/networking), recurrence (structured control). Cap remains **3** total
(`assessClarification`).

---

## 6. Recurring interaction (reuse M2)

- Class is `recurringCapable: true` in `activities.ts`, so the **M2 Recurring modifier applies
  unchanged**: a recurring class adds `section_b.recurrence` (cadence) and — because **Class is priced**
  — finally exercises `budget.per_session` + `series_total` with real numbers (the M2 series math, dormant
  in M2 because networking was unpriced, becomes live in M3).
- `applyModifiers` already runs in `runEngine`; no modifier code changes.
- Recurrence on Class is allowed (recurring-capable); recurrence on Celebration still → `unsupported_modifier`
  (unchanged).

---

## 7. Output changes (additive-only; ideally none)

- **No new required output fields.** Class is delivered as **content** (bundle tasks/risks/cost-drivers/
  templates + pricing) on the existing `ACTIVITY_PLANNER_OUTPUTS_V1` shape, **reusing the M2 recurrence
  fields** for recurring classes.
- Optional, only if needed for clarity: `section_a` may carry the headcount as participants via the
  existing `guest_count` (label "participants" in the UI). No schema change required.
- Instructor "have/need" surfaces as a **task** ("Confirm your instructor" / "Find an instructor"), not a
  new field. Materials surface as cost lines + tasks.

> Net: M3 adds **zero** new output schema fields. This keeps OUTPUTS_V1 canonical and one-time/M2 plans
> byte-identical.

---

## 8. Tests (snapshot + invariants)

**Regression (must stay byte-identical):** all **22 existing M1/M2 fixture cases** unchanged — incl. the
yoga/workshop/art-class cases that are submitted as `category: networking` (they stay `unsupported`,
because the domain rules still apply to non-Class patterns — see §9 guard).

**New Class cases:**
| Case | Expect |
|---|---|
| one-time yoga class (`fitness_class`, instructor have, venue, materials) | `supported` (priced) |
| weekly yoga class (`fitness_class` + recurrence weekly + sessions) | `supported` — recurrence + **per_session/series_total** |
| art workshop (`workshop`/`art_class`) | `supported` |
| language class (`language_class`) | `supported` |
| class, no instructor info | `clarify` (ask instructor) |
| class, no materials info | `clarify` (ask materials) |
| kids-heavy class, no supervision data | `needs_human_review` |
| high-risk class (e.g. "aerial", "full contact") | `needs_certified_organizer` |
| regulated class (e.g. "scuba", "driving licence") | `unsupported` / `needs_human_review` |

**Unit check:** with Class priced, add a real-content assertion that recurring class produces
`series_total = per-session × sessions` (replaces the synthetic M2 unit check, or keep both).

**Invariants:** supported → `plan_ready` + plan; clarify → `needs_clarification` + ≥1 question + null
plan; gated/unsupported → refusal + null plan (no silent fallback).

---

## 9. Exact files likely to change

| File | Change |
|---|---|
| `lib/ope/types.ts` | `OpePattern += 'class'`; `PricingCategory += 'class'`; `PlannerCategory += class labels`; add optional `instructor?: 'have'\|'need'` and `materials?: 'provided'\|'byo'` to `PlannerInput` + `Scenario`; add optional `applies_if?` to `CostDriver` |
| `lib/ope/activities.ts` | add 4 Class `ActivityDef`s (pattern `class`, pricingCategory `class`, baseModules `class`, `recurringCapable: true`, subtype flags) |
| `lib/ope/data.ts` | import `class` module(s) + `honolulu/class` seed; `getModulesFor` handles `baseModules:'class'` (+ subtypes); add `'honolulu/class'` to `SEED_PRICING` |
| `lib/ope/budget.ts` | filter cost drivers by `applies_if` against a small flag set (`instructor_needed`, `physical`, …) — additive; modules without `applies_if` unaffected (byte-identical) |
| `lib/ope/coverage.ts` | (a) **guard** the FITNESS/EDUCATION/`class`-cadence refusal rules so they apply only when pattern ≠ `class`; (b) add `class` → `plan_ready` (confidence ~0.7); (c) add Class GATED/UNSUPPORTED keyword rules (medical/regulated/high-risk/licensing); recurrence already handled |
| `lib/ope/clarification.ts` | add Class questions (instructor, venue, materials), respecting the ≤3 cap |
| `lib/ope/index.ts` | pass `instructor`/`materials` into `Scenario` |
| `lib/actions/planner.ts` | zod: add Class categories, `instructor` enum, `materials` enum |
| `components/planner/PlannerClient.tsx` | add Class category chips; Class-only inputs (instructor have/need, materials); show the M2 Repeats control for Class (recurring-capable); "participants" label |
| `components/planner/PlanResult.tsx` | optional: label headcount "participants" for Class; otherwise unchanged |
| `messages/{en,es,fr,ru,de,pt}.json` | Class category + input labels (parity, +6 locales) |
| `data/ope/modules/class/*.json` | **new** content bundle(s) |
| `data/ope/pricing/honolulu/class.v1.json` | **new** pricing seed |
| `scripts/ope-snapshot-test.mts` + `__fixtures__/ope-golden.json` | add Class cases; prove 22 byte-identical first, then `--update` |

**Not changed:** `engine.ts`, `modifiers.ts`, `assembly.ts`, `output.ts`, `communication.ts`,
`risk.ts` (Class flows through them via content; the only engine-logic addition is the `applies_if`
cost-driver filter in `budget.ts`).

---

## 10. Close-out

### Implementation order
1. **Types + `activities.ts`** (pattern `class`, 4 categories, pricing ref, instructor/materials fields,
   `CostDriver.applies_if`).
2. **Content:** author `class` bundle(s) + `honolulu/class` pricing seed (organizer-review the risk/safety
   values, per the standing safety sign-off gate).
3. **`data.ts`** wiring.
4. **`budget.ts`** conditional cost-driver filter (`applies_if`).
5. **`coverage.ts`:** guard domain rules by pattern, add Class support + Class gating.
6. **`clarification.ts`:** Class questions.
7. **`index.ts`:** scenario fields.
8. **Snapshot:** run unchanged test → **prove 22 M1/M2 cases byte-identical**; then add Class cases +
   `--update`.
9. **UI + i18n** (6 locales, parity).
10. **Verify:** `npm run test:ope`, `tsc --noEmit`, `npm run build`. Do not commit.

### Acceptance criteria
- `npm run test:ope` green: 22 M1/M2 cases byte-for-byte + all new Class cases pass invariants.
- Recurring **priced** class produces `per_session` + correct `series_total`.
- `tsc --noEmit` clean; `npm run build` compiles; i18n parity maintained across 6 locales.
- Class GATED/UNSUPPORTED sub-types refuse with clear reasons (no silent fallback, no force-map).
- Scope honoured: no Community/Vendor/Crew/Marketplace/payments/onboarding/instructor-marketplace/revenue.

### What must remain byte-identical
- **All 22 existing M1/M2 fixture cases**, including the yoga/workshop/art-class requests submitted as
  `category: networking` (still `unsupported` — the domain rules remain in force for non-Class patterns;
  the §9 guard only lifts them for explicit Class categories).
- Every M1/M2 one-time and recurring plan when no Class category and no new field is used (new inputs are
  optional → absent → unchanged serialization; `applies_if` filter is a no-op for existing modules).

---

_Plan only. No code written, nothing committed._

# ADR-002 — OPE Coverage / Complexity Gate

- **Status:** Accepted
- **Date:** 2026-06-10
- **Deciders:** project owner + engineering
- **Related:** `docs/OPE_STRESS_TEST.md`, `docs/OPE_MASTER_SPEC.md` (§4 Activity Classification),
  `docs/OPE_GAP_ANALYSIS.md` (§4), `docs/ADR_001_OPE_CORE_IS_PLATFORM_CORE.md`

---

## Context

The stress test (`OPE_STRESS_TEST.md`) proved the engine's most dangerous behavior: it **never
refused**. For 17 of 20 realistic scenarios it produced a confident, mislabeled, mispriced plan — a
120-guest wedding returned as a *"Kids Birthday Party"* budgeted at **$2,245**; a beach cleanup priced
as a **$610 BBQ**; a soccer tournament as a **$1,355 cookout**. Confidently wrong is worse than empty:
a user could act on it.

Root cause: there was no classification/coverage step. Whatever category the form allowed
(`birthday | bbq | networking`) went straight into composition, and complexity (size, money, safety,
recurring, minors, permits, vendors) was never assessed.

## Decision

Add a **Coverage / Complexity Gate** (`lib/ope/coverage.ts`) that runs **before** any composition,
inside the public `generatePlan()` entry point. It returns one of four states and **only `plan_ready`
proceeds to generate a plan**. There is **no silent category fallback** — an event the gate cannot
support is refused or handed off, never force-mapped.

**States**
- `plan_ready` — supported and within limits; a plan is generated.
- `unsupported` — activity type OPE does not model yet (sports, volunteer, outdoor, classes,
  recurring/series).
- `needs_human_review` — money collection (fundraiser/donations/auction), large-minor supervision, or
  a networking event with no budget to work from.
- `needs_certified_organizer` — high-stakes / large / high-budget (weddings, events over the
  self-serve size/budget limits).

**Supported MVP set (unchanged — no new categories added):**
- kids birthday (`birthday`)
- BBQ / family picnic (`bbq`)
- simple networking (`networking`) **only if a budget is given** (we cannot price networking yet, so
  an unpriced networking plan is produced only when the user has explicitly supplied a budget target).

**Result contract.** `generatePlan()` now returns `PlanGenerationResult`:
```
{ status, coverage: { status, reason, recommended_next_step, confidence, missing_capabilities }, plan }
```
`plan` is non-null only for `plan_ready`. This is an **intentional output change** (per ADR-001's
rule): the supported plan object is byte-identical to before, now wrapped in this envelope.

**Gate signals (current, deterministic).**
- Free-text domain detection over the request's `special_requirements` (wedding, tournament/referee,
  fundraiser/donation/auction, cleanup/waiver, hiking/trail, workshop/class/easel, yoga, recurring/club).
- Structural thresholds: guests > 60 → `needs_certified_organizer`; budget > 5000 →
  `needs_certified_organizer`; kids > 30 → `needs_human_review`.
- Category support: networking requires a budget; birthday/bbq supported within limits.

## Scope (explicit)

**Did:** add the gate, the four-state result, the structured `coverage` output, a handoff UI state, and
coverage-aware snapshot tests. **Did NOT:** add any new category, Vendor/Crew/Monitoring engines, or
new planner features. UI change is limited to surfacing the new refusal/handoff state
(`components/planner/PlanHandoff.tsx`; `PlannerClient` branches on `status`).

## Consequences

**Positive**
- OPE no longer emits confident wrong plans for the tested dangerous cases; it refuses with a reason,
  a recommended next step, a confidence score, and the missing capabilities.
- Honest coverage signal feeds the future Marketplace handoff (`needs_certified_organizer`) and human
  review path.

**Negative / limits (be honest)**
- Detection is **keyword + threshold** over `special_requirements` — the only free-text the engine has.
  A mis-described event (e.g., a wedding entered only as "birthday, 20 guests") can still slip through.
  This gate reduces dangerous output for detectable cases; it is not a semantic intent classifier.
- Thresholds (60 guests / $5000 / 30 kids) are conservative guesses, not calibrated. Some legitimate
  large birthdays/BBQs will be routed to an organizer (acceptable: safe over sorry).
- The `needs_*` states currently have **no destination** wired (no real organizer handoff / review
  queue yet) — they are honest dead-ends until the Marketplace `request_brief` exists.

## Compatibility & tests

- Supported `birthday` and `bbq` (and networking-with-budget) still return `plan_ready` with a plan
  whose content is unchanged from before the gate.
- `scripts/ope-snapshot-test.mts` (`npm run test:ope`) now asserts: supported → `plan_ready` + plan;
  the 10 refusal cases → non-`plan_ready` + `plan === null` (no fallback); plus byte regression against
  `scripts/__fixtures__/ope-golden.json`. The fixture was updated deliberately (`--update`) for this
  intended contract change.
- `tsc --noEmit` passes; `next build` compiles; all 6 locales kept at key parity (+8 handoff keys each).

## Compliance rule (extends ADR-001)

> Any change to `lib/ope/*` must keep `npm run test:ope` green. New unsupported/handoff routing must
> preserve the invariant **refusal ⇒ `plan === null`** (no silent category fallback). Output-shape
> changes must be explained and the fixture updated with `--update`.

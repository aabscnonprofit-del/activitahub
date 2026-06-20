# OPE Implementation Alignment Report

> **Type:** code audit + smallest-patch proposal. **No** new architecture, no UI redesign, no
> Academy/Connect work. **No code modified** (audit step).
> **Governing decisions:** Planning Readiness Principle · WSH as the Planning Input · Discovery
> develops WSH; Planning consumes WSH. **Target chain:** `Request → Discovery (if needed) → WSH
> → Approval → Plan`.

## Files inspected

- `lib/actions/planner.ts` — `analyzeIdeaAction`, `generateFromIdeaAction` (WSH gate),
  `generatePlanAction` (legacy).
- `lib/ope/concept-funnel.ts` — `recognizeScenario`, `draftWhatShouldHappen`,
  `deriveWhatShouldHappen`.
- `lib/ai/concept-generation.ts` — `composeWhatShouldHappen` (AI-first, deterministic fallback).
- `lib/ope/index.ts` — `generatePlan` (the engine entry).
- `lib/ope/concept-plan.ts` — `planFromIdea` (orchestrator).
- `lib/actions/opePlans.ts` — `createPlan`, `createPlanFromRequest`,
  `generateApproachesFromRequest`, `updatePlanInputs` (organizer-dashboard planning).
- `components/planner/PlannerClient.tsx` — idea → wsh → details → plan UI.

## Current OPE flow in code

**Public idea-first flow (ALIGNED with the target chain):**
```
raw idea
  → analyzeIdeaAction (planner.ts)
       → recognizeScenario (concept-funnel.ts):
            recognized (itinerary / narrative / operational) → whatShouldHappen = the request story   [planning-ready → no Discovery]
            not recognized → composeWhatShouldHappen → a request-specific WSH DRAFT                    [not ready → create WSH]
  → PlannerClient 'wsh' step: user EDITS/APPROVES the draft → approvedWhatShouldHappen
  → generateFromIdeaAction (planner.ts:157-159): GATE — `if (!approvedWhatShouldHappen) → what_should_happen_required`
       → build PlannerInput from `details` + fold WSH into enriched text → generatePlan → PlanGenerationResult
  → plan → proposal (sendProposalFromPlan, …)
```

**Other planning entry points (do NOT pass through WSH):**
- `lib/actions/opePlans.ts` — **5** `generatePlan()` call sites (`:41, :141, :148, :278, :283, :568`):
  organizer dashboard creates plans from a **structured PlannerInput** or a **customer request**
  directly — **no WSH gate**. *(Live organizer workspace.)*
- `lib/ope/concept-plan.ts:51` — `planFromIdea` reaches `generatePlan` via concept selection,
  **no WSH gate**. *(Callers: only `scripts/ope-concept-funnel-test.mts` — test-only.)*
- `lib/actions/planner.ts:25` — `generatePlanAction(raw)` calls `generatePlan` directly,
  **no WSH gate**. *(Callers: **none** in repo — unused/legacy.)*

**WSH-gate enforcement** exists at **exactly one** of the four entry points
(`generateFromIdeaAction`, `planner.ts:157-159`).

## Gaps (vs `Discovery → WSH → Planning → Plan`)

| # | Gap | Evidence | Severity | In task scope? |
|---|---|---|---|---|
| G1 | **WSH gate covers only the public idea path.** The organizer-dashboard paths (`opePlans.*`) plan **without** WSH — so "Planning consumes WSH" holds on one surface, not the workspace. | `opePlans.ts` 5× `generatePlan` direct | **Moderate** | Partially (aligning the dashboard touches its UI/flow → larger) |
| G2 | **WSH is consumed as gate + free-text only**, not as the structured planning input: the deterministic `PlannerInput` is built from `details` (form fields), and WSH is folded into `enriched` prose (`…— what should happen: ${wsh}`). The plan derives from `details`, not WSH. | `planner.ts` `generateFromIdeaAction` build block | **Moderate** | Yes, but **not small** |
| G3 | **Planning-readiness is tested on the REQUEST** (`recognizeScenario`), not on **WSH sufficiency** (per *WSH as the Planning Input*); and "Discovery" is a **single-shot draft+approve**, not the iterative engine (`OPE_DISCOVERY_ENGINE_PRINCIPLES_V1` is doc-only). | `recognizeScenario` / `composeWhatShouldHappen` | **Minor** | Known (see `IMPLEMENTATION_GAP_AUDIT`) |
| G4 | **Latent WSH-gate bypasses:** `generatePlanAction` (unused) and `planFromIdea` (test-only) reach `generatePlan` with no WSH step. | `planner.ts:25`, `concept-plan.ts:51` | **Minor** | Yes (G4a is small) |
| G5 | **Terminology drift:** the WSH-state wrapper is named `ScenarioState` / `scenario_recognized` / `scenario_needed` (field is `whatShouldHappen`). Glossary says don't adopt "Scenario" yet. | `planner.ts` `ScenarioState` | **Cosmetic** | Optional |

**Already aligned (no action):**
- **Focus 2 — WSH ≠ Plan:** in code WSH is a `string`; the plan is a `PlanGenerationResult`.
  `conceptWhatShouldHappen` (the old concept-reformat) was removed. ✅
- **Focus 5 — WSH gate intact:** `generateFromIdeaAction` gate present and exercised by `test:wsh`,
  `test:scenario`, `test:idea`. ✅
- **Focus 1 — public Request → WSH → Approval → Plan:** wired end-to-end on the idea path. ✅

## Proposed smallest patch set (NOT implemented — for approval)

Ordered by size/risk. Only **P1** qualifies as "small and obvious"; the rest need a scoped task.

- **P1 (small, safe, optional) — remove or explicitly deprecate the unused
  `generatePlanAction`** (`planner.ts:21-30`). It is a public planning entry with **no WSH gate**
  and **zero callers** in the repo; removing it shrinks the WSH-bypass surface and aligns
  "Planning consumes WSH." *(Risk: an out-of-repo caller — low; it is a `'use server'` action with
  no in-repo references.)*
- **P2 (small) — fence the test-only bypass:** add a doc-comment on `planFromIdea` noting it is a
  **non-WSH-gated, test/secondary** orchestrator (not a product entry), to prevent it being wired
  to a surface. *(No behavior change.)*
- **P3 (defer — not small) — route the organizer-dashboard paths through WSH (G1).** Requires a WSH
  step in the dashboard plan-creation flow — a **UI/flow change** explicitly out of scope here.
- **P4 (defer — not small) — make WSH the structured planning input (G2).** Requires parsing/mapping
  WSH into `PlannerInput` so the plan derives from WSH, not only `details` — needs design.
- **P5 (defer — not small) — implement the iterative Discovery engine (G3).** Doc-only today; a
  feature, not an alignment tweak.

## Risks

- **Touching `opePlans.*` (organizer dashboard)** risks breaking the live workspace, which has **no
  WSH UI** — and the task forbids UI redesign. **Out of scope.**
- **Removing `generatePlanAction`** is low-risk (unused) but alters a public `'use server'` export.
- Any change **must keep the `generateFromIdeaAction` WSH gate intact** (Focus 5) and all suites
  green (esp. the byte-for-byte OPE snapshot).

## Tests to run (before/after any patch)

`npx tsc --noEmit` · `npm run lint` · `test:wsh` · `test:scenario` · `test:idea` · `test:concept`
· `test:intent` · `test:ope` (31 byte-for-byte) · `test:ope-text` · `test:ope-contract`.

## Recommendation

**The public `Request → WSH → Approval → Plan` flow is already aligned and the WSH gate is intact.**
No divergence is simultaneously **small, obvious, and in-scope** enough to implement unprompted —
**except optionally P1** (deleting the unused, ungated `generatePlanAction`). The material
alignment work (G1 organizer-path WSH; G2 WSH-as-structured-input; G3 Discovery engine) is either
**out of scope** (dashboard UI) or **not small** (needs a scoped design).

**Holding implementation.** Please confirm whether to (a) apply **P1** (remove the dead
`generatePlanAction`) now, and/or (b) open a scoped task for **G1/G2**. Until then, no code is
changed.

*(Audit only — no architecture, no UI redesign, no Academy/Connect work, nothing implemented.)*

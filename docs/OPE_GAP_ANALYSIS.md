# OPE — Implementation Gap Analysis (impl vs OPE_MASTER_SPEC.md)

> **Compares:** the current code in `lib/ope/*` + planner glue (`lib/actions/planner.ts`,
> `components/planner/*`) against `docs/OPE_MASTER_SPEC.md`.
> **Produces:** a per-engine keep / rewrite / delete decision + MVP priority, then a final
> refactor-vs-rewrite recommendation.
> **Stance:** honest and conservative — preserve working deterministic code; only rewrite where the
> structure actively blocks the spec; delete only true duplication/dead weight.
> **Date:** 2026-06-10.

---

## Architectural finding (read first)

The spec defines **10 discrete engines**. The implementation is **not** structured that way — it is a
small, sound **monolithic pipeline**:

- `lib/ope/index.ts` — input → Scenario mapping (+ a little classification).
- `lib/ope/data.ts` — module/seed registry + `getModulesFor` (+ a little classification).
- `lib/ope/engine.ts` — `compose()` (Assembly **+** Resource quantities **+** timeline) **and**
  `buildOutput()` **and** the AI layer (Communication) all in one file.
- `lib/ope/budget.ts` — cost engine.
- `lib/ope/pricing.ts` — PricingProvider chain (the cleanest, most spec-aligned piece).
- `lib/ope/types.ts` — the shared contracts (module, scenario, budget, output, `HistoricalPriceRecord`).

So the gap is **two different things at once**:
1. **Missing engines** (Vendor, Staffing, Execution, Monitoring, Classification-routing) — net-new, additive.
2. **Boundary erosion** — Assembly/Resource/Communication/Output are fused in `engine.ts`. The *logic*
   is fine; the *modularity* the spec assumes isn't there yet.

This distinction is what makes the final answer **hybrid**, not "rewrite."

---

## Per-engine analysis

### 3. Inputs — Scenario Intake
- **Files:** `index.ts` (`generatePlan` → Scenario), `lib/actions/planner.ts` (zod), `types.ts` (`PlannerInput`, `Scenario`).
- **Status:** `IMPLEMENTED (subset)`.
- **Matches spec:** validated Scenario contract; category/guests/breakdown/venue/location/budget/requirements; currency field present.
- **Missing:** `date`, duration/time; `vibe` separate from `special_requirements`; full `venue_type` set (indoor/venue/not-sure); `context` (surface/role) not modeled.
- **Keep:** the whole contract; zod validation; `Scenario` shape.
- **Rewrite:** minor — add `date`, widen `venue_type`, split `vibe`. Additive, no breakage.
- **Delete:** nothing.
- **MVP priority:** **P1** (date + venue breadth unblock community-meetup and Execution).

### 4. Activity Classification Engine
- **Files:** logic scattered in `index.ts:16-17` (category label, `kidsPresent`) and `data.ts:25-36` (`getModulesFor`).
- **Status:** `PARTIAL` (really: **absent as an engine**).
- **Matches spec:** category → module selection works; birthday→young-kids subtype derivation works.
- **Missing:** scale/complexity tiering; the **route decision** (self-serve vs organizer-grade); free-text intent parsing. `planner.ts:9` allows `guestCount ≤ 100_000` with no guard.
- **Keep:** the category→module mapping and subtype rule (move them into a real classifier).
- **Rewrite:** **extract** a `classify()` step that returns `{category, subtypes, scale_tier, complexity_tier, route_decision, module_selector}`. This is *extraction + new logic*, not a rewrite of existing math.
- **Delete:** nothing (relocate `getModulesFor`'s selection into the classifier).
- **MVP priority:** **P1** — the route/size guard is the safety + conversion boundary the concept depends on. Tiering itself can be simple thresholds first.

### 5. Scenario Assembly Engine
- **Files:** `engine.ts:67-136` (`compose`).
- **Status:** `IMPLEMENTED`.
- **Matches spec:** module merge, phase de-dup, risk/template/cost-driver aggregation, config merge, timeline grouping (prep/day-of/after). Strong.
- **Missing:** `milestones` declared in `OpeModule` but unused; assembly is birthday/bbq/networking-shaped (untested on more modules).
- **Keep:** **all of it** — this is the core of "dynamic assembly from modules," exactly per spec §2.
- **Rewrite:** only to **separate** Assembly from Resource/Output (see below). Logic stays.
- **Delete:** nothing.
- **MVP priority:** **P0** (already the backbone).

### 6. Resource Planning Engine
- **Files:** `engine.ts:34-55` (`computeQuantity`, `QtyCtx`), invoked inside `compose`.
- **Status:** `IMPLEMENTED (counts)`.
- **Matches spec:** per-guest/per-kid/flat scaling + food/tableware buffers → quantities feeding Budget.
- **Missing:** quantities are a hardcoded `switch` on known keys — **not data-driven** from the module's `derived_quantities` formulas (the module declares them as strings, but the engine ignores the formula and uses the switch). New resource keys require code edits, mildly violating "new category = new module, not new code." No standalone resource artifact.
- **Keep:** the scaling/buffer logic and `QtyCtx`.
- **Rewrite:** **medium** — make derivation read the module's `derived_quantities` rules instead of a fixed switch, and extract as `planResources()` returning a real `resource_plan` (also reusable by Vendor/Staffing).
- **Delete:** nothing.
- **MVP priority:** **P2** (works today; data-driven derivation matters once categories grow).

### 7. Budget Engine
- **Files:** `budget.ts` (`buildBudget`), `pricing.ts` (`resolvePricing` + providers), seeds in `data.ts`.
- **Status:** `IMPLEMENTED (Honolulu seed + fallback)`.
- **Matches spec:** deterministic low/likely/high, contingency, rollup, key-cost-drivers, levers, provenance, **line-item `item_key` preserved** for correction; **PricingProvider chain** (local→historical→external→fallback) exactly per spec. The pricing abstraction is the **best-aligned** part of the codebase.
- **Missing:** real data only for Honolulu (birthday/bbq); historical/external providers are `→ null` stubs; **no multi-currency calibration** (fallback returns seed currency → non-US users get USD); networking has no seed; no user-correction write path.
- **Keep:** **all the math + the provider interface.** Do not touch the chain design.
- **Rewrite:** nothing structural. **Extend**: add real providers + currency handling as data work.
- **Delete:** nothing.
- **MVP priority:** **P0** engine (done); **P1** data/currency (the budget is wrong-currency for most users — a credibility risk).

### 8. Vendor Engine
- **Files:** none. (`cost_category` exists on cost drivers; that's the only seam.)
- **Status:** `PLANNED` (absent).
- **Matches spec:** nothing built; the cost-category taxonomy is a usable starting seam.
- **Missing:** the entire engine (need→category→match→price feedback) and the Vendor Network behind it.
- **Keep:** n/a.
- **Rewrite:** n/a (new build).
- **Delete:** nothing.
- **MVP priority:** **P3** (post-MVP; depends on Vendor Network, which doesn't exist).

### 9. Staffing Engine
- **Files:** `engine.ts` `computeQuantity` case `supervising_adults` only.
- **Status:** `PARTIAL`.
- **Matches spec:** safety-driven supervising-adult count derives correctly.
- **Missing:** role model (greeter/grill/check-in/translator), crew matching, Crew Network.
- **Keep:** the supervising-adults derivation (fold into the future role model).
- **Rewrite:** n/a now (new build later).
- **Delete:** nothing.
- **MVP priority:** **P3** (count is enough for MVP; full engine post-MVP).

### 10. Communication Engine
- **Files:** `engine.ts:231-328` (`genSummary/genLeversNote/genMessages/genHeadline/genUpgrade`, `applyAiLayer`).
- **Status:** `PARTIAL`.
- **Matches spec:** slot mapping (invitation/reminder/thank-you/feedback), deterministic templating under the frozen-field guard, summary/levers/headline.
- **Missing:** messages are **token skeletons** (`[date]`, `[allergy_ask]`) — real specifics (allergy/theme/dietary/accessibility) are **not injected** into bodies; checklists/risks not personalized; this is the "feel personal" gap.
- **Keep:** the slot model, guard discipline, summary/levers/headline generators.
- **Rewrite:** **medium** — extract a `Communication` module and make it fill bodies from Scenario specifics (still deterministic; LLM-behind-guard later). No need to discard current generators.
- **Delete:** nothing.
- **MVP priority:** **P1** (personalization is a core selling point; current output reads generic).

### 11. Risk Engine
- **Files:** `engine.ts:145-178` (`riskApplies`, severity/never-drop sort), risk defs in modules.
- **Status:** `IMPLEMENTED`.
- **Matches spec:** always/conditional applicability (`outdoor`, `drop_off_children`), `never_drop` + severity ranking, mitigations, excluded-conditional record, provenance.
- **Missing:** free-text-driven surfacing (user types "nut allergy" → allergy line); threshold-driven risks beyond venue/kids.
- **Keep:** **all of it.**
- **Rewrite:** only extract into its own module for clarity; logic stays.
- **Delete:** nothing.
- **MVP priority:** **P0** (done); free-text surfacing is **P1** and overlaps with Communication personalization.

### 12. Execution Engine
- **Files:** partial — `engine.ts` produces `section_b` timeline + checklists; no scheduler.
- **Status:** `PARTIAL`.
- **Matches spec:** phased timeline + prep/day-of/after checklists with stable task IDs.
- **Missing:** date-anchored scheduling, task owners (from Staffing), dependencies, reminder cadence **inside OPE**. (A platform-level participant-reminder cron exists but is separate and day-granularity.)
- **Keep:** the timeline/checklist generation + task IDs.
- **Rewrite:** n/a now; **new build** once `date` is captured and save/calendar arrives.
- **Delete:** nothing.
- **MVP priority:** **P2** (needed when plans are saved/scheduled, not for read-only generation).

### 13. Monitoring Engine
- **Files:** none. (`HistoricalPriceRecord` shape defined in `types.ts:203` as the future write target.)
- **Status:** `PLANNED` (absent).
- **Matches spec:** the historical record contract + provider slot are pre-wired (good).
- **Missing:** the entire engine (deviation detection, re-plan, actuals feedback).
- **Keep:** the `HistoricalPriceRecord` shape + `HistoricalPricingProvider` stub.
- **Rewrite:** n/a (new build).
- **Delete:** nothing.
- **MVP priority:** **P3** (post-MVP; closes the learning loop).

### 14. Output Artifacts
- **Files:** `engine.ts buildOutput` + `types.ts PlannerOutput`; rendered by `components/planner/PlanResult.tsx`.
- **Status:** `IMPLEMENTED (core 6)` / `PLANNED (derived)`.
- **Matches spec:** the 6-section `ACTIVITY_PLANNER_OUTPUTS_V1` object with provenance (`modules_used`, `source_module`, `pricing_source`).
- **Missing:** derived artifacts — standalone `resource_plan`, `vendor_needs`, `staffing_plan`, `execution_plan`, and the **`request_brief`** marketplace-handoff contract (section F is text only, no structured brief).
- **Keep:** the Plan Object + format + provenance.
- **Rewrite:** nothing in the core object.
- **Delete:** nothing.
- **MVP priority:** **P0** (6 sections done); **`request_brief`** is **P1** (the strategic handoff to Marketplace).

---

## Cross-cutting: scripts duplication

- **Files:** `scripts/{compose-ope-samples,build-ope-output,calculate-ope-budget,ai-layer-ope}.mjs` are now **fully ported** into `lib/ope` — they are **duplicate logic** and a drift risk.
  `scripts/personalize-ope.mjs` contains personalization **not yet ported** (useful reference).
  `scripts/validate-ope-composer.mjs` is a validation harness.
- **Decision:** **archive/deprecate** the 4 fully-ported scripts (or delete after confirming nothing imports them); **keep** `personalize-ope.mjs` (reference for the Communication P1 work) and `validate-ope-composer.mjs` (tests). Conservative: move to `scripts/legacy/` with a note rather than hard-delete now.

---

## What to delete (whole list — deliberately short)

- **Nothing in `lib/ope/*`.** No dead code; the implementation is small and sound.
- **Candidate only:** the 4 duplicated CLI scripts (after confirming no references). Not urgent, not in `lib/`.
- **Flag, don't delete:** the `networking` category while unpriced — keep the module, but either seed pricing or relabel its budget state honestly.

---

## MVP priority roll-up

| Priority | Items |
|---|---|
| **P0 (keep, done)** | Assembly, Risk, Budget math + Pricing chain, 6-section Output, Scenario contract |
| **P1 (do next)** | Classification route/size guard; Communication personalization (+ free-text risk surfacing); Budget **data + currency**; `request_brief` handoff; intake `date`/venue breadth |
| **P2** | Data-driven Resource derivation; Execution scheduler (date-anchored) |
| **P3 (post-MVP)** | Vendor Engine + Vendor Network; Staffing role model + Crew Network; Monitoring + learning |

---

## Final recommendation: **C) Hybrid — refactor existing into OPE, then extend**

**Decision: C (hybrid), weighted ~70% refactor (A) / ~30% net-new build, 0% rewrite-from-scratch (B).**

**Why not B (rewrite from scratch):** the deterministic core — module composer, cost engine, the
PricingProvider chain, the risk model, the 6-section output, the typed contracts — is correct, tested
against four scenario/location cases, and **directly matches the spec's intent** (modules+rules, not a
scenario library). Rewriting would discard working, safe code to re-derive the same math. Not justified.

**Why not pure A (just refactor):** refactoring alone cannot satisfy the spec — **Vendor, Staffing
(full), Execution (scheduler), Monitoring, the Classification route decision, and the `request_brief`**
do not exist. These are genuinely new engines, not reshapes of existing functions.

**The hybrid, in order:**
1. **Refactor for boundaries (no logic change):** split `engine.ts` into `assembly` / `resources` /
   `communication` / `output` modules so each spec engine has a home and new engines can plug in.
   Extract a real `classify()` step out of `index.ts`/`data.ts`.
2. **Extend the existing engines (P1):** Classification route/size guard; Communication personalization
   + free-text risk surfacing; Budget real pricing + currency; emit a structured `request_brief`.
3. **Build the net-new engines later (P2–P3):** Execution scheduler, then Vendor/Staffing (gated on
   Vendor/Crew Networks), then Monitoring/learning (the `HistoricalPriceRecord` slot is ready).

**Conservative guardrail:** keep the current pipeline running throughout; refactor behind the same
`generatePlan()` entry point and the same `ACTIVITY_PLANNER_OUTPUTS_V1` contract so the live Planner
never regresses while OPE grows into the spec.

---

_Analysis only. No code written, nothing changed. File/line references reflect `lib/ope/*` and related
planner code as of the date above._

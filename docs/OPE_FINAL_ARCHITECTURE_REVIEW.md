# OPE Final Architecture Review

> **Purpose:** review the entire OPE document set + the live implementation for contradictions, missing
> links, duplicate concepts, unresolved decisions, and implementation blockers — and decide whether the
> architecture is ready to build.
> **Reviewed (this design arc):** `OPE_MASTER_SPEC`, `OPE_GAP_ANALYSIS`, `OPE_STRESS_TEST`, `ADR_001`,
> `ADR_002`, `OPE_ACTIVITY_TAXONOMY`, `OPE_PATTERN_LIBRARY`, `OPE_PATTERN_VALIDATION`,
> `OPE_CLARIFICATION_ENGINE`, `OPE_KNOWLEDGE_MODEL`, `OPE_KNOWLEDGE_FOOD_SAFETY_LOGISTICS_V1`,
> `OPE_PLANNING_WORKFLOW`.
> **Also weighed:** the pre-existing `MASTER_PRODUCT_DECISIONS`, `OPE_V1_TECHNICAL_DESIGN`,
> `ACTIVITY_PLANNER_*`, and the **built code** (`lib/ope/*`) + **data** (`data/ope/*`).
> **Date:** 2026-06-10. **Stance:** brutally honest.

---

## 1. Architecture consistency score

**Overall: 82 / 100 — internally coherent, but with a few unreconciled seams against prior decisions
and the live code.**

| Axis | Score | Note |
|---|---|---|
| **Internal** (new OPE docs to each other) | **91** | Built in sequence with explicit cross-refs; one threshold mismatch, otherwise tight. |
| **vs Master Product Decisions** | **74** | Wedding-as-KB-template, "proposal" as primary outcome, and output-schema naming (P9/P10) are unreconciled. |
| **vs live implementation** | **70** | "Module" (code) vs "Block" (knowledge model); 3 categories vs 10 patterns; most of the workflow is design-only. |

The design is strong and unusually consistent *with itself*. The risk is not internal contradiction —
it is the **seam between the new pattern/knowledge model and (a) the older product decisions and (b) what
is actually coded.**

---

## 2. Findings

### A. Contradictions
1. **Wedding-as-template vs birthday-first.** `MASTER_PRODUCT_DECISIONS` §11.6 says the KB is "authored
   once per category (**Wedding is the template**)." The taxonomy/pattern/knowledge docs make **Celebration
   (kids birthday/BBQ)** the Phase-1 anchor and route **wedding to Organizer-Only / Phase 2**. These
   disagree on which activity anchors the knowledge base. *(Severity: medium.)*
2. **OPE primary outcome: consumer plan vs client proposal.** `MASTER` §10.3 ("OPE Primary Outcome —
   **Client Proposal Generator** ✅ Decided") vs the new docs, which treat the **consumer 6-section plan
   (OUTPUTS_V1)** as the primary output and barely specify the professional/proposal layer. *(Medium.)*
3. **Confidence band vs `plan_ready` threshold.** `OPE_CLARIFICATION_ENGINE` defines **Medium = 0.40–0.74
   → "clarification mode,"** yet networking-with-budget is `plan_ready` at **confidence 0.55** (ADR-002).
   A plan is shipped inside the "should clarify" band. *(Severity: low — needs one threshold rule.)*

### B. Missing links
4. **Pattern ↔ marketplace category ↔ code category are unmapped.** Three category systems coexist with no
   crosswalk: **21 emotional categories** (`lib/categories.ts`), **~75 taxonomy types** (6 domains), **10
   patterns**, and the **3 coded `PlannerCategory`s** (birthday/bbq/networking). Nothing defines how a
   marketplace category or a free-text request maps to a pattern. *(High — blocks the classifier.)*
5. **"Block" (knowledge) ↔ "module" (code) is undefined.** `OPE_KNOWLEDGE_MODEL` factors knowledge into
   cross-pattern **blocks** (Food, Venue, Safety…). The code authors per-category **modules**
   (`data/ope/modules/<category>/*`) bundling phases/tasks/cost-drivers/risks. No doc says how blocks
   become/replace modules. *(High — blocks the knowledge build.)*
6. **Professional/proposal output layer is underspecified.** `request_brief` and "client proposal" are
   named but never given a structure, while §10.3 calls the proposal the primary outcome. *(Medium.)*
7. **Region & currency for Phase 1 are unstated.** Pricing exists only for **Honolulu**; budgets render in
   **seed currency (USD)** regardless of location (flagged in `OPE_STRESS_TEST`/`OPE_GAP_ANALYSIS`). No doc
   *decides* the launch region(s) or the currency behavior. *(High for any non-US user.)*

### C. Duplicate / competing concepts
8. **Module vs Block** (same as #5, viewed as duplication) — two names for "the unit of authored
   knowledge," with different granularity. Must converge on one.
9. **Three taxonomies** (#4) — emotional categories, activity types, patterns — overlapping vocabularies
   for "kinds of activity." Patterns should be the spine; the others map onto it.
10. **Output-artifact names** — "Activity Planner output (OUTPUTS_V1)", "plan object", "client proposal",
    "request_brief" all denote OPE's output in different docs. `MASTER` §11.9 already flags this as **P9
    (proposal naming) / P10 (canonical output schema) — deferred.**

### D. Unresolved decisions
11. **P9/P10 (deferred in `MASTER` §11.9):** OPE artifact/"proposal" naming standard and the **canonical
    output schema.** OUTPUTS_V1 is the de-facto schema but was never ratified against the proposal layer.
12. **Knowledge unit = module or block** (#5/#8).
13. **Phase-1 boundary.** Docs variously imply Phase 1 = single-event Big-Four start (1a) **or** the whole
    1a–1d arc (incl. Recurring + Community modifiers). "MVP" is not pinned.
14. **Coverage-gate thresholds (60 guests / $5000 / 30 kids)** are admitted in ADR-002 to be
    **uncalibrated guesses.**
15. **Knowledge values need organizer sign-off** — `OPE_KNOWLEDGE_FOOD_SAFETY_LOGISTICS_V1` is explicitly
    a **v1 draft** (supervision ratios, food temps) pending professional review.

### E. Implementation blockers
- **B1 (hard):** decide **module vs block** before authoring any more knowledge — otherwise new content is
  built on a foundation that may be re-cut. (#5/#8/#12)
- **B2 (hard):** define the **pattern ↔ category mapping**, or the classifier/gate cannot route real
  requests into patterns. (#4)
- **B3 (hard):** decide **launch region(s) + currency behavior**, or budgets are wrong-currency/fallback
  for most users. (#7)
- **B4 (medium):** ratify the **canonical output schema** (P10) and whether the proposal layer extends
  OUTPUTS_V1 or is separate. (#2/#6/#10/#11)
- **B5 (medium):** decide whether **Recurring + Community modifiers** are in the MVP or deferred — they are
  validated as "the real Phase-1 dependency" yet unbuilt and currently *refused* by the gate. (#13)
- **B6 (soft):** **organizer review** of the v1 safety/supervision/food knowledge before it ships. (#15)

**What is NOT a blocker (already built & safe):** the named-engine refactor (ADR-001), the coverage gate
(ADR-002), and the deterministic pipeline for the 3 supported categories all exist, pass tests, and refuse
unsupported input honestly. The gaps are about *growing* OPE, not about a broken core.

---

## 3. Remaining open questions

1. Is OPE's **primary output** the consumer plan, the client proposal, or one schema serving both? (P9/P10)
2. Is the unit of knowledge a **reusable block** or a **per-category module**?
3. How do **21 categories / 75 types / 10 patterns / 3 coded categories** map to each other?
4. What is the **launch region** (Honolulu only?) and how is **currency** handled off-region?
5. Does **MVP** = single-event Big-Four (1a) or include **Recurring + Community** (1b–1c)?
6. Is **Wedding** still the KB template (Master §11.6), or is **Celebration** the anchor (new docs)?
7. Who **signs off** the v1 safety/supervision/food knowledge, and against what reference?
8. Are the **gate thresholds** calibrated before or after first real usage?

---

## 4. Required fixes before coding

In priority order — these are **decisions/specs**, mostly small, not large builds:

1. **Pick the knowledge unit (B1).** Recommend: **blocks are the authoring model; the current per-category
   JSON is a first, un-factored block bundle.** Write a one-page "module→block" reconciliation so new
   knowledge is authored as blocks.
2. **Write the pattern↔category crosswalk (B2).** One table: each marketplace category / taxonomy type →
   its primary pattern + modifiers. Make **patterns the spine**; categories are content labels.
3. **Decide region + currency (B3).** Name the launch region(s); decide that budgets render in the seed
   region's currency **with an explicit "estimated in <currency>, may differ locally" note** until local
   pricing exists. (Removes the silent wrong-currency contradiction.)
4. **Ratify the output schema (B4 / P9 / P10).** Declare OUTPUTS_V1 canonical for the consumer plan and
   state how the proposal layer relates (extends vs separate). Close P9/P10 in `MASTER`.
5. **Pin the MVP boundary (B5).** Decide explicitly whether Recurring + Community ship in the first build
   or are deferred (the gate already refuses them safely either way).
6. **Reconcile the Wedding-template contradiction (#1).** Amend `MASTER` §11.6 to "Celebration is the
   Phase-1 template; Wedding is the eventual high-complexity template."
7. **Normalize the confidence threshold (#3).** State one rule: `plan_ready` iff overall confidence ≥ X
   **and** no open critical (Risk/Legal) dimension — and align the band labels to it.
8. **Schedule organizer sign-off (B6)** of the v1 safety/supervision/food values.

---

## 5. Recommended MVP scope

**MVP = "Phase 1a, hardened," built on the existing engine — no new architecture required.**

- **Patterns:** **Celebration** + **Meetup** (one-time), the two shapes closest to what's already coded.
- **Categories live:** kids birthday, BBQ/family picnic, simple networking-with-budget *(today's set)* +
  the easy Celebration neighbors (adult/milestone birthday, anniversary, baby shower, graduation,
  housewarming, dinner party, family reunion) as **content on the Celebration pattern**.
- **Knowledge:** the **six universal blocks + Food + Equipment + Decor + the v1 safety/supervision/logistics
  values** — authored as blocks, organizer-reviewed.
- **Pricing:** **one launch region** priced for the Celebration/Meetup line items; everywhere else =
  fallback **with the currency note**.
- **Gate + clarification:** keep ADR-002; add the **lightweight clarification loop** for the few
  high-value questions (venue, count, kids, budget).
- **Output:** OUTPUTS_V1 (ratified). **Manual budget correction = current-plan-only** (no learning yet).

**Explicitly deferred from MVP** (gate handles via honest handoff): Recurring + Community modifiers,
Class as a series, Tournament/Conference/Performance/Fundraiser/Expedition, Vendor/Staffing/Money/
Monitoring engines, correction-promotion + learning, the proposal/professional layer.

This MVP needs **zero unbuilt engines** — it is the current pipeline + authored Celebration/Meetup
knowledge + one region's pricing. Everything else is post-MVP.

---

## 6. Final verdict

### NOT READY FOR IMPLEMENTATION — *of the pattern/knowledge layer* — pending the §4 fixes.
### READY FOR IMPLEMENTATION — *of the recommended MVP (§5)* — once fixes 1–3 and 7 are made.

**Reasoning, honestly:**
- The **architecture is sound and validated** — the doc set is coherent, the coverage problem is solved
  (gate), and the engine core is already built and safe.
- But **coding the knowledge/pattern layer now would hard-code two unresolved decisions** — *module vs
  block* (B1) and *pattern↔category mapping* (B2) — plus ship **wrong-currency budgets** (B3). Those are
  cheap to decide and expensive to retrofit. Deciding them is a few hours; skipping them is a rewrite.
- Therefore: **make fixes 1, 2, 3, and 7** (knowledge unit, crosswalk, region/currency, confidence rule),
  get **organizer sign-off** on the v1 safety values, and the **MVP in §5 is ready to build immediately**
  on the existing engine. The remaining open questions (proposal layer, Recurring/Community, thresholds,
  Wedding-template) can be resolved *after* MVP without blocking it.

**One-line verdict:** the **core is ready and the design is trustworthy; the *next build* is not ready
until ~4 small decisions are written down.** Make them, ship the Celebration/Meetup MVP, and let real
outcomes start calibrating the rest.

_Review only. No code changed, nothing committed._

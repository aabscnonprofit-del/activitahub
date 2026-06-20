# OPE — Master Specification (v1, draft)

> **Document type:** product-level architecture specification.
> **Subject:** the Organizer Planning Engine (OPE) — the **core engine** of ActivLife Hub.
> **Scope:** engine architecture only. **No UX, no pages, no UI flows, no API/route shapes.**
> **Premise:** OPE is the platform's core. Academy, Certification, Marketplace, Crew Network and
> Vendor Network exist to **feed, qualify, source for, or consume the output of** OPE.
> **Method:** consolidates the existing implementation (`lib/ope/*`) and the concept docs
> (`OPE_V1_TECHNICAL_DESIGN`, `OPE_CORE_MVP_V1`, `ACTIVITY_PLANNER_MVP_V1`,
> `ACTIVITY_PLANNER_OUTPUTS_V1`). Status markers reflect what is real today.
> **Date:** 2026-06-10.

**Status legend (per block):**
`IMPLEMENTED` — exists and runs in `lib/ope`. `PARTIAL` — exists but incomplete vs this spec.
`PLANNED` — specified here, not built. Status is also consolidated in §15–§16.

---

## 1. Goals of OPE

1. **Do the organizer's planning work via the engine, not via a human.** Take a user's request to
   organize an activity and produce the complete planning artifacts an organizer would otherwise
   assemble by hand: plan, timeline, resources, budget, staffing, vendor needs, communications,
   risk/safety register, and an executable schedule.
2. **Assemble Event Plans dynamically from a small base of modules and rules** — explicitly **not** a
   library of thousands of pre-written Event Plans. Breadth comes from composition, not enumeration.
3. **Be one engine, two surfaces** (Single Engine Strategy). The same engine serves the consumer
   Planner and the Organizer Platform; surfaces differ by gating and depth, not by engine.
4. **Stay safe, deterministic, and auditable.** Structure and safety come from curated knowledge and
   deterministic math; AI is a bounded layer that personalizes, never invents facts, math, or safety.
5. **Be location-aware and degrade gracefully.** Pricing, vendors and staffing resolve by the user's
   location; when data is missing, the engine still produces a usable plan with explicit notes.
6. **Produce a clean handoff.** OPE output is structured so it can become an Event Request brief
   (`request_brief`), an organizer's working plan, or a consumer's self-run checklist — from the same object.

---

## 2. Core Principles

- **Modules + rules, not Event-Plan enumeration.** Knowledge is stored as small, composable **modules**
  (per category / per subtype) and **rules** (derivation, applicability, thresholds). An Event Plan is
  **assembled at runtime**, never looked up whole.
- **Curated backbone, bounded AI.** Plan skeletons, resource scaling, cost-driver definitions, risk
  rules and reminder cadence are **curated/deterministic**. AI handles summary, personalization and
  natural-language communication **on top of** the curated structure.
- **Frozen-field guard.** Facts (date, location, prices, counts, organizer, named constraints) are
  immutable across every generative step. Generated text may rephrase, never alter, a fact.
- **Determinism where it matters.** Quantities and budget are pure functions of inputs + rules — the
  same input yields the same numbers. AI never computes money or safety items.
- **Traceability.** Every output element carries provenance (which module / rule / pricing source /
  risk rule produced it), so any line can be explained and audited.
- **Graceful degradation.** Missing pricing → unpriced budget with note; missing AI → template
  fallback; missing vendor/staff data → need expressed as a structured gap, not a failure.
- **Separation of knowledge and logic.** Adding a category = authoring a module, not changing engine
  code. Engines operate on the module contract, not on category-specific branches.
- **Single source of truth for cost.** Consumer budget range and an organizer's later quote derive
  from the **same** cost engine, so handoffs never contradict themselves.

---

## 3. Inputs — Scenario Intake `IMPLEMENTED (subset)`

The typed request that drives the whole pipeline. One contract, consumer- or organizer-sourced.

> **Terminology note (aligns with MASTER glossary):** the **"Scenario" object** named in this
> section is the **input/request contract**, *not* the canonical pre-planning object. Per
> MASTER, OPE must first obtain or create an approved **"what should happen"** (what happens +
> what people experience; not timeline/resources) before planning. The input object here is
> not "what should happen", and "Scenario" is not yet adopted as the name for it.

- **Purpose:** normalize a user's organize-an-activity request into a structured **Scenario** object
  the engines consume.
- **Inputs (fields):**
  - `intent` — what the user wants to organize (raw category and/or free description).
  - `guest_count` + optional `breakdown` (adults / kids), `age_group`.
  - `date` *(optional)* and duration/time window.
  - `venue_type` (home · outdoor · venue/indoor · not sure).
  - `location` (city, state/region, country, postal) — drives pricing, vendors, staffing, local notes.
  - `budget` *(optional target)*.
  - `vibe / must-haves` and `special_requirements / constraints` (allergies, accessibility, kids,
    theme, dietary, language).
  - `context`: surface (consumer Planner vs Organizer Platform), user role, language.
- **Outputs:** a validated **Scenario** object (today: `PlannerInput → Scenario`, `lib/ope/index.ts`,
  validated in `lib/actions/planner.ts`).
- **Dependencies:** none upstream; it is the entry contract. All engines depend on it.
- **Place in process:** **Stage 0** — produced before classification; flows into every engine.
- **Status:** `IMPLEMENTED` for category/guests/venue/location/budget/requirements.
  `PARTIAL`: no `date`, `vibe` merged into `special_requirements`, limited `venue_type` set.

---

## 4. Activity Classification Engine `PARTIAL`

- **Purpose:** classify the request — assign a **category** (metadata / classification label) + subtypes,
  estimate **scale** and **complexity**, and make the **route decision**: self-runnable vs organizer-grade
  (route to the **Event Request channel**), and which module set applies. Category **labels and helps
  select knowledge; it does not determine the Event Plan by itself** — the request's needs drive module
  selection.
- **Inputs:** Scenario (`intent`, `guest_count`, `venue_type`, `special_requirements`).
- **Outputs:** `classification { category, subtypes[], scale_tier, complexity_tier, route_decision,
  module_selector }` — where `route_decision ∈ {self_serve, recommend_organizer}` and `module_selector`
  is the key set the Assembly Engine resolves.
- **Dependencies:** module registry (to know which categories/subtypes exist); threshold rules.
- **Place in process:** **Stage 1** — first engine after intake; gates whether OPE produces a DIY plan
  or a routed recommendation, and tells Assembly which modules to pull.
- **Status:** `PARTIAL`. Today category is taken directly from input and birthday→young-kids subtype is
  derived from `kids>0` (`data.ts` `getModulesFor`). **Missing:** complexity/scale tiering and the
  organizer-grade route decision (the engine currently accepts events of any size).

---

## 5. Event Plan Assembly Engine `IMPLEMENTED`

- **Purpose:** the heart of "dynamic assembly" — merge the selected **modules** into a single
  coherent Event Plan skeleton: phases, tasks, milestones, communication stubs, cost-driver definitions,
  risk definitions, and derived-quantity rules. De-duplicate and order them.
- **Inputs:** Scenario + `module_selector` (from Classification); the resolved module set.
- **Outputs:** a **Composed** object: ordered `phases`, merged `tasks`, `risks`, `communication
  templates`, `cost_drivers`, `derived_quantity` keys, merged `config_defaults`, and a grouped
  `timeline` (preparation / day-of / after).
- **Dependencies:** module contract (`phases/tasks/cost_drivers/risks/communication_templates/
  derived_quantities/config_defaults`); Classification output.
- **Place in process:** **Stage 2** — consumes classification, produces the skeleton every downstream
  engine (Resource, Budget, Risk, Communication, Execution) reads.
- **Status:** `IMPLEMENTED` (`engine.ts` `compose()`): module merge, phase de-dup, timeline grouping,
  config-default merge, derived-key collection.

---

## 6. Resource Planning Engine `IMPLEMENTED (counts)`

- **Purpose:** size **what is needed** to the scenario — translate cost-driver/derived-quantity rules
  into concrete quantities (meals, cake servings, tableware, supervising adults, favors, game count,
  etc.), applying buffers (food/tableware) and per-guest / per-kid / flat scaling.
- **Inputs:** Composed skeleton (`derived_quantities`, `cost_drivers`, `config_defaults`) + Scenario
  counts (`guest_count`, `kid_count`).
- **Outputs:** `resource_plan` — a map of `{ resource_key → quantity, basis, driver }`, sized and
  buffered; the quantity backbone consumed by Vendor and Staffing (resource needs) and, once the
  resource set is complete, by the Cost Estimate.
- **Dependencies:** Assembly (rules + config); Scenario counts.
- **Place in process:** **Stage 3** — after assembly; its quantities feed Vendor and Staffing needs,
  which together with the resources form the **complete resource set the Cost Estimate is calculated from**.
- **Status:** `IMPLEMENTED` for counts (`engine.ts` `computeQuantity` + `QtyCtx`). **Note:** a
  standalone customer-facing "what you'll need" resource list is not emitted separately today
  (resources surface via budget line items per `ACTIVITY_PLANNER_OUTPUTS_V1`).

---

## 7. Budget Engine `IMPLEMENTED (Honolulu seed)`

- **Purpose:** turn the resource plan into a **low / likely / high** cost estimate with contingency and
  a ranked list of key cost drivers, **priced by the user's location**.
- **Inputs:** Scenario `location` + `category`; the **complete resource set** — resource quantities
  **plus vendor needs and staffing needs** — and cost-driver definitions.
- **Outputs:** `BudgetResult { is_priced, currency, estimate{low,likely,high}, breakdown[ {item_key,
  line{low,likely,high}, basis, cost_category} ], key_cost_drivers[], pricing_source, is_fallback,
  fallback_note, levers_note }`. Line-item `item_key`s are preserved for later correction.
- **Dependencies:** **PricingProvider chain** (Resolver): `local → ActivLife historical → external →
  fallback-seed`. Resource Planning (quantities). Each provider may return null; chain resolves the
  first hit, else unpriced with a note.
- **Place in process:** **after the complete resource set is determined** (Resource Planning + Vendor +
  Staffing needs) — the **Cost Estimate** is calculated from that full set; its numbers feed Output and
  the Communication levers note.
- **Status:** `IMPLEMENTED` (`budget.ts`, `pricing.ts`). **Real pricing exists only for Honolulu
  (birthday, bbq)**; other locations resolve via fallback-seed in seed currency; historical/external
  providers are stubs (`→ null`); networking has no seed (always unpriced). Multi-currency calibration
  is `PLANNED`.

---

## 8. Vendor Engine `PLANNED`

- **Purpose:** map resource/service needs to **vendor categories** (venue, catering, cake/food/drinks,
  entertainers, equipment, transportation, permits/parking) and, where applicable, source/match
  vendors and fold their pricing back into the Budget Engine. The runtime bridge from OPE to the
  **Vendor Network**.
- **Inputs:** resource plan + cost categories; Scenario `location`; vendor availability data (from
  Vendor Network).
- **Outputs:** `vendor_needs[ { category, spec, quantity, derived_from } ]`; when matching is enabled,
  `vendor_options[]` with location-resolved prices that can supersede seed prices in Budget.
- **Dependencies:** Resource Planning (needs), Budget Engine (price feedback loop), Vendor Network
  (catalog/availability), location.
- **Place in process:** **before the Cost Estimate** — vendor needs are part of the resource set; once
  real vendor prices are available they refine the Cost Estimate; emits vendor needs for the output brief.
- **Status:** `PLANNED`. Cost categories exist in module data, but no vendor matching/sourcing is
  implemented; Vendor Network is not built.

---

## 9. Staffing Engine `PARTIAL`

- **Purpose:** compute **who is needed to run the event** — supervising adults, helpers, roles
  (greeter, grill, check-in, translators) sized to the scenario — and, where applicable, match
  crew from the **Crew Network**. The runtime bridge from OPE to Crew Network.
- **Inputs:** resource plan + scenario counts (`kid_count`, `guest_count`), config (`kids_per_adult`),
  risk-driven staffing (e.g., supervision); location.
- **Outputs:** `staffing_plan[ { role, count, basis, derived_from } ]`; when matching is enabled,
  `crew_options[]`.
- **Dependencies:** Resource Planning, Risk Engine (safety-driven staffing), Crew Network (future),
  location.
- **Place in process:** **before the Cost Estimate** (parallel to Vendor) — staffing needs are resources;
  consumes quantities and risk rules; feeds the Cost Estimate, Execution (task owners) and the output brief.
- **Status:** `PARTIAL`. `supervising_adults` is derived today (`computeQuantity`), but there is no
  role model, no crew matching, and no Crew Network.

---

## 10. Communication Engine `PARTIAL`

- **Purpose:** generate the event's **messages** (invitation, reminder, thank-you, feedback) and
  stakeholder communications, filled with the scenario's specifics under the frozen-field guard.
- **Inputs:** communication template stubs (from Assembly), Scenario specifics (`date`, `location`,
  host/honoree, dietary/allergy asks, theme), Budget levers (for value framing where relevant).
- **Outputs:** `section_e_ready_messages` — per-slot `{ template_id, variables, text }`, plus the
  budget `levers_note` and plan `summary`/`headline` (the engine's natural-language layer).
- **Dependencies:** Assembly (template stubs), Scenario, AI layer (deterministic templating today;
  LLM-behind-guard future).
- **Place in process:** **Stage 6** — after Budget (so it can reference cost levers); part of the AI
  layer applied to the assembled output.
- **Status:** `PARTIAL` (`engine.ts` `genMessages/genSummary/genLeversNote/genHeadline`). Messages are
  token-skeletons; they do **not** yet inject real specifics (allergy/theme) into the body. Headline
  extracts theme; deeper personalization of checklists/messages is `PLANNED`.

---

## 11. Risk Engine `IMPLEMENTED`

- **Purpose:** evaluate **risk/safety rules** against the scenario — apply `always` and conditional
  (`outdoor`, `drop_off_children`, etc.) risks, rank by `never_drop` + severity, attach mitigations,
  and surface safety milestones. Safety items are curated, never AI-invented.
- **Inputs:** risk definitions (from Assembly), Scenario (`venue_type`, `age_group`,
  `special_requirements`), thresholds/config.
- **Outputs:** `section_d_key_risks { risks[ {id, name, severity, never_drop, mitigation,
  source_module} ], excluded_conditional[] }`; safety-driven inputs to Staffing/Execution.
- **Dependencies:** Assembly (risk defs), Scenario, threshold rules.
- **Place in process:** **Stage 7** — after assembly; informs Staffing (supervision) and Execution
  (safety milestones), and is emitted in the output.
- **Status:** `IMPLEMENTED` (`engine.ts` `riskApplies` + severity/never-drop sort). **Note:**
  free-text-driven risk surfacing (user types "nut allergy" → allergy line) is `PLANNED`; today the
  module's always-on risks cover the common cases.

---

## 12. Execution Engine `PARTIAL`

- **Purpose:** turn the static plan into an **executable schedule** — phased tasks with windows,
  owners (from Staffing), dependencies, milestones, and reminder cadence — the artifact an organizer
  or consumer actually runs against.
- **Inputs:** Composed timeline (phases/tasks), Staffing roles, Risk milestones, `date` (to anchor
  absolute timings), reminder cadence rules.
- **Outputs:** `execution_plan { milestones[], scheduled_tasks[ {task, window/date, owner,
  depends_on} ], reminder_schedule[] }`.
- **Dependencies:** Assembly (timeline), Staffing (owners), Risk (safety milestones), Scenario `date`.
- **Place in process:** **Stage 8** — after the plan is priced and risk-assessed; produces the runnable
  layer and feeds Monitoring.
- **Status:** `PARTIAL`. The composed **timeline + checklists** exist (`section_b_your_plan`), but
  there is no date-anchored scheduling, no task owners/dependencies, and no reminder schedule **inside
  OPE** (a separate participant-reminder cron exists at platform level, day-granularity). Full
  Execution is `PLANNED`.

---

## 13. Monitoring Engine `PLANNED`

- **Purpose:** track an event's execution state over time, detect **deviations** (slipped milestones,
  changed headcount, missing confirmations), and trigger **re-plan / re-estimate / alerts**. The
  feedback loop that also captures actuals for ActivLife historical pricing/learning.
- **Inputs:** the execution plan + live signals (RSVP/attendance changes, completed tasks, actual
  costs, date changes).
- **Outputs:** `monitoring_state { status, deviations[], recommended_actions[] }`; **actuals** written
  back to the historical store (`HistoricalPriceRecord` shape) to improve future Budget/Resource
  outputs.
- **Dependencies:** Execution Engine (the plan to monitor), Budget Engine (re-estimate), the historical
  pricing store, platform signals (participants/bookings).
- **Place in process:** **Stage 9** — runs continuously after Execution; closes the loop back into
  Budget (historical provider) and Resource (corrections).
- **Status:** `PLANNED`. The `HistoricalPriceRecord` DB-ready shape and the historical provider slot
  exist; no monitoring/learning logic is implemented.

---

## 14. Output Artifacts `IMPLEMENTED (core 6 sections)`

OPE emits one structured **Plan Object** from which all artifacts derive. Canonical format:
`ACTIVITY_PLANNER_OUTPUTS_V1` (`_meta.format`).

- **Plan Object (sections):**
  - `A` what-you-told-us (scenario echo) `IMPLEMENTED`
  - `B` plan: summary, headline, timeline, prep/day-of/after checklists `IMPLEMENTED`
  - `C` budget: estimate, breakdown, key cost drivers, levers, pricing source/fallback `IMPLEMENTED`
  - `D` risk register: applicable risks + mitigations `IMPLEMENTED`
  - `E` ready-to-send messages `PARTIAL`
  - `F` upgrade / handoff path `PARTIAL` (text only)
- **Derived artifacts (from the same object):**
  - `resource_plan`, `budget_breakdown` `IMPLEMENTED (counts/price)`
  - `vendor_needs`, `staffing_plan` `PLANNED / PARTIAL`
  - `execution_plan` (runnable schedule) `PLANNED`
  - **`request_brief`** — the Event Request handoff contract (plan + scenario → Event Request) `PLANNED`
  - `monitoring_state` + historical actuals `PLANNED`
- **Cross-cutting:** every artifact carries provenance (`modules_used`, `source_module`,
  `pricing_source`) for traceability.
- **Dependencies:** all engines feed it; it is the engine's external contract.
- **Place in process:** **terminal** — assembled after the engines run; consumed by the consumer
  surface, the organizer surface, and (via `request_brief`) the **Event Request channel**.

---

## 15. MVP Scope (what OPE is today)

The minimal engine slice that produces credible, safe, useful plans:

- **Intake → Classification (direct) → Assembly → Resource (counts) → Budget (seed/fallback) → Risk →
  AI layer (summary/levers/messages/headline/upgrade) → Output (6 sections).**
- **Modules:** birthday (+ young-kids subtype), bbq, networking. **Pricing:** Honolulu seed (birthday,
  bbq) + fallback chain; networking unpriced.
- **Deterministic backbone + bounded deterministic AI** (no LLM). Frozen-field guard active.
- **Single object output** in `ACTIVITY_PLANNER_OUTPUTS_V1`, location-aware with explicit fallback
  notes; line-item IDs preserved for future correction.

**In MVP, not yet meeting full spec:** Classification route/complexity tiering, Vendor Engine,
Staffing role model + crew matching, date-anchored Execution, Monitoring/learning, the marketplace
`request_brief`, real local/historical pricing, multi-currency calibration, free-text personalization.

---

## 16. Future Scope (the full engine)

- **Classification:** scale/complexity tiering + organizer-grade routing (boundary as the conversion
  trigger to the Event Request channel).
- **Budget:** real local + ActivLife historical + external providers; multi-currency, city-calibrated
  ranges; user budget correction persisted and learned.
- **Vendor Engine + Vendor Network:** need → category → match → price feedback into Budget.
- **Staffing Engine + Crew Network:** role model → crew matching → owners in Execution.
- **Communication:** LLM-behind-guard personalization; specifics (allergy/theme/accessibility) injected
  into checklists, risks and messages.
- **Risk:** free-text and threshold-driven risk surfacing; safety competency tie-in (Academy/Certification).
- **Execution:** date-anchored schedules, task owners/dependencies, reminder cadence inside OPE.
- **Monitoring:** deviation detection, re-plan/re-estimate, actuals feedback to historical pricing.
- **Handoff:** `request_brief` contract so any Event Plan becomes an Event Request from the same
  object — closing the demand loop OPE sits at the top of.
- **Category breadth:** new categories via new **modules + rules** only (no engine changes, no Event Plan
  library), per the core principle.

---

## Appendix A — Canonical pipeline (text)

```
Stage -1 Concept Funnel ...... IDEA-FIRST primary entry (raw idea, AI-first w/ deterministic fallback): understand the dream → concept options → user selects a direction; bypassed for operationally-clear briefs. The public planner /plan-an-event is idea-first, NOT form-first. Contract: docs/OPE_CONCEPT_FUNNEL_V1.md. Additive — does not alter Stages 0–9.
Stage 0  Intake .............. Scenario object
Stage 1  Classification ...... category (metadata) + subtypes, scale, complexity, route, module_selector
Stage 2  Assembly ............ Event Plan skeleton: phases, tasks, risks, comms stubs, cost-drivers, derived keys, timeline
Stage 3  Resource Planning ... sized quantities (resource_plan)
Stage 4  Vendor ‖ Staffing ... vendor_needs / staffing_plan — resource needs (+ matching, future)
Stage 5  Cost Estimate ....... low/likely/high + breakdown from the complete resource set (Budget Engine; PricingProvider chain)
Stage 6  Communication ....... messages, summary, levers (AI layer, frozen-field guard)
Stage 7  Risk ................ applicable risks + mitigations + safety milestones
Stage 8  Execution ........... runnable schedule (milestones, owners, reminders)
Stage 9  Monitoring .......... deviations → re-plan/re-estimate; actuals → historical store
Terminal Output Artifacts .... Plan Object + derived artifacts + request_brief
```
(Stages 5–7 are not strictly serial: Vendor/Staffing/Communication/Risk read the same skeleton and the
budget; the order above reflects data dependencies, not a forced sequence.)

## Appendix B — Status matrix

| Engine | Status |
|---|---|
| 3 Intake | IMPLEMENTED (subset) |
| 4 Classification | PARTIAL |
| 5 Assembly | IMPLEMENTED |
| 6 Resource Planning | IMPLEMENTED (counts) |
| 7 Budget | IMPLEMENTED (Honolulu seed + fallback) |
| 8 Vendor | PLANNED |
| 9 Staffing | PARTIAL |
| 10 Communication | PARTIAL |
| 11 Risk | IMPLEMENTED |
| 12 Execution | PARTIAL |
| 13 Monitoring | PLANNED |
| 14 Output Artifacts | IMPLEMENTED (core 6) / PLANNED (derived) |

## Appendix C — Supporting systems (why they exist for OPE)

- **Academy / Certification** — qualify the humans who take over when Classification routes an event as
  organizer-grade, and define the safety competency the Risk Engine assumes.
- **Event Request channel** — consumes OPE's `request_brief`; OPE is the top of its demand funnel.
  (The **Marketplace** proper is the page of public Events.)
- **Vendor Network** — the data/sourcing backend the Vendor Engine resolves against.
- **Crew Network** — the data/sourcing backend the Staffing Engine resolves against.

---

_Architecture specification only. No UX, pages, API, or implementation. Engine contracts and status
reflect `lib/ope/*` and the OPE/Activity-Planner concept docs as of the date above._

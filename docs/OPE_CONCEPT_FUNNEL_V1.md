# OPE Concept Funnel V1 — Canonical Contract

> **Type:** implementation contract for a small OPE pre-stage. Not a redesign, not a new
> architecture set. It inserts one explicit stage **before** classification/planning and
> changes no existing OPE behaviour. As-built in `lib/ope/concept-funnel.ts` (pure stage)
> and `lib/ope/concept-plan.ts` (orchestrator). Date: 2026-06-18.

## 1. Why it exists

Users arrive with **dreams, themes, and under-specified ideas**, not technical briefs.
Before this stage, OPE took a raw request straight to classification — so *"an Antarctica-
themed birthday party for my children"* was classified as `birthday` and answered only with
operational questions (how many children? what budget? where?). The **meaning** of the idea
("Antarctica as penguins and ice" vs "as an explorer mission" vs "as wildlife discovery")
was never explored.

The Concept Funnel fills that gap: it turns a vague/imaginative/theme-based idea into a few
safe, plausible **concept options**, lets the user choose or refine a direction, and only
then hands off to the normal pipeline.

```
Raw idea → Concept Funnel → user selection/refinement → (existing) clarify → classify → plan
```

It explores **meaning and direction**. It is **not** the Clarification Engine and does not
replace it — clarification still runs afterward, inside `generatePlan`, and asks the
operational questions.

## 2. When it activates vs bypasses

- **Activates** (`concept_selection_needed`) when the request is vague, imaginative,
  theme-based, metaphorical, emotional, contradictory, strange, under-specified, or
  open-ended. Detection signals (deterministic): a detected theme (e.g. `…-themed`),
  imaginative/emotional language, or too few operational anchors.
- **Bypasses** (`bypass_concept_funnel`) when the request is already operationally clear —
  a real category plus enough concrete anchors (headcount / budget / venue / timing) and no
  theme or imaginative pull. Example: *"Plan a BBQ for 12 adults at Ala Moana Beach on
  Saturday from 2pm to 6pm with a $600 budget."*

Anchors are read with the **existing** deterministic parser (`extractFromText`); no new
parsing is introduced.

## 3. Output contract

```ts
interface ConceptOption {
  title: string
  interpretation: string
  mood: string
  suitable_for: string
  risks_or_safety_notes: string
  why_this_matches_request: string
}

type ConceptFunnelStatus = 'concept_selection_needed' | 'concept_selected' | 'bypass_concept_funnel'

interface ConceptFunnelResult {
  original_request: string
  detected_event_category: string | null
  concept_options: ConceptOption[]      // [] on bypass
  selected_concept: ConceptOption | null
  clarification_prompt: string          // '' on bypass
  status: ConceptFunnelStatus
}
```

- **Input:** the raw request string (+ an optional injectable `ConceptGenerator`).
- **Output:** `ConceptFunnelResult`.

## 4. How concepts are generated (V1)

Deterministic, layered like a real organizer (highest-specificity first):

1. **Explicit theme** (e.g. "Antarctica-themed") → four theme lenses: *Playful & Festive*,
   *Adventure & Mission*, *Discovery & Nature*, *Story & Characters* (penguins/ice,
   explorer/survival, wildlife/science, research-station story).
2. **Intent pattern** — a deterministic intent layer that recognises common high-value
   **dreams by intention** (not just a keyword) and returns the specific directions a real
   organizer would suggest: *proposal/engagement*, *luxury wellness / premium audience*,
   *elderly / retirement-home evening*, *feng-shui / coworking / workspace*, *romantic*,
   *corporate / networking*, *community / social evening*, *class / workshop*. First match
   wins, ordered most-specific first.
3. **Category directions** — specific direction sets for a detected category (kids vs adult
   birthday, BBQ, anniversary, graduation, reunion, networking, class).
4. **Generic last resort** — three mood directions, reached **only** when there is no theme,
   no intent match, and no known category. The required dream examples never reach this.

Examples (AI off): "propose to my girlfriend beautifully" → *Private Sunset/Beach Proposal,
Intimate Dinner Proposal, Surprise with Friends & Family, Scenic Adventure, Elegant
Rooftop/Hotel*; "yoga for very rich people" → *Luxury Wellness Retreat, Private Villa Yoga,
Executive Stress-Reset, Premium Oceanfront Sunrise Yoga, High-End Lifestyle Gathering*.

Each option carries audience-aware **safety notes** (children → supervision; elderly →
step-free access / seating / hearing / mobility). The generator is **injectable**
(`ConceptGenerator`), so the AI source (Section 7) replaces this deterministic default when
enabled — without changing the contract. This intent layer is the **quality floor** when AI
is off.

## 5. Stage API (as-built)

`lib/ope/concept-funnel.ts` (pure):
- `runConceptFunnel(request, { generate? }) → ConceptFunnelResult`
- `selectConcept(result, indexOrTitle) → ConceptFunnelResult` (sets `concept_selected`)
- `assessConceptEntry(request)` — the activation signals
- `applyConceptToText(request, selected)` / `conceptRequirement(selected)` — carry the choice forward
- `detectTheme`, `defaultConceptGenerator` — exported for reuse/testing

`lib/ope/concept-plan.ts` (orchestrator):
- `planFromIdea(request, location, { selection? }) → IdeaPlanResult` — runs the funnel, then
  the **unchanged** `parseEventText → generatePlan` path. Returns stage `'concept'`
  (options, no plan) until a concept is chosen or the request bypasses.

All of the above are also re-exported from `lib/ope/index.ts` (additive; `generatePlan` and
every existing export are unchanged).

## 6. Interaction with the rest of OPE

- **Preserves existing behaviour:** no existing function is modified. `generatePlan` and the
  raw-text parser are untouched; the OPE snapshot suite remains byte-for-byte identical.
- **Does not alter deterministic costing in V1:** the chosen concept captures the
  **direction** (returned on the result and folded into the request text) but does not change
  the structured PlannerInput fields the engine prices against. Deep theming of the plan is
  out of scope here.
- **Clarification still runs:** after bypass/selection the request enters `generatePlan`,
  which runs the Coverage Gate and Clarification Engine as before.

## 7. Live wiring — the public planner is idea-first / AI-first

As of 2026-06-18 the public planner `/plan-an-event` is **idea-first, not form-first**. OPE
is an AI organizer that understands a dream before asking for a checklist:

1. **Raw idea** — the first screen is a free-text box ("Tell us what you want to create").
2. **Concept Funnel (AI-first)** — `analyzeIdeaAction` runs `runConceptFunnelAI`: when AI is
   enabled (`OPE_AI_UNDERSTANDING_ENABLED` + `OPENAI_API_KEY`) the model proposes the concept
   options; otherwise the **deterministic** funnel runs. Either way the contract is identical.
3. **Concept selection** — the user picks a direction (or the request bypasses if it is
   already an operationally-clear brief).
4. **Operational details (secondary)** — only after a direction is chosen does the structured
   form appear, **prefilled** from the idea; it completes location/headcount.
5. **AI understanding + plan** — `generateFromIdeaAction` runs `understandEventText` (AI with
   deterministic fallback) over the idea + chosen concept, overlays the confirmed details, and
   runs the **unchanged** `generatePlan`. The Clarification Engine still runs inside it.

**AI is mandatory in product logic, optional only at runtime:** when the env flags are on, the
idea goes through AI (concept generation and understanding); when off or on any failure, the
deterministic fallback runs. The structured form is no longer the primary entry — it is a
detail-completion step.

As-built: `lib/ai/concept-generation.ts` (AI concepts + `runConceptFunnelAI`),
`lib/actions/planner.ts` (`analyzeIdeaAction`, `generateFromIdeaAction`),
`components/planner/PlannerClient.tsx` (idea → concept → details state machine),
`components/planner/PlanConcept.tsx`. Tests: `npm run test:idea`.

## 8. Still out of scope (V1)

Persistence of the chosen concept; concept-driven changes to deterministic
pricing/resources/staffing (the direction is captured, not costed); full i18n of the new
idea/concept screens (English copy for the first wiring).

## 9. Tests

- `scripts/ope-concept-funnel-test.mts` (`npm run test:concept`): the pure stage — Antarctica
  → options before any plan; operational BBQ → bypass; selection → planning continues;
  contract well-formedness; determinism.
- `scripts/ope-intent-concepts-test.mts` (`npm run test:intent`): organizer-quality check —
  the five required dreams (Antarctica, proposal, luxury yoga, elderly evening, feng-shui
  coworking) each produce specific, distinct concepts; **fails** if any returns generic mood
  labels; BBQ still bypasses.
- `scripts/ope-idea-flow-test.mts` (`npm run test:idea`): the live idea-first flow —
  `analyzeIdeaAction` returns concepts (not a plan); BBQ bypasses; selection → `generateFromIdeaAction`
  plans; AI-off equals the deterministic funnel; and a source guardrail proving
  `PlannerClient` is idea-first, not questionnaire-first.

The existing `test:ope` (byte-for-byte snapshot), `test:ope-text`, and `test:ope-contract`
suites remain green — the engine is unchanged.

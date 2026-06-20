# OPE — P-B Implementation Report (WSH → typed planning signals)

> **Goal:** make WSH a *real planning input* via typed signals — not a redesign, not
> WSH-primary planning. `PlannerInput` stays the engine input.
> **Scope guardrails honored:** OPE only; no Academy, Stripe Connect, marketing, UI redesign,
> billing, or notifications touched. **Not committed.**
> **Chain implemented:** `WSH → extractPlanningSignals() → typed fields → enrichInputWithWsh() →
> generatePlan()`.

---

## What changed (smallest safe version)

A new deterministic extraction layer reads the approved WSH, derives a small set of **typed**
planning signals, and **enriches** the `PlannerInput` immediately before `generatePlan` — on every
live planning path that holds a real human-authored WSH. The engine itself is unchanged: enriched
signals flow through the *existing* feature/venue/budget machinery (`lib/ope/features.ts`,
`risk.ts`, `budget.ts`), so no engine, pricing, or output-contract logic was modified.

**Enrichment rules (enforced in `enrichInputWithWsh`):**
1. Organizer-entered structured fields **always win**.
2. WSH may **fill** a missing `venueType` / `budget` / `guestCount`.
3. WSH may **add** typed requirements (`specialRequirements`, **additive** — organizer entries kept, placed first).
4. WSH **never overwrites** an explicit organizer choice.
5. **No AI dependency** — pure regex/keyword detection.
6. **Deterministic** — fixed signal order, same WSH → same signals.

## Files changed

| File | Change |
|---|---|
| `lib/ope/wsh-signals.ts` | **New.** `PlanningSignals` type, `extractPlanningSignals(wsh)`, `enrichInputWithWsh(input, wsh)`. The whole P-B layer; pure, no LLM, no schema/engine coupling. |
| `lib/ope/index.ts` | Export `PlanningSignals`, `extractPlanningSignals`, `enrichInputWithWsh`. |
| `lib/actions/opePlans.ts` | Import the enricher; add `wshEnriched()` (enrich + re-validate, fall back to original if invalid). `createPlan` and `updatePlanInputs` now plan from + **persist** the WSH-enriched input (and build the assessment from it). |
| `lib/actions/planner.ts` | Public idea path (`generateFromIdeaAction`): enrich the merged input with the approved WSH **deterministically** before `generatePlan` (works with AI off). |
| `scripts/ope-wsh-signals-test.mts` | **New** test (A/B/C + unit + suppression). |
| `package.json` | New script `test:wsh-signals`. |

*(Request-derived paths — `createPlanFromRequest`, `generateApproachesFromRequest` — were
**intentionally not** enriched: their "WSH" is a synthetic draft from the input brief, so it carries
no new signals; the customer's real free-text already enters via `mapRequestToPlannerInput`. Leaving
them untouched keeps the change minimal and risk-free.)*

## Extracted signal types

`extractPlanningSignals(wsh)` returns `{ venueType, budget, guestCount, requirements[] }`:

- **`venueType`** — outdoor/water/park (`beach`, `ocean`, `park`, `outdoor`, `botanical`, `trail`,
  `campground`) → `public_park`; at-home (`backyard`, `garden`, `at home`, `living room`) →
  `backyard_home`.
- **`budget`** — `$1,200` / `budget of 1200` / `1200 dollars`.
- **`guestCount`** — `for 25 guests` / `25 people|attendees|…`.
- **`requirements[]`** — canonical phrases, chosen to line up with the engine's feature keywords so
  a matching feature module (task + priced cost line + risk) fires:
  | Signal | Phrase | Feature module |
  |---|---|---|
  | photography | `Photography coverage` | photography (task + $ + risk) |
  | entertainment (DJ/band/performer/magician) | `Entertainment (DJ / performer)` | entertainer |
  | transportation (shuttle/limo/bus/valet) | `Transportation` | transport |
  | inflatable/foam/bounce house | `Inflatable / foam setup` | foam |
  | alcohol (open bar/cocktails/wine/beer) | `Bar service (cocktails)` | alcohol (high risk) |
  | **alcohol restriction** (`no alcohol`/`dry event`/`sober`) | `No alcohol (dry event)` | **suppresses** alcohol |
  | lodging/overnight/hotel | `Overnight lodging / accommodation` | — (surfaces as typed req) |
  | dining/restaurant/private chef | `Dining / restaurant booking` | — |
  | child-friendly/kid-friendly | `Child-friendly activities` | — |
  | indoor/ballroom/banquet hall | `Indoor venue` | — |

  Signals with no feature module still surface in `section_a.special_requirements` and the proposal,
  so they are visible to the organizer and client.

## Test results

`npm run test:wsh-signals` — **ALL PASS**. The three required scenarios:

- **A. Same `PlannerInput`, different WSH → plan changes.** A *neutral* WSH adds nothing (plan ==
  legacy); a *rich* WSH ("open bar, cocktails, photographer, DJ, shuttle") adds the four typed
  requirements, the alcohol + photography **feature tasks**, the **high-severity alcohol risk**, and
  a **higher budget** (priced feature lines). An outdoor WSH fills a blank `venueType → public_park`.
- **B. Explicit value + conflicting WSH → `PlannerInput` wins.** Organizer `backyard_home` beats WSH
  "public park"; organizer `$5000` beats WSH "$99"; organizer `30 guests` beats WSH "8 people"; an
  organizer requirement is preserved and stays first while the WSH requirement is appended.
- **C. Legacy plans continue to generate.** Empty/`null`/`undefined` WSH → input **byte-identical**;
  plan == legacy. Neutral WSH (no signals) → plan == legacy.

Full suite (before/after):

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `lint` | ✔ no warnings/errors |
| `test:wsh-signals` (new) | ALL PASS |
| `test:wsh` · `test:scenario` · `test:idea` · `test:concept` · `test:intent` | ALL PASS |
| `test:ope` (snapshot) | **31 cases byte-for-byte** (engine untouched) |
| `test:ope-text` · `test:ope-contract` | OK |

The byte-for-byte snapshot confirms the engine is unchanged: P-B acts only at the action boundary
(enriching the input), and the snapshot generates plans from fixed inputs that never carry WSH.

## Examples where WSH now changes planning

| Same structured input | WSH | Effect on the plan |
|---|---|---|
| adult_birthday, 30, backyard | "…open bar and cocktails…" | + `Bar service (cocktails)` req, bar-service task, **high alcohol risk**, bar cost line → higher budget |
| adult_birthday, 30, backyard | "…a hired photographer…" | + `Photography coverage` req, photographer task, media risk, photographer cost line |
| adult_birthday, 30, backyard | "…a DJ for dancing… shuttle transport…" | + entertainment + transportation reqs, their tasks/risks/cost lines |
| adult_birthday, 30, **no venue** | "…on the beach at sunset." | `venueType` filled → `public_park` (outdoor-venue planning) |
| any | "…sober, alcohol-free, no bar…" | `No alcohol (dry event)` surfaced **and** alcohol feature **suppressed** |
| backyard + $5000 set | "public park, $99 budget" | **No change** — organizer values win |

## Remaining G2 limitations

1. **Keyword extraction, not comprehension.** `extractPlanningSignals` is deterministic regex/keyword
   matching; it covers the listed signal families but won't catch paraphrases outside its vocabulary
   (e.g. "a string quartet" isn't yet mapped to entertainment). Extending coverage = adding entries
   to `SIGNALS`. An AI extractor could layer on top later (fill-only), but is **not** required.
2. **Signals limited to existing typed fields + feature modules.** WSH can influence `venueType`,
   `budget`, `guestCount`, and `specialRequirements` (which drive the 5 feature modules + section A).
   Signals without a feature module (lodging, dining, indoor, child-friendly) **surface** as typed
   requirements but don't yet add their own priced tasks/risks — that needs new feature modules
   (engine content work), out of P-B's scope.
3. **Enriched input is persisted.** `createPlan`/`updatePlanInputs` store the *enriched* input, so on
   a later edit the WSH-derived requirements appear in the form as editable items (organizer can
   remove them). This is intentional (the plan's effective input is the enriched one) but means a
   WSH signal becomes a normal requirement after the first save.
4. **Request-derived paths not enriched** (by design — synthetic WSH). If those should also take WSH
   signals, they'd need a real WSH captured from the request, which is a flow change, not P-B.
5. **Still not WSH-primary.** Per the task, `PlannerInput` remains the engine input; WSH only
   fills-blanks and adds-signals. The deterministic resources/staffing baseline still derives from
   category + headcount, not WSH.

## Commands run

`npx tsc --noEmit` · `npm run lint` · `npm run test:wsh-signals` · `test:wsh` · `test:scenario` ·
`test:idea` · `test:concept` · `test:intent` · `test:ope` · `test:ope-text` · `test:ope-contract`.

*(OPE only. No Academy / Stripe Connect / marketing / UI redesign / billing / notifications. Nothing
committed.)*

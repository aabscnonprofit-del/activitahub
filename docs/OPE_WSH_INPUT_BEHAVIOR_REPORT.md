# OPE — WSH Input Behavior Report (G2)

> **Question:** Is WSH a real *planning input*, or only an *approval artifact*?
> **Type:** focused code-and-behavior audit. **No** new architecture, no UI redesign, no
> Academy/Connect/marketing. **Nothing implemented.** **Not committed.**
> **Governing decision under test:** *WSH as the Planning Input* — "Discovery develops WSH;
> Planning consumes WSH."

---

## Files inspected

- `lib/ope/index.ts` — `generatePlan` (the engine entry; the function that produces the plan).
- `lib/ope/request-text.ts` — `parseEventText` (deterministic text → `PlannerInput`).
- `lib/ai/request-understanding.ts` — `understandEventText` (AI-first, deterministic fallback to
  `parseEventText`).
- `lib/actions/planner.ts` — `generateFromIdeaAction` (public idea path: the one place WSH is
  folded into text before planning).
- `lib/actions/opePlans.ts` — `createPlan`, `createPlanFromRequest`,
  `generateApproachesFromRequest`, `updatePlanInputs` (organizer-dashboard planning; G1 gate).

## Exact functions involved

| Function | Role re: WSH |
|---|---|
| `generatePlan(input: PlannerInput)` | The planner. **Single parameter — `PlannerInput`. WSH is not a parameter and cannot be passed.** |
| `generateFromIdeaAction(payload)` | Public path. Gates on `approvedWhatShouldHappen`, then folds it into `enriched` prose (`…— what should happen: ${wsh}`) → `understandEventText(enriched)` → `aiBase` → `merged`. |
| `opePlans.createPlan / updatePlanInputs` | Dashboard. **Gate** on `whatShouldHappen` (G1), then `generatePlan(parsed.data)` — WSH is **never passed onward**. |
| `opePlans.createPlanFromRequest / generateApproachesFromRequest` | Dashboard. Derive a WSH string for the gate, then `generatePlan(finalInput)` — WSH **not passed onward**. |

## Test method

Ran the user's exact procedure (throwaway probe, since deleted): held the structured
`PlannerInput` fixed, varied **only** WSH, regenerated, compared plans.

1. Fixed input: `{ category: 'birthday', guestCount: 20, kids: 12, venueType: null, budget: null,
   specialRequirements: [] }`.
2. **Engine, direct:** `generatePlan(input)` twice → byte-compare. (WSH is not a param, so this is
   the ceiling of WSH's possible influence on the dashboard path.)
3. **Public path merge:** built `enriched = "${brief} — what should happen: ${wsh}"` for two
   *neutral* WSH variants (A = "warm, relaxed… feel happy"; B = "energetic, adventurous… feel
   thrilled"), ran `parseEventText(enriched)` (the deterministic, AI-off path), byte-compared the
   extracted `PlannerInput`.
4. **Counter-case:** a WSH containing a *structured token* ("…in a public park outdoors") through
   the same extraction, to find any leak channel.

## Result

```
A) engine: same PlannerInput twice → identical plan: true
   generatePlan parameters: 1   (PlannerInput only; WSH cannot be passed)
B) neutral WSH A vs B → extracted PlannerInput identical: true
   WSH containing "public park" → extracted venueType: public_park   (neutral: null)
```

- **Does the plan change when only WSH changes?** **No** — not for the plan content. Changing WSH
  *wording* (tone, experience, outcome) produces an **identical** plan.
- **Which structured fields drive the plan instead?** `category`, `guestCount`, `adults`/`kids`,
  `venueType`, `budget`, `specialRequirements` (+ `recurrence`/`instructor`/`materials`). These feed
  `classifyActivity` → assembly, resources, staffing, budget, risk, timeline. **WSH feeds none of
  them.**
- **The one (incidental, non-designed) leak:** on the **public path only**, WSH is concatenated into
  the text handed to `understandEventText`. If WSH happens to contain a parseable **venue** or
  **budget** token **and** the organizer left that field blank (`d.venueType ?? aiBase?.venueType`,
  `d.budget ?? aiBase?.budget`), the extractor can fill it. With AI **off**,
  `aiBase.specialRequirements` is always `[]`, so WSH cannot add requirements/features. This is a
  side-effect of folding WSH into the parser's input, **not** WSH driving planning. The
  **dashboard path has zero such leak** — WSH never reaches an extractor or the engine.

### Where WSH is / isn't passed into Planning

- **Not passed (engine):** `generatePlan(input: PlannerInput)` — `lib/ope/index.ts`. One parameter;
  no WSH.
- **Not passed (dashboard, G1):** `lib/actions/opePlans.ts` — WSH is checked at the gate
  (`if (!whatShouldHappen.trim()) return 'what_should_happen_required'`) and then **discarded**;
  `generatePlan(parsed.data)` runs on the structured input alone.
- **Folded into text only (public):** `lib/actions/planner.ts:164` `const enriched = \`${base} — what
  should happen: ${wsh}\`` → `understandEventText(enriched)` (`:168`) → `merged` (`:175-191`). But
  `category`/`guestCount`/`adults`/`kids` come from `details` (WSH can't touch them); `venueType`/
  `budget` take `details` first, WSH-derived only as a blank-fill; `specialRequirements` gets nothing
  from WSH when AI is off.

## Conclusion

**WSH is currently a gate / approval artifact, not a structured planning input.** The plan is a pure
function of the structured `PlannerInput`. On the organizer dashboard (the G1 surface) WSH has
**zero** influence on the plan. On the public idea path WSH can only *incidentally* fill a blank
`venueType`/`budget` by virtue of being concatenated into the parser's text — and never changes the
deterministic resources/staffing/budget/risk/timeline content. This confirms **G2 is open**:
"Planning consumes WSH" is **not** yet true.

## Smallest patch recommendation

There is **no "very small and obviously safe"** patch, so **none is implemented**. The reason: the
only field that can carry free-text intent into the engine is `specialRequirements`, which the engine
uses for **keyword-matched feature modules** (e.g. catering, photography, entertainer, transport,
alcohol) and **risk keyword matching**. Pushing WSH prose into it would trigger feature/risk modules
unpredictably from wording — changing cost and risk in an uncontrolled "keyword-soup" way. So the
right fix needs a controlled extractor, not a string append. Options, smallest first:

- **P-A — Parity fold (small, ~10 lines).** Make the dashboard paths mirror the public path: build
  `enriched = brief + " — what should happen: " + wsh`, run `understandEventText`, and fill **only
  blank** `venueType`/`budget` (details always win). *Effect:* with AI **off**, output is unchanged
  (so the byte-for-byte snapshot still passes); with AI **on**, WSH can fill missing venue/budget.
  *Honest framing:* this makes the two surfaces consistent but **does not** make WSH a real driver —
  it only blank-fills two fields. **Risk: LOW.**
- **P-B — Typed WSH signal extractor (moderate — the real G2).** Add
  `extractPlanningSignals(wsh): Partial<PlannerInput>` that deterministically maps recognized WSH
  signals (venue, headcount, budget, **named** features like "photographer"/"catering"/"music") to
  **typed** fields, merged as blank-fill + deduped requirements. *Effect:* WSH genuinely influences
  the plan, but through a controlled, testable mapping rather than raw prose. **Risk: MODERATE** —
  new extraction logic; needs its own tests; will (intentionally) shift plans where WSH names a
  feature; snapshot inputs don't include WSH so the 31-case snapshot stays green, but new WSH-driven
  cases must be added.
- **P-C — WSH-primary planning (large — redesign).** Parse WSH into the `PlannerInput` as the
  primary source, with `details` as override. **Risk: HIGH** — changes the meaning of every planning
  path; out of an audit's scope.

**Recommendation:** treat **P-B** as the actual G2 implementation (open a scoped task with tests).
If only a small consistency step is wanted now, **P-A** is safe but is *not* G2 — it should not be
described as "WSH now drives planning."

## Risk level

- **This audit:** none (read-only; probe created and deleted; report only).
- **P-A:** LOW (blank-fill only; deterministic/AI-off output and snapshot unchanged).
- **P-B:** MODERATE (new extractor + new WSH-driven test cases; deliberately changes WSH-bearing
  plans).
- **P-C:** HIGH (redesign of the planning input contract).

## Tests to run if a patch is approved

`npx tsc --noEmit` · `npm run lint` · `test:wsh` · `test:scenario` · `test:idea` · `test:concept`
· `test:intent` · `test:ope` (31 byte-for-byte) · `test:ope-text` · `test:ope-contract`.
For **P-B**, add a focused `test:wsh-input` proving (a) two *neutral* WSH → identical plan and
(b) a WSH that names a feature/venue → the expected typed field/requirement appears — i.e. the exact
behavior this report found missing.

*(Audit only — no architecture, no UI redesign, no Academy/Connect/marketing, nothing implemented,
not committed.)*

# OPE — P-B Final Coverage Report (last live bypass closed)

> **Goal:** every **live** `generatePlan()` path runs through the P-B chain
> (`signal text → extractPlanningSignals() → enrichInputWithWsh() → generatePlan()`). Only
> dead / test-only bypasses may remain.
> **Scope guardrails honored:** OPE only; no Academy, Stripe Connect, billing, marketing,
> notifications, or UI changes. **Not committed.**

---

## What changed

The one remaining live bypass — `generateApproachesFromRequest` (Dashboard → Requests →
"Generate approaches") — now enriches each candidate approach from the **customer's own request
narrative** before planning. There is no human-approved WSH on this path, so the request's
free-text (`notes`, plus `event_type`) is the planning-signal source:

```
request.notes (+ event_type)
  → extractPlanningSignals()      (deterministic, no AI)
  → enrichInputWithWsh(approach)  (structured fields win; fills blanks; adds typed requirements)
  → generatePlan()
```

This is the same `wshEnriched()` helper (enrich + re-validate, fall back to original on invalid)
already used by `createPlan` / `updatePlanInputs`, so behavior is identical in kind.

### Files changed

| File | Change |
|---|---|
| `lib/actions/opePlans.ts` | `generateApproachesFromRequest`: build `requestText = [notes, event_type]`; change the per-approach line from `let finalInput = parsed.data` to `let finalInput = wshEnriched(parsed.data, requestText)`. Nothing else in the function moved. |
| `scripts/ope-wsh-signals-test.mts` | New **section D** (A/B/C) mirroring the action exactly (`mapRequestToApproaches → wshEnriched(requestText) → generatePlan`), deterministically without a DB. |

No new files, no engine change, no new types, no schema change.

## How `generateApproachesFromRequest` is now covered

- **Readiness preserved (rule 1).** `assessRequestReadiness` still runs first and unchanged —
  approaches are only generated once When/Where/Who/Budget/Outcome are satisfied. Enrichment happens
  *after* the gate.
- **Mapping preserved (rule 2).** `mapRequestToApproaches` produces the candidate set exactly as
  before; P-B enriches each resulting approach — it does not alter the category set, so pricing/budget
  candidates are unaffected.
- **Understanding preserved (rule 3).** `understandRequest` (AI, optional) still runs and feeds
  `mapRequestToApproaches` as `baseOverride`; whatever it set is a *structured* value that wins over
  the narrative.
- **Structured fields always win (rule 4).** `enrichInputWithWsh` only fills a **blank**
  `venueType`/`budget`/`guestCount` and **adds** requirements (organizer/structured entries kept,
  placed first). Verified by test B.
- **Narrative may fill blanks / add signals (rule 5).** `mapRequestToPlannerInput` leaves
  `venueType: null` and truncates the raw notes blob to **120 chars**; P-B fills the venue (e.g.
  "beach" → `public_park`) and scans the **full** narrative for typed requirements
  (photography / transport / dining / lodging / …) beyond that truncation.
- **No UI / no approval workflow (rules 6, 7).** Server-side only; the form action is untouched.
- **Deterministic (rule 8).** `extractPlanningSignals` is pure regex/keyword; same request → same
  signals. Confirmed by the byte-for-byte snapshot and test C.

## Tests run / results

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `lint` | ✔ no warnings/errors |
| `test:wsh-signals` (incl. new **section D**) | **ALL PASS** |
| `test:wsh` · `test:scenario` · `test:idea` · `test:concept` · `test:intent` | ALL PASS |
| `test:ope` (snapshot) | **31 cases byte-for-byte** (engine untouched) |
| `test:ope-text` · `test:ope-contract` | OK |

**Section D specifics (the required A/B/C):**
- **A.** Request narrative "beach / photographer / shuttle / dinner / $6000" → budget signal detected
  ($6000); every approach gets `venueType = public_park`; approaches carry `Photography coverage`,
  `Transportation`, `Dining / restaurant booking`; a ready approach gains the photographer + transport
  feature tasks.
- **B.** Structured `budget=$5000` and `guestCount=40` are **not** overwritten by narrative "$99 / for
  8 people"; the narrative still **adds** the photography requirement (fill, not overwrite).
- **C.** A neutral narrative (no signal keywords) → enriched input **byte-identical** to the mapped
  input, and plans **byte-identical** to pre-P-B. Existing request→approach behavior is preserved.

## All `generatePlan()` callers — final coverage map

### Live production paths — **all covered by P-B**

| Entry point | `generatePlan` site | P-B? | Reached from |
|---|---|---|---|
| `opePlans.createPlan` | `opePlans.ts:75` | **YES** (`wshEnriched`, WSH) | `NewPlanForm.tsx` |
| `opePlans.updatePlanInputs` | `opePlans.ts:628` | **YES** (`wshEnriched`, WSH) | `EditPlanForm.tsx` |
| `planner.generateFromIdeaAction` | `planner.ts:200` | **YES** (`enrichInputWithWsh`, approved WSH) | `PlannerClient.tsx` |
| `opePlans.generateApproachesFromRequest` | `opePlans.ts:329`, `:334` | **YES (this change)** — `wshEnriched(parsed.data, requestText)` | `requests/page.tsx` → `generateApproachesFromRequestAction` |

### Remaining bypasses — **dead / test-only** (no live surface)

| Entry point | `generatePlan` site | P-B? | Status / why safe |
|---|---|---|---|
| `opePlans.createPlanFromRequest` | `opePlans.ts:181`, `:188` | No | **Dead (UI-unreachable):** only caller is `generatePlanFromRequestAction` (`opePlans.ts:238`), which has **zero** UI references (superseded by the approaches flow). Would need `wshEnriched(parsed.data, requestText)` if ever re-wired. |
| `planner.generatePlanAction` | `planner.ts:26` | No | **Dead:** zero callers anywhere (legacy `'use server'` export). |
| `concept-plan.planFromIdea` | `concept-plan.ts:51` | No | **Test-only:** sole caller is `scripts/ope-concept-funnel-test.mts`. |

### Test harnesses (not live)
`scripts/*.mts` (snapshot, output-contract, text-understanding, concept-funnel, wsh-signals,
supplier, rental, rfq, real-discovery, google-places) call `generatePlan` directly to exercise the
engine. Correctly outside P-B.

## Goal state — reached

**All live `generatePlan()` paths are covered by the P-B layer.** The four reachable planning
surfaces (dashboard create, dashboard recompute, public idea flow, dashboard request→approaches) all
run `extract → enrich → generatePlan`. The only remaining bypasses are **dead** (`createPlanFromRequest`,
`generatePlanAction`) or **test-only** (`planFromIdea`) — none reachable from a live surface.

**Recommended (not done, out of this scope):** if `createPlanFromRequest` is ever re-wired to the UI,
apply the same one-line `wshEnriched(parsed.data, requestText)` to keep coverage complete.

*(OPE only. No Academy / Stripe Connect / billing / marketing / notifications / UI changes. Nothing
committed.)*

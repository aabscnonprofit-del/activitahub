# M5 — Organizer Workspace Implementation Plan

> **Purpose:** convert `OPE_WORKSPACE_V1` into an actionable engineering plan. **Not** architecture,
> workspace redesign, new concepts, schema, API, or code.
> **Builds on:** the existing deterministic engine (`lib/ope` — `generatePlan(input) → {status, coverage,
> plan, questions}`, plan = 6-section `OUTPUTS_V1`), the consumer components (`PlanResult`, `PlanClarify`,
> `PlanHandoff`) to reuse, the Event Lifecycle, and `OPE_V1_BUILD_SEQUENCE` M5.
> **Persistence note:** M5 requires plans to **persist + be editable + versioned**; that is a capability
> and a dependency (`SYNC §5`), described here at the behavior level — **no schema is designed**.
> **Date:** 2026-06-11.

---

## 1. Scope

**M5.0 (core — single-event organizer workspace):**
- Create an event (intake → gate → clarification → generate), persisted as a **Draft**.
- **Persist** a plan with its inputs, edit-state, phase, and corrections.
- **View** the plan across its lenses (read): timeline, budget, resource, task, risk, communication.
- **Edit inputs** with **deterministic recompute**; **edit budget line items** (current-plan-only).
- **Mark** tasks done, risks handled, resources sourced.
- **Readiness** 5-tile model.
- **Lifecycle phases** Planning / Preparation / Ready, with **freeze** at Ready.

**M5.1 (deferred):** portfolio **dashboard** (multi-event), **Live** run-sheet, **Completed** close-out +
**actuals capture**, custom tasks/notes, **message-send** tracking, plan **versioning/history**, recurring
per-session display.

**M6+ (not M5):** sourcing **brief generation** (needs `request_brief` + Staffing emission), **marketplace
handoff**, proposal/PDF, **learning** feedback, worker/vendor matching.

---

## 2. Screen inventory (M5.0)

| Screen | Purpose | Primary user | Required information | Actions |
|---|---|---|---|---|
| **Create / Intake** | start an event, capture inputs | organizer | the input fields (type, count, venue, location, budget, requirements, recurrence) | enter inputs · answer clarifications · generate |
| **Clarification panel** | resolve UNKNOWN→ASK before planning | organizer | `result.questions` | answer → re-submit |
| **Handoff panel** | honest refusal/route when gate ≠ plan_ready | organizer | `result.coverage` (reason, next step) | acknowledge · change inputs |
| **Event Hub** | the cockpit: identity + status + navigation | organizer | identity (what-you-told-us), **5-tile strip**, lifecycle phase | open a lens · edit identity · advance phase |
| **Timeline (Planning) lens** | shape of the event over time | organizer | `section_b` timeline + summary/headline | (read) |
| **Budget lens** | cost + where the money goes | organizer | `section_c_budget` bands, line items, drivers, note | edit line item · edit target |
| **Resource lens** | what's needed + what's missing | organizer | resource quantities + needs list + sourced state | adjust quantity · mark sourced |
| **Task lens** | what to do, what's left | organizer | `section_b` checklists + completion | tick task · (M5.1 add task) |
| **Risk lens** | what could go wrong, covered? | organizer | `section_d_key_risks` + handled state | mark handled · note |
| **Communication lens** | what to send | organizer | `section_e_ready_messages` | copy/personalize · (M5.1 mark sent) |

The six lenses are **tabs within the Event Hub**, not separate destinations.

---

## 3. Component inventory

Components are **lenses on engine output + thin edit/state wrappers.** Reuse the consumer components where
noted.

| Component | Responsibility | Depends on engine output |
|---|---|---|
| **IntakeForm** | collect inputs → an input object for `generatePlan` | — (produces `PlannerInput`) |
| **ClarificationPanel** *(reuse `PlanClarify`)* | render `questions`, collect answers, re-submit | `result.questions` |
| **HandoffPanel** *(reuse `PlanHandoff`)* | render refusal reason + next step | `result.coverage` |
| **EventHubHeader** | identity + **LifecycleBadge** + edit-identity entry | `section_a_what_you_told_us` |
| **StatusStrip** | the 5 readiness tiles | risks, needs, budget, staffing, task-completion (derived) |
| **TimelineView** *(reuse from `PlanResult`)* | render phases (when/goal) | `section_b.timeline` |
| **ChecklistView** | render checklists + completion toggles | `section_b.*_checklist` + local done-state |
| **BudgetView** *(extend `PlanResult` budget block)* | bands + **editable line items** + drivers + note | `section_c_budget` (+ correction overlay) |
| **ResourceView** | needs/quantities + sourced toggles | resource quantities + needs list (M4) |
| **RiskView** *(reuse from `PlanResult`)* | risks + handled toggles | `section_d_key_risks` |
| **MessageView** *(reuse from `PlanResult`)* | messages + copy | `section_e_ready_messages` |
| **PlanStore** | save/load/version an event {inputs, plan, corrections, done/handled/sourced state, phase} | the whole result (capability; **no schema here**) |
| **RecomputeController** | on input edit → re-run `generatePlan`; on line edit → apply correction overlay | `generatePlan` (deterministic) |

---

## 4. User flows

- **Create event:** organizer fills **IntakeForm** → system runs `generatePlan` → if `needs_clarification`
  show **ClarificationPanel** (loop) → if refusal show **HandoffPanel** → if `plan_ready` **persist as
  Draft** and open the **Event Hub**.
- **Review plan:** Event Hub shows identity + **StatusStrip**; organizer opens lenses (timeline, budget,
  risk, …) — all **read** from the persisted plan.
- **Edit event:** organizer changes an **input** (count/venue/…) in identity → **RecomputeController**
  re-runs `generatePlan` → new plan **persisted** (corrections re-applied if still valid) → StatusStrip
  updates.
- **Recompute event:** the deterministic re-run above; instant; **current-plan-only** (no shared-knowledge
  change). A **budget line edit** applies a **correction overlay** → budget totals recompute, rest
  unchanged.
- **Prepare event:** organizer works the **Task lens** (tick → Ready % rises), marks **resources
  sourced** and **risks handled**; phase moves to **Preparation**.
- **Freeze event:** at **Ready** (phase transition), budget/resources + safety/comms become **non-editable**
  (frozen); the plan is the locked source of truth.
- **Complete event:** *(M5.1)* capture **actuals**, close → plan becomes a **record**.

---

## 5. Recompute triggers (per editable field)

| Editable field | What recalculates | What remains unchanged |
|---|---|---|
| **Attendee count** | resource quantities, per-head budget lines × count, supervision risk, capacity, message headcount → **full `generatePlan` re-run** | activity type, venue-driven risks, manual corrections (re-applied if valid) |
| **Adults / Kids** | supervision + favors quantities, budget kid/adult lines, subtype (kids→young-kids) → **re-run** | venue, activity type |
| **Venue** | outdoor/indoor risks, venue cost lines, logistics, message location → **re-run** | counts, activity type |
| **Budget target** | **Budget Health tile only** | computed costs, all sections |
| **Budget line item** (price/qty) | budget **totals + bands** via **correction overlay** | all other sections; pricing seed (overlay is current-plan-only) |
| **Activity type** | **re-classification** → re-run gate + new pattern/pricing → effectively a **new plan** (with **confirm**; may yield a handoff) | nothing guaranteed — treated as a fresh plan |
| **Requirements** | headline/theme + free-text-driven items (where supported) → **re-run** | counts, budget structure |
| **Recurrence** | cadence + per-session/series budget → **re-run** | per-session computations |
| **Task done / Risk handled / Resource sourced** | **readiness tiles only** | the plan itself |

**Two recompute paths to implement:** (a) **input edit → full `generatePlan` re-run**; (b) **line-item
correction → overlay + totals-only recompute.** Corrections are **current-plan-only** and survive re-runs
when still valid.

---

## 6. Readiness system

**Indicators (the 5 tiles)** + an overall **Ready %**:

| Tile | Reads | Green | Amber | Red |
|---|---|---|---|---|
| **Ready %** | composite of the four + task completion | high | mid | low |
| **Open Risks** | unhandled risks (high/never-drop weighted) | none open | some | high/never-drop open |
| **Missing Resources** | needs not marked sourced | all sourced | some missing | critical missing |
| **Budget Health** | likely vs target (+ fallback flag) | within | near | over / unpriced |
| **Staffing Status** | supervision/staffing needs vs arranged | arranged | partial | unarranged |

**Status states:** each tile is **green / amber / red**; **Ready %** is the roll-up. **Success criteria:**
the organizer reads overall status (and the worst tile) in **≤10 seconds**; green = proceed, amber =
attend soon, red = act now. *(Thresholds are simple status concepts; not exposed formulas, not specified
here.)*

---

## 7. Development breakdown (work packages)

| WP | Objective | Dependencies | Completion criteria |
|---|---|---|---|
| **WP1 — PlanStore** | persist/load/version an event {inputs, plan, corrections, state, phase} | persistence decision (`SYNC §5`) | a generated plan **round-trips** (save → reload → identical render) |
| **WP2 — Create flow** | intake → gate → clarification → generate → persist Draft | engine, WP1, reuse `PlanClarify`/`PlanHandoff` | create → `plan_ready` persisted as Draft, or honest handoff |
| **WP3 — Read lenses** | render all 6 sections in the Event Hub | engine output, reuse `PlanResult` blocks | all six lenses render from a saved plan |
| **WP4 — Status strip** | the 5 tiles + Ready % | WP3 | tiles compute from plan + state; 10-sec glance |
| **WP5 — Input edit + recompute** | edit identity inputs → deterministic re-run → persist | WP1, WP3, RecomputeController | edit count/venue → plan recomputes + persists; corrections survive |
| **WP6 — Budget correction overlay** | edit a line item (current-plan-only) → totals recompute | WP3, WP5 | line edit changes totals only; persists; never leaks to knowledge |
| **WP7 — Preparation state** | tick tasks · mark risks handled · mark resources sourced | WP3, WP4 | toggles update the relevant tiles + persist |
| **WP8 — Lifecycle phase + freeze** | Planning → Preparation → Ready; freeze budget/resources/safety/comms at Ready | WP1, WP5 | phase advances; frozen fields become non-editable |
| **WP9 (M5.1)** | dashboard · Live run-sheet · Completed + actuals · message-send · versioning UI | M5.0 complete | each renders/behaves per `OPE_WORKSPACE_V1` |

**Critical path:** WP1 → WP3 → WP5/WP6 → WP8 (persistence → render → edit/recompute → freeze). WP2 and
WP4/WP7 parallelize once WP1/WP3 land. **WP9 is M5.1.**

---

## Summary

M5 builds the organizer workspace as **persistence + editing + readiness on top of the existing engine** —
reusing the consumer rendering components, re-running `generatePlan` for deterministic recompute, layering
**current-plan-only** corrections, and surfacing the **5-tile readiness** and **lifecycle freeze**. M5.0
delivers the single-event create→review→edit→prepare→freeze loop; M5.1 adds the dashboard, Live/Completed
phases, and actuals; sourcing and marketplace remain M6+. The plan is directly usable for engineering
sequencing with WP1 (PlanStore) as the unblocking first package.

_Implementation planning only. No architecture, schema, API, or code. Converts `OPE_WORKSPACE_V1` into
work packages against the existing `lib/ope` engine and components._

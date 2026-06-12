# WP1 — PlanStore Implementation Tasks

> **Work package:** WP1 of M5 (per `M5_ORGANIZER_WORKSPACE_IMPLEMENTATION_PLAN`) — the **persisted,
> editable plan capability** that unblocks the organizer workspace.
> **Constraints:** no architecture redesign, no new product concepts, no M6 sourcing, no marketplace, no
> OPE engine logic changes, **no code yet**. Schema described **only** at the behavior level.
> **Date:** 2026-06-11.

---

## 1. Current codebase findings

**Where plans are generated**
- `lib/ope/index.ts` → `generatePlan(input) → { status, coverage, plan, questions }` (deterministic;
  `plan` = 6-section `ACTIVITY_PLANNER_OUTPUTS_V1`).
- `lib/actions/planner.ts` → `generatePlanAction(raw)` — a **public** `'use server'` action (no auth),
  validates with zod, calls `generatePlan`. **In-memory only.**

**Where plans are rendered**
- `app/[locale]/plan-an-event/page.tsx` (public page) → `components/planner/PlannerClient.tsx`.
- `PlannerClient` holds **all state in React** (`category/total/adults/kids/venue/budget/requirements/
  location/recurrence/instructor/materials` + `result` + `lastInput`) — **ephemeral; nothing is saved.**
- Rendering components: **`PlanResult`** (all 6 sections, read), **`PlanHandoff`** (refusal),
  **`PlanClarify`** (clarification).

**Existing reusable pieces**
- The engine: `generatePlan` + types (`PlannerInput`, `PlanGenerationResult`, `PlannerOutput`).
- The render: `PlanResult` / `PlanHandoff` / `PlanClarify` (lift into the organizer workspace as-is).
- The action: `generatePlanAction` (the create/recompute call).

**Persistence convention (to mirror, not invent)**
- Organizer-owned data = a **Supabase table** (`UUID id`, `organizer_id → profiles`, `created_at/
  updated_at`, **RLS owner-only**, indexes) + **server actions** in `lib/actions/*` using
  `createClient()` + `auth.getUser()` + `.eq('organizer_id', user.id)` + `revalidatePath(...)`
  (e.g. `lib/actions/venues.ts`, `participants.ts`).
- Migrations are numbered (`001`–`020`); **next = `021`**. Migrations are **applied by the user**
  (manual SQL, per the project convention).
- Organizer surfaces live under `app/[locale]/dashboard/*`, gated by `middleware.ts`
  (`certified_organizer` + active subscription).

**Conclusion:** there is **no plan persistence today**. WP1 adds an **organizer-owned saved-plan**
record following the existing table+action+RLS convention, reusing the engine and render. The **public
consumer planner stays in-memory and unchanged** (Single Engine, two surfaces).

---

## 2. WP1 scope

**Must support (M5.0):**
- **Create plan** — run `generatePlan(input)` and persist the result as an organizer-owned record.
- **Save plan** — write/overwrite the record.
- **Load plan** — fetch one by id, and list an organizer's plans.
- **Update after edit/recompute** — on an input edit, **re-run `generatePlan`** and persist the new
  result.
- **Preserve current plan state** — persist the edit-state alongside the plan: **budget line
  corrections** (overlay), **prep-state** (tasks done / risks handled / resources sourced), and
  **lifecycle phase**.
- **Future versioning (only if trivial)** — keep `updated_at` (+ a simple integer `version` bumped on
  save). **Do not** implement full snapshot history.

**What must persist (behavior-level — necessary to describe behavior; not a schema design):**

| Field | Holds | Why |
|---|---|---|
| `id`, `organizer_id` | identity + owner | RLS scoping (mirror `participants`/`venues`) |
| `input` | the `PlannerInput` used | the source of truth for recompute |
| `result` | the `{ status, coverage, plan }` (the generated `OUTPUTS_V1`) | fast, stable load without re-deriving |
| `corrections` | budget line-item overrides (current-plan-only) | survive recompute |
| `prep_state` | tasks done / risks handled / resources sourced | readiness + workspace state |
| `phase` | lifecycle phase (Planning/Preparation/Ready) | freeze + display |
| `version`, `created_at`, `updated_at` | trivial versioning | save tracking |

> `input`/`result`/`corrections`/`prep_state` are **opaque JSON payloads** to the store — it persists and
> returns them; it does not model their internals (the engine owns those).

**Out of WP1:** M6 sourcing, marketplace, multi-organizer sharing, full version history, any change to the
public consumer planner, any OPE engine logic change.

---

## 3. Implementation tasks (ordered)

| # | Task | Notes |
|---|---|---|
| **T1** | **Specify the saved-plan record** (the §2 fields) as a typed shape | a `SavedPlan` type (e.g. `lib/types` or `lib/ope`); input/result/corrections/prep_state typed as the existing engine types / opaque JSON |
| **T2** | **Migration `021`** — an organizer-owned `ope_plans` table (id, organizer_id→profiles, input jsonb, result jsonb, corrections jsonb, prep_state jsonb, phase, version, timestamps) + **RLS owner-only** + organizer index | mirror `020_participants` conventions; **user applies the SQL** |
| **T3** | **Server actions** `lib/actions/opePlans.ts` — `createPlan(input)` (runs `generatePlan`, persists, returns id), `getPlan(id)`, `listPlans()`, `updatePlanInputs(id, input)` (re-runs `generatePlan`, persists), `savePrepState(id, state)`, `saveCorrections(id, overlay)` | all organizer-scoped (`auth.getUser` + `organizer_id`); reuse `generatePlan` |
| **T4** | **Recompute-on-edit path** in `updatePlanInputs` — re-run `generatePlan`, persist new `result`, **re-apply corrections/prep-state where still valid** | deterministic; current-plan-only |
| **T5** | **Load → render proof** — load a saved plan and render it through **`PlanResult`** (read) | minimal; proves round-trip; full workspace UI is WP3+ |
| **T6** | **Tests** (§5) | engine regression + persistence round-trip + recompute + RLS |
| **T7** | **Verify** `tsc --noEmit`, `npm run build`, `npm run test:ope` | no consumer-planner regression |

**Order / critical path:** T1 → T2 → T3 → T4 → T5 → T6 → T7. T2 (migration) is the foundation; T3/T4 are
the store; T5 proves it end-to-end.

---

## 4. Completion criteria

WP1 is **done** when all hold:
1. A generated plan can be **saved** (organizer-owned) and **reloaded** with an **identical render**
   (round-trip).
2. **Listing** returns an organizer's saved plans (owner only).
3. Editing an **input** → **recompute** → the updated plan **persists**; reload shows the edited plan.
4. **Prep-state** (a task ticked / risk handled / resource sourced) **persists** across reload.
5. A **budget line correction** persists and **survives a valid recompute**.
6. **RLS holds** — a different organizer cannot read/write another's plan.
7. The **public consumer planner is unchanged** — `npm run test:ope` green; `/plan-an-event` behaves as
   before.
8. `tsc --noEmit` clean; `npm run build` compiles.

---

## 5. Test plan

**Run (existing):**
- `npm run test:ope` — engine + consumer planner **regression** (must stay green; proves no engine
  change).
- `npx tsc --noEmit` and `npm run build` — type + build.

**Create (new, behavior-level):**
- **Round-trip:** create a plan via `createPlan(input)`, `getPlan(id)`, assert returned `input`+`result`
  equal what was saved.
- **Recompute-persist:** save → `updatePlanInputs(id, editedInput)` → reload → assert the plan
  **recomputed** and **persisted**, and corrections/prep-state preserved where valid.
- **Prep-state:** `savePrepState` → reload → assert state preserved.
- **Corrections:** `saveCorrections` (a line override) → reload → assert override applied to totals; then
  recompute → assert override survives.
- **RLS/ownership:** as a second user, `getPlan(otherId)` returns nothing (owner-scoped).

*(Integration tests touch Supabase; follow the project's existing verification style — a `tsx` script or
manual check against the DB — alongside the `test:ope` regression. The migration is applied by the user
before the DB-touching tests run.)*

---

## Summary

WP1 adds an **organizer-owned saved-plan store** by following the existing table+server-action+RLS
convention (migration `021`, `lib/actions/opePlans.ts`), reusing **`generatePlan`** for create/recompute
and **`PlanResult`** for render. It persists the **input, generated result, corrections, prep-state, and
phase**, supports **deterministic recompute-on-edit**, and keeps the **public consumer planner unchanged**.
Done = a plan round-trips, recompute persists, prep-state/corrections survive, RLS holds, and no regression
— the foundation the rest of M5 builds on.

_Implementation task list only. No code, no API redesign, no architecture; schema described at the
behavior level (fields a record must hold) per the existing `020`-style convention._

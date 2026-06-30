# ActivLife Hub — Architecture (Start Here)

> **Status: AUTHORITATIVE — the single entry point to the architecture.**
> This directory is the canonical hub created in the *Architecture Canon Cleanup*. It does not
> replace the in-place documents — it **indexes** them, because most canon files are referenced by
> code (`docs/X.md` paths in comments) and by `../DOCUMENTATION_INDEX.md`, so physically moving them
> would break links. The cleanup therefore keeps files where they are and points to them from here.
> Authority order: **CONSTITUTION > AUTHORITATIVE > CURRENT > PARTIALLY OBSOLETE > HISTORICAL > OBSOLETE.**

---

## 1. What ActivLife Hub is

ActivLife Hub is an **AI Operating System for independent event organizers**. It turns an organizer's
*idea* into a *real-world activity* with as little human effort as possible: **AI does the work**
(understand, plan, decompose, cost, coordinate) and the **human directs** (judge, approve, adjust). It
"scales the organizer, not the organization." Success is measured in **real gatherings created**, not
screen time or fees. Three paid loops: the **Activity Planner** (One Event License $9.99), **Academy +
Certification** ($99 beginner / $39.99 experienced), and the **Organizer Platform** ($19.99/mo).

## 2. The center of the system: the Project

**The Project is the single durable Root Entity** — the one thing that *is* the event end to end.
Everything realized (budget, vendor commitments, proposals, payments, participants, files, history,
the execution record) belongs permanently to the Project. A Project is a **permanent digital place
with one stable address**; every role (organizer, participant, vendor, …) enters the *same place* and
permissions create different *views*, not different systems. **Every meaningful action changes the
state of exactly one Project.** Workspace, Event Home, Public Space, Commercial Proposal, Registration
and Payments are all **projections of the same Project**.

→ `../ADR_003_ENTITY_OWNERSHIP.md`, `../PROJECT_AS_PLACE_PRINCIPLE.md`, `../PROJECT_STATE_MODEL_PRINCIPLE.md`

## 3. The one thing to understand before touching code

There are **three planning lineages** in this repo; only one is the live spine. Know which you are in.

| Lineage | Code | Output | Status |
|---|---|---|---|
| **OPE V1** (legacy) | `lib/ope` | six-section **Plan** (`ope_plans`) | **LIVE, revenue-bearing** (structured planner, saved plans, requests/marketplace) |
| **OPE V2** (8 modules) | `lib/discovery` → `lib/ope-engine` → `lib/project` → `lib/organizer-workspace` | Discovery FED → **IR** → assembled **Project** (WorkPackages) | **DORMANT** — M1–M3 built + tested, **zero production callers**; M4 foundation only; M5–M8 unbuilt |
| **Planning Engine V2** (active migration) | `lib/planning` | domain FED → **EventPlanV2** (`project_event_plans_v2`/047) | **LIVE & authoritative** for the idea-first planner; consumed by Budget / Plan Review / Proposal / Public Space |

Two name collisions that trap every reader:

- **Two "Project" entities:** `projects` (DB, migration 041, `lib/projects/store.ts`) = the live, thin
  durable Root Entity. vs. the assembled `Project` (`lib/project/assembly.ts`) = the dormant OPE-V2
  work-breakdown, **never persisted**.
- **Two "FED" types:** the Discovery FED (`lib/discovery/types.ts`, dormant lineage) vs. the neutral
  domain FED (`lib/domain/future-event-description.ts`, consumed by the live Planning Engine V2).

The **approved target** (`../IMPLEMENTATION_CONTRACT.md`) makes Planning Engine V2 the spine and
retires/absorbs the other two.

## 4. Where to start reading (one afternoon)

**Hour 1 — what & why:** `../GLOBAL_PRODUCT_SPECIFICATION.md` → `../ALH_PRODUCT_PHILOSOPHY.md` →
`../ACTIVLIFE_HUB_CORE_MISSION.md` → `../CONVERSATION_FIRST_PRINCIPLE.md`

**Hour 2 — the architecture:** `../CURRENT_ARCHITECTURE.md` → `../ADR_003_ENTITY_OWNERSHIP.md` →
`../ADR_004_SOURCE_OF_TRUTH.md` → `../ADR_005_LIFECYCLE_STATE_MACHINE.md` →
`../ADR_006_TRANSITION_AUTHORITY.md` → `../PROJECT_AS_PLACE_PRINCIPLE.md` →
`../PROJECT_STATE_MODEL_PRINCIPLE.md`

**Hour 3 — the live engine & migration:** `../IMPLEMENTATION_CONTRACT.md` →
`../PLANNING_LAYER_MIGRATION_ROADMAP.md` → read `lib/planning/*` (until the Planning Engine V2 spec is
written — see §7) → `../CREATIVE_ENGINE_AXIOMS.md` + `../OPE_REQUEST_INTERPRETATION_PRINCIPLE.md`

**Hour 4 — current state & subsystems:** `../PROJECT_STATUS.md` → `../FEATURE_MATRIX.md` →
`../MIGRATION_STATUS.md` → `../BUDGET_COSTING_MODEL_ALIGNMENT.md` + `../CONFIRMED_COMMITTED_CONTRACT.md`
→ `../PROJECT_PUBLIC_SPACE_SPEC.md` → `../OCCURRENCE_SPEC.md`

**Optional / history:** OPE V1 engine docs only if touching `lib/ope`; the OPE V2 cluster only as "a
dormant parallel design" (see `../archive/README.md`).

## 5. The Architecture Canon (authoritative — read these)

| # | Document | Authority | Answers |
|---|---|---|---|
| 1 | `../ALH_PRODUCT_PHILOSOPHY.md` | **CONSTITUTION** | Why ALH exists; inviolable principles (wins all conflicts) |
| 2 | `../IMPLEMENTATION_CONTRACT.md` | **AUTHORITATIVE** | Implementation governance + the target pipeline |
| 3 | `../ACTIVLIFE_HUB_CORE_MISSION.md` | **AUTHORITATIVE** | The mission / decision rule |
| 4 | `../GLOBAL_PRODUCT_SPECIFICATION.md` | **AUTHORITATIVE** | What ALH is, end to end |
| 5 | `../CURRENT_ARCHITECTURE.md` | **AUTHORITATIVE** | The canonical pipeline + entity model |
| 6 | `../ADR_003_ENTITY_OWNERSHIP.md` | **AUTHORITATIVE** | Plan = intended; Project = realized |
| 7 | `../ADR_004_SOURCE_OF_TRUTH.md` | **AUTHORITATIVE** | One writer per fact; reference/derive/snapshot |
| 8 | `../ADR_005_LIFECYCLE_STATE_MACHINE.md` | **AUTHORITATIVE** | The event lifecycle + freezing |
| 9 | `../ADR_006_TRANSITION_AUTHORITY.md` | **AUTHORITATIVE** | Who initiates vs. authorizes; AI never authorizes a commitment |
| 10 | `../ADR_007_BUSINESS_OPERATIONS.md` | **AUTHORITATIVE** | Guarded-operation / closed-command model |
| 11 | `../ADR_008_PUBLISH_FLOW.md` | **AUTHORITATIVE** | Owner-only idempotent publish → Public Space |
| 12 | `../PROJECT_AS_PLACE_PRINCIPLE.md` | **AUTHORITATIVE** | What a Project *is* (a permanent place) |
| 13 | `../PROJECT_STATE_MODEL_PRINCIPLE.md` | **AUTHORITATIVE** | How a Project *lives* (one integration point) |
| 14 | `../PLANNING_LAYER_MIGRATION_ROADMAP.md` | **AUTHORITATIVE** | Migration plan of record (Decision A) |
| 15 | `../CREATIVE_ENGINE_AXIOMS.md` + `../OPE_REQUEST_INTERPRETATION_PRINCIPLE.md` | **AUTHORITATIVE** | Intention, not categories |

**Current (state, will drift as code lands):** `../PROJECT_STATUS.md`, `../FEATURE_MATRIX.md`,
`../MIGRATION_STATUS.md`, `../MASTER_PRODUCT_DECISIONS.md`, `../OCCURRENCE_SPEC.md`,
`../PROJECT_PUBLIC_SPACE_SPEC.md`.

The full reasoning behind this canon — including every contradiction and every architecture-vs-code
gap — is preserved in **`ARCHITECTURE_CONSOLIDATION_AUDIT.md`** (this directory).

## 6. How a Project emerges today (the assembly reality)

- A Project **emerges as a thin owner record** the moment the planner runs (`resolveProjectForPlan`),
  `current_step: planning → plan_ready`.
- **EventPlanV2** (Planning Engine V2) is computed from the domain FED and persisted against it.
- **Budget** lines are regenerated **directly from EventPlanV2** (`resources → resource_need`,
  `staffing → role_need`), bypassing the `043` delivery-components table the Budget contracts describe.
- **Commercial Proposal** and **Public Event** are projections of EventPlanV2 (+ Budget).
- **Requirements / WorkPackages / dependency graph / IR / execution structure do not exist in the live
  path** — they live only in the dormant OPE-V2 lineage. **Execution & Completion are unbuilt.**

This `EventPlanV2 → structured Project` gap is the open architectural frontier (see the audit, §E/§I).

## 7. Known canon gaps (do not assume these exist)

- **`PLANNING_ENGINE_V2_PRODUCT_SPECIFICATION.md` is missing** — named authoritative by
  `../IMPLEMENTATION_CONTRACT.md` and cited in `lib/planning/reasoning.ts` / `intention-signals.ts`, but
  there is **no file**. Highest-priority documentation gap.
- No contract for **EventPlanV2 → Project Assembly**, no unified **Project entity** definition, no
  current **Execution / Completion** model. See the audit, §I.

## 8. Related index documents

`../DOCUMENTATION_INDEX.md` (full map of all ~190 docs, by cluster) · `../ADR_INDEX.md` (all ADRs) ·
`../archive/README.md` (HISTORICAL documents, classified and kept in place).

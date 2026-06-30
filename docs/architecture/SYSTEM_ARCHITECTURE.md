# ActivLife Hub — System Architecture

> **Status: AUTHORITATIVE — the single architectural description of ActivLife Hub.**
> Consolidated (not redesigned) from the existing canon and verified against current code, per the
> *Architecture Consolidation Audit* (`ARCHITECTURE_CONSOLIDATION_AUDIT.md`). Every statement traces to
> an authoritative document `[DOC]` or to current implementation `[code]`. Where neither defines
> something, it says **"Architecture not currently defined."** Governed by the Constitution
> (`../ALH_PRODUCT_PHILOSOPHY.md`). Entry point: `README.md`. Read time: < 1 hour.
>
> This document **does not introduce, improve, or redesign** any architecture. It only consolidates.
>
> **This document describes HOW ActivLife Hub is implemented.** The product itself is defined by
> `docs/ACTIVLIFE_HUB_PRODUCT_CANON.md`. If implementation and product intent ever differ, the Product Canon
> is authoritative.

---

## 1. What is ActivLife Hub?

ActivLife Hub is an **AI Operating System for independent event organizers** — software that turns an
organizer's *idea* into a *real-world activity* with as little human effort as possible. The inversion
from conventional tools: **AI does the work** (understand, plan, decompose, cost, coordinate) and the
**human directs** (judge, approve, adjust). It "scales the organizer, not the organization."
`[ACTIVLIFE_HUB_CORE_MISSION.md, GLOBAL_PRODUCT_SPECIFICATION.md, ALH_PRODUCT_PHILOSOPHY.md]`

It is delivered as three paid loops: the **Activity Planner** (One Event License $9.99), **Academy +
Certification** ($99 beginner / $39.99 experienced), and the **Organizer Platform** ($19.99/mo
subscription, unlocked after certification). `[MASTER_PRODUCT_DECISIONS.md]`

Success is measured in **real gatherings created**, not screen time or fees. `[ALH_PRODUCT_PHILOSOPHY.md]`

## 2. What problem does it solve?

Today every event must be invented and operated from scratch by one overloaded human; the organizer's
own calendar and attention — not demand, ideas, or supply — cap what they can deliver. ActivLife Hub
removes the human as the **operational bottleneck**, so one organizer can run team-sized events.
`[ACTIVLIFE_HUB_CORE_MISSION.md, WHY_ACTIVLIFE_HUB_EXISTS.md]`

Primary user: the **independent / aspiring organizer** seeking to turn organizing into a profession.
Secondary: participants who join, and the vendors/workers the organizer coordinates.
`[MASTER_PRODUCT_DECISIONS.md, GLOBAL_PRODUCT_SPECIFICATION.md]`

## 3. The central object: the Project

**The Project is the single durable Root Entity** — the one thing that *is* the event end to end.
Everything *realized* (budget, vendor commitments, proposals, payments, participants, files, history,
the execution record) belongs permanently to the Project; the Plan owns only *scope + estimate*.
`[ADR_003_ENTITY_OWNERSHIP.md, CURRENT_ARCHITECTURE.md]`

Two principles define the Project:
- **Project as Place** — a Project is "not a database record, not a page, not a collection of modules"; it
  is a **permanent digital place with one stable address**. Every role enters the *same place*;
  permissions create different *views*, not different systems. `[PROJECT_AS_PLACE_PRINCIPLE.md]`
- **Project State Model** — **every meaningful action changes the state of exactly one Project**; the
  Project is the platform's **single integration point**. Workspace, Event Home, Public Space, Commercial
  Proposal, Registration, and Payments are **projections of the same Project**. `[PROJECT_STATE_MODEL_PRINCIPLE.md]`

The organizer never sees the entity names — they see "their event" and "the date" (invisible
architecture). `[ALH_PRODUCT_PHILOSOPHY.md, CURRENT_ARCHITECTURE.md]`

> **One caveat the canon requires every engineer to hold:** the name "Project" denotes **two distinct
> things** in code — the live durable root row (`projects`, migration 041, `lib/projects/store.ts`) and a
> dormant in-memory work-breakdown `Project` (`lib/project/assembly.ts`, never persisted). This document
> means the **live root** unless stated otherwise. `[ARCHITECTURE_CONSOLIDATION_AUDIT.md §E]` `[code]`

## 4. The major domains (only those that exist)

| Domain | Code | Status |
|---|---|---|
| **AI Discovery** — develops and locks "What Should Happen" (WSH) → a Future Event Description | `lib/ai`, `lib/ope` discovery helpers; dormant OPE-V2 Discovery in `lib/discovery` | **Live** (idea-first planner); a second, dormant Discovery exists in OPE V2 |
| **Planning Engine V2** — deterministic FED → EventPlanV2 (intention-first, no LLM, no category template) | `lib/planning` | **Live & authoritative** |
| **Project (root)** — the durable engagement; owner, status, current step, publish flag | `lib/projects/store.ts` (041) | **Live** (thin) |
| **Budget** — prices the plan's scope (lines, vendor quotes, organizer fee, derived totals) | `lib/budget` (042/043) | **Live** |
| **Commercial Proposal** — a projection of the Project + an immutable issued snapshot | `lib/budget/commercial-proposal-projection.ts`, `lib/budget/store.ts` (042) | **Live** |
| **Public Space** — read-only public projection of a published Project | `lib/planning/public-event-projection.ts`, `app/[locale]/p/[projectId]` (046) | **Live** |
| **Occurrence** — concrete dated instances of a Project | `occurrences` table (046); reads only in `lib/projects/store.ts` | **Table only — authoring not built** |
| **Organizer Workspace** — the organizer's live view of Project state | `lib/organizer-workspace` (dormant; Foundation subset of OPE-V2 Module 4) | **Foundation only, dormant** |
| **Marketplace (legacy Event flow)** — activities → customer_requests → proposals → bookings → payments | `lib/actions/{activities,requests,bookingPayments,invoices}`, `lib/actions/opePlans.ts` | **Live, revenue-bearing, runs in parallel** |
| **Execution / Completion / Closure** | — | **Not built** (OPE-V2 Modules 6–8 unbuilt) |

`[CURRENT_ARCHITECTURE.md, PROJECT_STATUS.md, FEATURE_MATRIX.md, OPE_V2_MODULE_STATUS.md]` `[code]`

## 5. How information flows (the real flow)

```
   Client idea
     │
     ▼
   AI Discovery ───────────────────────── develops + locks "What Should Happen"
     │
     ▼
   Future Event Description (domain FED)   lib/domain/future-event-description.ts
     │
     ▼
   Planning Engine V2 ──────────────────── deterministic, LLM-free          [AUTHORITY]
     │
     ▼
   EventPlanV2  (persisted: project_event_plans_v2 / 047)                    [AUTHORITY]
     │  produced against ↓
     ▼
   Project (root row: projects / 041)      thin: owner · status · current_step · is_published
     ├─────────────▶ Budget (042/043) ← lines derived from EventPlanV2
     │                   └────────────▶ Commercial Proposal
     │                                    • live projection (EventPlanV2 + Budget)
     │                                    • immutable snapshot (issued)
     ├─────────────▶ Public Space (046) ← EventPlanV2 public-safe subset   /p/[projectId]
     │                   └────────────▶ Occurrence (046)  [TABLE ONLY]
     │                                    └─▶ Registration  [NOT BUILT] ─▶ Payment [NOT BUILT]
     └─────────────▶ Organizer Workspace (dormant; reads the lib/project domain, not this root)

   Parallel / not on this spine:
     • Legacy Marketplace flow (activities/requests/proposals/bookings) — live, revenue-bearing
     • OPE V2 (Discovery FED → IR → assembled Project → Workspace) — fully dormant, zero prod callers
     • Execution / Completion / Closure — not built
```
`[CURRENT_ARCHITECTURE.md §1, PLANNING_LAYER_MIGRATION_ROADMAP.md, IMPLEMENTATION_CONTRACT.md]` `[code: lib/actions/planner.ts, lib/planning/*, lib/budget/*]`

> The arrow `EventPlanV2 → Project` is, in the live system, only "persist EventPlanV2 against a thin
> Project row + derive Budget/projections." The richer `EventPlanV2 → structured Project (work breakdown /
> execution)` transformation is **not wired** (see §10). `[ARCHITECTURE_CONSOLIDATION_AUDIT.md §E]`

## 6. Per-stage contract (Input · Output · Owner · Persistence · Authority)

| Stage | Input | Output | Owner | Persistence | Authority |
|---|---|---|---|---|---|
| **AI Discovery** | Client idea + conversation | Locked WSH / Future Event Description | Discovery | Not separately persisted in the live path (the FED is constructed in-flight) `[code]` | The organizer approves the WSH (human) `[ADR_006, CREATIVE_ENGINE_AXIOMS]` |
| **Future Event Description (FED)** | Approved WSH + details + location | Neutral domain FED | Discovery (producer) | In-flight (live path); the dormant Discovery FED is versioned/locked `[code: lib/domain vs lib/discovery]` | The FED is the Discovery→Planning hand-off contract `[OPE_MODULAR_PIPELINE_PRINCIPLE.md, OPE_V2_IMPLEMENTATION_SPEC.md]` |
| **Planning Engine V2** | domain FED | EventPlanV2 | `lib/planning` | — (pure function) | Deterministic engine; its `feasibility.verdict` gates plan-readiness `[PLANNING_LAYER_MIGRATION_ROADMAP.md]` `[code]` |
| **EventPlanV2** | (engine output) | Experience design, itinerary, logistics, resources, staffing, safety, contingencies, cost estimate, feasibility | the Project | `project_event_plans_v2` (047), keyed by (project, version) | **Source of Truth for the planning representation** (post authority-flip) `[PLANNING_LAYER_MIGRATION_ROADMAP.md]` `[code]` |
| **Project (root)** | created/resolved at plan time | The durable engagement | the Project itself | `projects` (041); RLS owner-only + public-read when published | **Source of Truth for everything realized** `[ADR_003, ADR_004]` |
| **Budget** | EventPlanV2 (resources→resource_need, staffing→role_need) + vendor quotes + organizer fee | Budget lines, selected quotes, derived totals | the Project | `budgets`, `budget_lines`, `budget_vendor_quotes` (042); `project_delivery_components` (043, now bypassed) | Pricing SoT = the Budget; **totals are derived, never stored** `[ADR_004, BUDGET_COSTING_MODEL_ALIGNMENT.md, CONFIRMED_COMMITTED_CONTRACT.md]` |
| **Commercial Proposal** | EventPlanV2 + Budget | (a) live projection; (b) immutable issued snapshot | the Project | `commercial_proposals` (042), INSERT-only, versioned | The **sent snapshot is immutable** and becomes its own SoT `[ADR_004]` `[code: lib/budget/store.ts]` |
| **Public Space** | published Project + EventPlanV2 public-safe subset + future Occurrences | Read-only public page | the Project (projection) | none (projection); gated on `projects.is_published` (046) | Owner-only idempotent publish `[ADR_008_PUBLISH_FLOW.md, PROJECT_PUBLIC_SPACE_SPEC.md]` |
| **Occurrence** | (authoring) | Concrete dated instance: date, capacity, price, status | the Project | `occurrences` (046) — **reads only; no authoring path** | `[OCCURRENCE_SPEC.md]` (model); authoring **not built** `[code]` |
| **Registration** | Occurrence + participant | Per-instance sign-up | the Occurrence → Project | **Not built** | `[OCCURRENCE_SPEC.md]` (intended); **Architecture: not built** |
| **Payment** | Registration | Payment record | the Registration | **Not built** (pipeline payment); Stripe infra reused | `[ADR_006]` (human-authorized); **not built** |
| **Organizer Workspace** | assembled Project (dormant domain) | Mutable overlay on an immutable Project snapshot; one Go/No-Go gate | the Project | Logical/in-memory only (Foundation) | Verify-don't-trust at open; AI never authorizes a commitment `[OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md (HISTORICAL), ADR_006]` `[code: dormant]` |
| **Execution / Completion** | — | — | — | — | **Architecture not currently defined as a built system** (OPE-V2 M6–M8 specs exist but are HISTORICAL/dormant) |

## 7. What is authoritative (source of truth)

Per the one-writer-per-fact rule `[ADR_004_SOURCE_OF_TRUTH.md]`:

- **Discovery / WSH** — authoritative at the moment the organizer **approves** it (human authority); the
  approved WSH *is* the FED. `[ADR_006, CREATIVE_ENGINE_AXIOMS]`
- **FED** — the authoritative Discovery→Planning hand-off; Planning Engine V2 does not re-discover intent.
  `[OPE_MODULAR_PIPELINE_PRINCIPLE.md]`
- **Planning Engine V2** — the authoritative *producer* of the plan; deterministic (same FED → same plan).
  `[PLANNING_LAYER_MIGRATION_ROADMAP.md]`
- **EventPlanV2** — **the authoritative planning representation** (scope/experience), after the Stage-5f
  authority flip; its `feasibility.verdict` gates plan-readiness and billing in the live planner.
  `[PLANNING_LAYER_MIGRATION_ROADMAP.md]` `[code: lib/actions/planner.ts]`
- **Project (root)** — **the authoritative owner of everything realized**; the single integration point.
  `[ADR_003, PROJECT_STATE_MODEL_PRINCIPLE.md]`
- **Budget** — authoritative for **pricing** (lines + the one selected quote per line); totals are derived.
  `[ADR_004, CONFIRMED_COMMITTED_CONTRACT.md]`
- **Commercial Proposal** — the **issued snapshot** is authoritative for that issued artifact (immutable);
  the live proposal is a non-authoritative projection. `[ADR_004]`
- **Workspace** — authoritative for the organizer's working **overlay** (status edits), distinct from the
  immutable Project snapshot it opens on. `[OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md (HISTORICAL)]` `[code: dormant]`
- **Execution** — **Architecture not currently defined** (not built).

> Note on a documented tension: `ADR_003/004` and `CURRENT_ARCHITECTURE.md` still phrase scope authority as
> "the Plan" (legacy `ope_plans`); the Planning Layer Migration moved that authority to **EventPlanV2**. The
> migration roadmap is the reconciling authority. `[ARCHITECTURE_CONSOLIDATION_AUDIT.md §G]`

## 8. What is derived (projections — never stored as truth)

- **Budget totals** (`projectBaseCost`, `commercialTotal`) — computed on read; never persisted. `[ADR_004]` `[code: lib/budget/totals.ts]`
- **Commercial Proposal (live)** — a projection of EventPlanV2 + Budget; only the *issued* snapshot freezes. `[code: lib/budget/commercial-proposal-projection.ts]`
- **Public Event** — a public-safe projection of EventPlanV2 (omits cost/assumptions/staffing/resources/safety/feasibility). `[PROJECT_PUBLIC_SPACE_SPEC.md]` `[code: lib/planning/public-event-projection.ts]`
- **Project delivery components** (`043`) — defined as a refreshable **projection** of the Plan, not a second source of truth (and, in the live path, currently bypassed in favor of deriving Budget lines directly from EventPlanV2). `[ADR_004]` `[ARCHITECTURE_CONSOLIDATION_AUDIT.md §G]`
- **Analytics / dashboards** — fully derived; recompute on read. `[ADR_004]`
- **Workspace views** — projections of Project state per role/permission. `[PROJECT_STATE_MODEL_PRINCIPLE.md]`
- **The assembled OPE-V2 Project (WorkPackages/IR)** — derived/transient and **not persisted** (dormant). `[code]`

## 9. What is persisted (the database)

Migrations on disk: `001`–`048`. The Project-era + planning tables: `[MIGRATION_STATUS.md]` `[code: supabase/migrations]`

- `projects` (**041**) — the Project root: identity, owner, `status`, `current_step`, `is_published`.
- `budgets`, `budget_lines`, `budget_vendor_quotes`, `commercial_proposals` (**042**) — Budget + immutable proposal snapshots.
- `project_delivery_components` (**043**) — delivery-component projection (now orphaned in the live path).
- `ope_plans` (**026**) + Plan↔Project link/backfill (**044/045**) — the legacy six-section Plan, Project-linked.
- `occurrences` + `projects.is_published` + public-read RLS (**046**) — dated instances + Public Space gating.
- `project_event_plans_v2` (**047**) — the persisted **EventPlanV2** (keyed by project, version).
- `project_planning_domain` (**048**) — the durable planning domain (the recompute source of truth).
- Supporting (live): `event_licenses` (**038**) + `consume_event_license` (**040**); Stripe/subscription, marketplace (`activities`, `customer_requests`, `proposals`, `bookings`, `invoices`), participants, alerts, academy/certification tables.

**Operational caveat (from the audit):** `MIGRATION_STATUS.md` is the authoritative record of *committed
vs. applied* migrations, but it currently stops at 046 and prod-applied state for 043→048 is unverified;
until applied, the Project/EventPlanV2 pipeline is non-functional in production. `[MIGRATION_STATUS.md, ARCHITECTURE_CONSOLIDATION_AUDIT.md §H]`

## 10. Current implementation gaps (only those the audit already identified)

1. **Missing canon file:** `PLANNING_ENGINE_V2_PRODUCT_SPECIFICATION.md` — named authoritative by
   `../IMPLEMENTATION_CONTRACT.md` and cited in `lib/planning/reasoning.ts`/`intention-signals.ts`, but **no
   file exists**. The live engine's governing spec lives only in chat history.
2. **`EventPlanV2 → structured Project` link is unwired** — Requirements/WorkPackages/IR/execution structure
   exist only in the dormant OPE-V2 lineage (zero production callers). Stage 6C built a native `EventPlanV2→IR`
   provider but did **not** register it.
3. **Two "Project" entities** (`projects` root vs. `lib/project` assembly) and **two FED types**
   (`lib/discovery` vs. `lib/domain`) are unreconciled.
4. **Execution, Completion, Closure** — not built (OPE-V2 M6–M8 are HISTORICAL/dormant).
5. **Occurrence authoring, Registration, pipeline Payment** — not built (Occurrence is table-only). This is
   flagged P0 (the pipeline hole).
6. **Project lifecycle is ~90% aspirational** — `ADR_005`'s 13-state machine + freezing/snapshots vs. code
   that writes only `current_step ∈ {planning, plan_ready}`.
7. **Budget recompute drift** — code does a lossy wholesale delete-all + recreate (discarding organizer
   pricing overlays) instead of the contract-mandated *reconcile*; index-derived component ids defeat
   reconcile-by-id.
8. **Doc-vs-code drift:** `CURRENT_ARCHITECTURE`/ADRs phrase scope authority as "the Plan" not EventPlanV2;
   `ROADMAP_V2` ↔ `PLANNING_LAYER_MIGRATION_ROADMAP` disagree on "what's next"; `MIGRATION_STATUS` stale.
9. **Legacy Marketplace flow** runs in parallel, unconverged; `vendor_requests.plan_id`/`invoices.plan_id`
   anchor durable artifacts to the Plan, contradicting `ADR_003/004` (Project-anchoring).

`[ARCHITECTURE_CONSOLIDATION_AUDIT.md §G/§H/§I]` — no new analysis added here.

---

*This is the single architectural description of ActivLife Hub. It consolidates existing, approved
architecture; it introduces none. For the reasoning and full audit, see `ARCHITECTURE_CONSOLIDATION_AUDIT.md`;
for navigation, `README.md`.*

# ActivLife Hub — Architecture Consolidation Audit

> **Status: AUTHORITATIVE (analysis of record).** The completed Architecture Consolidation Audit that
> this `docs/architecture/` hub is built from. Read-only analysis; it changed no code and no other docs.
> Entry point: `README.md` (this directory). Date: 2026-06-29.

## The one thing to understand first

Confusion in this repo comes from **three planning lineages with overlapping names**, only one of which
is the live spine:

| Lineage | Code | Output | Status |
|---|---|---|---|
| **OPE V1** (legacy) | `lib/ope` | six-section **Plan** (`ope_plans`) | **LIVE, revenue-bearing** |
| **OPE V2** (8 modules) | `lib/discovery`→`lib/ope-engine`→`lib/project`→`lib/organizer-workspace` | Discovery FED → **IR** → assembled **Project** | **DORMANT** — M1–M3 built+tested, zero prod callers; M4 foundation only; M5–M8 unbuilt |
| **Planning Engine V2** (active migration) | `lib/planning` | domain FED → **EventPlanV2** (047) | **LIVE & authoritative** for the idea-first planner |

The approved target (`IMPLEMENTATION_CONTRACT`) makes **Planning Engine V2** the spine and retires/absorbs
the other two. The Stage 6.x work, and the Stage 6C native `EventPlanV2→IR` provider, are the experimental
bridge between lineage 3 and lineage 2 — built but **not wired**.

Name collisions: **two "Project" entities** — `projects` (DB 041, `lib/projects/store.ts`, thin live root)
vs. assembled `Project` (`lib/project/assembly.ts`, dormant work-breakdown, never persisted); **two "FED"
types** — Discovery FED (`lib/discovery/types.ts`) vs. domain FED (`lib/domain/future-event-description.ts`).

## A. Architecture Canon

See `README.md §5`. The 13–15 authoritative documents: ALH_PRODUCT_PHILOSOPHY (Constitution),
IMPLEMENTATION_CONTRACT, ACTIVLIFE_HUB_CORE_MISSION, GLOBAL_PRODUCT_SPECIFICATION, CURRENT_ARCHITECTURE,
ADR_003–008, PROJECT_AS_PLACE_PRINCIPLE, PROJECT_STATE_MODEL_PRINCIPLE, PLANNING_LAYER_MIGRATION_ROADMAP,
CREATIVE_ENGINE_AXIOMS + OPE_REQUEST_INTERPRETATION_PRINCIPLE.

## B. Architecture map

```
            ALH_PRODUCT_PHILOSOPHY (Constitution) — governs everything
   ── LIVE pipeline (idea-first planner) ─────────────────────────────────────
   Client idea → AI Discovery → domain FED (lib/domain)
     → Planning Engine V2 (lib/planning) ──AUTHORITY──▶ EventPlanV2 (047)
        persisted against Project root (projects/041, lib/projects/store)  [thin]
          ├─▶ Budget (042) ← EventPlanV2 resources/staffing  (lib/budget)
          │     └─▶ Commercial Proposal (projection + immutable snapshot)
          ├─▶ Public Space (046) ← EventPlanV2 public-safe subset  /p/[id]
          └─▶ Occurrence (046) [TABLE ONLY] → Registration → Payment  [NOT BUILT]
   ── DORMANT pipeline (OPE V2, zero prod callers) ───────────────────────────
   Discovery FED (lib/discovery) → OPE Engine (lib/ope-engine) → IR
        → Project Assembly (lib/project) → WorkPackages/deps/timeline
        → Project Workspace overlay (lib/organizer-workspace, foundation only)
     [frozen-engine-adapter wraps legacy V1; Stage 6C native EventPlanV2→IR provider — UNWIRED]
   ── LEGACY pipeline (live & revenue-bearing) ───────────────────────────────
   Structured/saved planner (lib/actions/opePlans, lib/ope generatePlan)
   Marketplace: activities → customer_requests → proposals → bookings → payments/invoices
```

**Authoritative:** EventPlanV2; the `projects` row; Budget lines + selected quotes; immutable
proposal/invoice/payment snapshots. **Derived:** Budget totals; proposal/public projections; analytics.
**Transient:** legacy six-section Plan; dormant IR/assembled Project; workspace overlay. **Persisted:**
041 projects, 042 budget, 043 delivery-components (now orphaned), `ope_plans` (legacy), 046
occurrences/`is_published`, 047 `project_event_plans_v2`, 048 `project_planning_domain`.

## C. Product lifecycle

An AI OS for independent organizers: AI does the work, the human directs. Three paid loops (Activity
Planner, Academy+Certification, Organizer Platform). Success = real gatherings created.

## D. Project lifecycle

**Intended (ADR_005 / PROJECT_AS_PLACE):** Idea → Discovery → Planning → Budgeting → Proposal → Approved →
Ready → Open → Registration Closed → In Progress → Completed → Closed → Archived (+ Cancelled/On
Hold/Reopened), with progressive freezing + immutable snapshots; re-plan = a Plan-version change inside
the Project, never a reset. **Actual (code):** `projects.current_step ∈ {discovery, description, planning,
plan_ready}` and **only `planning`/`plan_ready` are ever written** — the rich lifecycle is ~90% aspirational.

## E. Project assembly pipeline (how a Project emerges)

**Intended (OPE V2 specs):** Requirements ← OPE Engine (Module 2) from the FED; ResourceNeeds/RoleNeeds/
Risks/Timeline/Dependencies/CostEstimate ← the IR (Module 2); WorkPackages (1/Requirement) + dependency
graph + sequenced timeline ← Project Assembly (Module 3); execution state ← Workspace overlay (Module 4) +
Execution (Module 6). **Actual:** a thin Project owner record + persisted EventPlanV2 + Budget derived from
EventPlanV2; **no Requirements/WorkPackages/IR/execution in the live path** — those exist only in the
dormant OPE-V2 lineage. **The `EventPlanV2 → structured Project` link does not exist in production;**
Stage 6C prototyped it (unwired). Execution & Completion are unbuilt.

## F. Authority hierarchy

1. ALH_PRODUCT_PHILOSOPHY (Constitution). 2. IMPLEMENTATION_CONTRACT (implementation governance; "docs
define, implementation follows; if they differ, implementation is wrong"). 3. Mission/principles. 4.
CURRENT_ARCHITECTURE + ADR_003–008. 5. Plans/state docs (roadmaps, PROJECT_STATUS, FEATURE_MATRIX,
MIGRATION_STATUS, MASTER_PRODUCT_DECISIONS). 6. Supporting / Historical. Resolution rule: most conflicts
are **status docs lagging the code** (doc drift), with two real code-drift exceptions in §H.

## G. Document contradictions

1. **Two "next steps":** `ROADMAP_V2.md` says next = apply migrations + Occurrence authoring; the team is
   actually executing the unlisted Planning Layer Migration (EventPlanV2). → ROADMAP_V2 partially obsolete.
2. **OPE V2 "frozen/production-ready" vs "dormant/superseded"** (OPE_V2_MODULE_STATUS/CLOSURE_REPORT vs
   CURRENT_ARCHITECTURE/PROJECT_STATUS); status doc also internally wrong (M3 "not started" though built).
3. **Budget source flip:** contracts say lines come from the `043` delivery components; code derives them
   straight from EventPlanV2 (the `043` mirror exists but is unused).
4. **ADRs vs migration:** ADR_003/004 + CURRENT_ARCHITECTURE define scope around "the Plan" (`ope_plans`)
   and never mention EventPlanV2, now the scope authority. No ADR records the transition.
5. **MIGRATION_STATUS stale** (stops at 046; code is at 048).
6. **Pricing inconsistency** (public page $29/mo vs $19.99/mo decision).
7. **Ticket Seller** model bypasses Discovery/FED/Project — flagged for reconciliation.

## H. Architecture vs implementation differences

**Doc lags code (update the doc):** PLANNING_LAYER_MIGRATION_ROADMAP status shows "Stage 5c next" but code
is at Stage 6 (authority flip done; planner decoupled; native provider built); the Stage 6 sub-stages
(6.0/6A/6B/6C) are undocumented; `lib/planning/planning-engine-v2.ts` header still says "wired to nothing"
(false); OPE_V2_MODULE_STATUS calls M3 "not started" (built).

**Code drifted from a decision (fix the code):** **Budget recompute is a lossy wholesale delete-all +
recreate**, discarding organizer pricing overlays on every replan — contradicting the contract-mandated
*reconcile*; index-derived `SourceComponentRef` ids defeat reconcile-by-id.

**Built-but-dormant:** OPE V2 M1–M3, frozen-engine-adapter, Stage 6C native bridge, Budget↔Plan delivery
mirroring. **Aspirational:** ADR_005 lifecycle + freezing; ADR_006 gates; Occurrence authoring (P0);
Registration; pipeline Payment; Workspace beyond foundation; Execution/Completion/Closure; marketplace M5.

## I. Missing architecture documentation

1. **`PLANNING_ENGINE_V2_PRODUCT_SPECIFICATION.md`** — named authoritative + cited in code, **no file**.
   Highest-priority gap. 2. EventPlanV2 ↔ Project Assembly bridge contract. 3. Unified Project-entity
   definition reconciling the two "Project"s and two FEDs. 4. Execution & Completion model. 5. Budget
   derivation from EventPlanV2. 6. An updated CURRENT_ARCHITECTURE naming EventPlanV2 as scope authority.

## J. Documentation cleanup recommendations

- **Create:** the missing Planning Engine V2 spec; an EventPlanV2→Assembly contract; a Project-entity
  reconciliation note. **Merge:** ROADMAP_V2 + PLANNING_LAYER_MIGRATION_ROADMAP; the Budget contracts.
- **Update (de-drift):** CURRENT_ARCHITECTURE, MIGRATION_STATUS, the planning-engine header, OPE_V2_MODULE_STATUS.
- **Reclassify HISTORICAL** (banners, keep in place): the OPE V2 cluster, WORKSPACE_EVOLUTION_PLAN,
  engineering-benchmark research, point-in-time audits, legacy roadmaps. **Index** under `docs/architecture/`
  and `docs/archive/`. **Note:** physical relocation is blocked by code-comment path references + dense
  `DOCUMENTATION_INDEX` links under a "no code" constraint — hence index-in-place.

## K. Recommended reading order

See `README.md §4`.

## Success-criteria answers

- **What is ALH?** An AI OS that lets one independent organizer run team-sized activities — AI does the
  operational work, the human directs.
- **Problem?** The organizer's own time/attention is the bottleneck on how many real gatherings exist; ALH
  removes it.
- **Why Project-centric?** It is the single durable thing that *is* the event; every surface is a projection.
- **Discovery?** AI-led conversation develops + locks "What Should Happen" → a Future Event Description.
- **FED creation?** Discovery produces it; the live path uses the neutral `lib/domain` FED for Planning Engine V2.
- **Planning Engine transform?** `lib/planning` deterministically maps FED → EventPlanV2 (intention-first, no LLM, no category template).
- **EventPlanV2 → Project?** Today: persisted against a thin Project record; Budget/Proposal/Public projected from it. Structured assembly is specified but dormant/unwired — the open frontier.
- **Project to completion?** Intended = ADR_005 lifecycle with freezing/snapshots; actual = only
  `planning → plan_ready`; Occurrence/Registration/Payment/Execution/Completion not built.

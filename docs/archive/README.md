# ActivLife Hub — Documentation Archive (HISTORICAL)

> **Status: AUTHORITATIVE (archive index).** Classifies every document considered **HISTORICAL** —
> point-in-time snapshots, superseded plans, dormant/superseded architectures, and research benchmarks.
> **Nothing is deleted.** Per the Architecture Canon Cleanup, files are **kept in their original
> `docs/` location** rather than physically relocated, because moving them would break (a) `docs/X.md`
> path references in code comments (the cleanup is forbidden to touch code) and (b) the dense links in
> `../DOCUMENTATION_INDEX.md` and other docs. This index *is* the archive. Entry point:
> `../architecture/README.md`. Authoritative/current docs are indexed there, not here.
>
> **`[code-ref]`** = the file is referenced by code comments and therefore **must not be moved**
> (moving would create dangling references the cleanup may not fix).

---

## Why these are HISTORICAL

They are kept for the record but are **not** the current architecture. A reader should treat them as
history: superseded by the Project-centric pipeline (`../CURRENT_ARCHITECTURE.md`) and the Planning Layer
Migration (`../PLANNING_LAYER_MIGRATION_ROADMAP.md`). When in doubt, the canon in
`../architecture/README.md §5` wins.

## 1. OPE V2 — 8-module engine (dormant; partially superseded)

Built-but-dormant (Modules 1–3 have code with zero production callers; M4 foundation only; M5–M8 unbuilt).
Superseded in direction by Planning Engine V2 + the live `lib/projects` root. See the audit §3.

- `../OPE_V2_IMPLEMENTATION_SPEC.md` **[code-ref]** — Module 1 Discovery spec.
- `../OPE_V2_MODULE2_IMPLEMENTATION_SPEC.md` **[code-ref]** — OPE Engine / IR spec.
- `../OPE_V2_MODULE3_IMPLEMENTATION_SPEC.md` **[code-ref]** — Project Assembly spec.
- `../OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md` **[code-ref]** — Project Workspace spec (module unbuilt).
- `../OPE_V2_MODULE_STATUS.md` — status map (self-flagged superseded; internally stale).
- `../OPE_V2_ARCHITECTURE_CLOSURE_REPORT.md` — "frozen/final" closure overridden by the later pivot.
- `../OPE_MODULAR_PIPELINE_PRINCIPLE.md` **[code-ref]** — modular-pipeline principle (literal pipeline dormant).
- `../MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md` — agent split not implemented.
- `../PHASE0_CONTRACT_DECISIONS.md` **[code-ref]** — contract freeze for unbuilt M4–M8.
- `../OPE_CORE_V2_CHANGE_PLAN.md` — spent documentation-migration plan.

## 2. OPE V1 — historical reports, audits & plans

The OPE V1 engine (`lib/ope`) is **live**; its *authoritative* specs (`OPE_V1_TECHNICAL_DESIGN`,
`OPE_MASTER_SPEC`, `OPE_OUTPUT_CONTRACT_V1`, `OPE_CLARIFICATION_ENGINE`, `OPE_CONCEPT_FUNNEL_V1`,
`OPE_COST_ENGINE_MVP_V1`, `OPE_KNOWLEDGE_MODEL`, `OPE_EVENT_LIFECYCLE`, `ADR_001/002`) stay **in place and
remain authoritative-for-the-engine** (not archived). The following are point-in-time/historical:

- `../OPE_GAP_ANALYSIS.md` **[code-ref]**, `../OPE_GAP_CLOSURE_PLAN.md`, `../OPE_STRESS_TEST.md` **[code-ref]**,
  `../OPE_PATTERN_VALIDATION.md`, `../OPE_PB_FINAL_COVERAGE_REPORT.md`, `../OPE_PB_IMPLEMENTATION_REPORT.md`,
  `../OPE_IMPLEMENTATION_ALIGNMENT_REPORT.md`, `../OPE_IMPLEMENTATION_READY.md` **[code-ref]**,
  `../OPE_FINAL_ARCHITECTURE_REVIEW.md`, `../OPE_V1_BUILD_SEQUENCE.md`,
  `../OPE_M2_IMPLEMENTATION_PLAN.md` **[code-ref]**, `../OPE_M3_IMPLEMENTATION_PLAN.md`,
  `../PLANNER_MVP_AUDIT.md`, `../OPE_WSH_INPUT_BEHAVIOR_REPORT.md`, `../OPE_CLIENT_MODE_COMPATIBILITY_AUDIT.md`.

## 3. Legacy roadmaps & implementation plans (superseded by ROADMAP_V2 / the migration roadmap)

- `../OPE_IMPLEMENTATION_ROADMAP.md`, `../ACTIVITY_PLANNER_IMPLEMENTATION_ROADMAP_V1.md`,
  `../BUDGET_WORKSPACE_IMPLEMENTATION_PLAN.md` **[code-ref]**, `../WORKSPACE_EVOLUTION_PLAN.md` (self-superseded),
  `../M5_ORGANIZER_WORKSPACE_IMPLEMENTATION_PLAN.md`,
  `../EXPERIENCED_ORGANIZER_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md`, `../WP1_PLANSTORE_IMPLEMENTATION_TASKS.md`.

## 4. Point-in-time audits, reports & checkpoints (snapshots)

- `../ALH_PROJECT_CHECKPOINT_2026_06_13.md`, `../IMPLEMENTATION_GAP_AUDIT.md`,
  `../IMPLEMENTATION_GAP_AUDIT_V2.md`, `../ARCHITECTURE_CLOSURE_REPORT.md`,
  `../ARCHITECTURE_CONSISTENCY_AUDIT.md`, `../FINAL_ARCHITECTURE_AUDIT.md`,
  `../CONSISTENCY_REVIEW_2026_06_04.md`, `../M5_COMPLETION_REPORT.md`,
  `../IMPLEMENTATION_SYNC_CHECKLIST.md`, `../PRE_COMMIT_AUDIT.md`,
  `../ONE_TIME_PLANNER_PAYMENT_AUDIT.md`, `../EXPERIENCED_REVIEW_QUEUE_QA.md`,
  `../../PHASE5_QA.md`, `../../STRIPE_CHECKOUT_QA.md`, `../../LANGUAGE_AUDIT.md`.

## 5. Superseded product snapshots & decision-process docs

- `../ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md` (+ `../ACTIVLIFE_HUB_SOURCE_OF_TRUTH_REVIEW.md`) — already
  banner-marked SUPERSEDED; superseded by `../GLOBAL_PRODUCT_SPECIFICATION.md` + `../CURRENT_ARCHITECTURE.md`.
- `../MASTER_DECISIONS_APPLY_PLAN.md`, `../MASTER_DECISIONS_UPDATE_PROPOSAL.md`,
  `../MISSION_PHILOSOPHY_INTEGRATION_PROPOSAL.md` — process docs folded into `../MASTER_PRODUCT_DECISIONS.md`.

## 6. Engineering benchmark research (informed design; not build contracts)

- `../CRM_ENGINEERING.md`, `../ERP_ENGINEERING.md`, `../PROCUREMENT_ENGINEERING.md`,
  `../TASK_MANAGEMENT_ENGINEERING.md`, `../KNOWLEDGE_ENGINEERING.md`, `../AUTOMATION_ENGINEERING.md`,
  `../AI_ENGINEERING.md`, `../EVENT_MANAGEMENT_ENGINEERING.md`, `../FINAL_ENGINEERING_RECOMMENDATIONS.md`,
  `../ARCHITECTURAL_IDEA_CATALOG.md`, `../COGNITIVE_MODEL_OF_A_WORLD_CLASS_EVENT_ORGANIZER.md`,
  `../REAL_ORGANIZER_DECISION_MODEL.md`, `../PROJECT_MANAGEMENT_EVOLUTION.md`.

---

*Not archived here (kept as SUPPORTING/reference in `docs/`): Academy/certification content
(`MODULE_*`, `CERTIFIED_ORGANIZER_*`, `ORGANIZER_*`), knowledge bases (`WEDDING_*`, `OPE_KB_*`), website
/ marketing / trust docs, and the resource/vendor/worker network docs. See `../DOCUMENTATION_INDEX.md`
clusters 8–11 for those. Anything not listed as authoritative/current in `../architecture/README.md`
should be treated as supporting or historical.*

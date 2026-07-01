# ActivLife Hub — Documentation Index

> **▶ START HERE — the authoritative product definition is [`ACTIVLIFE_HUB_PRODUCT_CANON.md`](ACTIVLIFE_HUB_PRODUCT_CANON.md).**
> Read it first. If any product document contradicts the Product Canon, the Product Canon is authoritative.
> For the architecture (HOW) see [`architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md);
> for navigation see [`architecture/README.md`](architecture/README.md). HISTORICAL documents are classified
> in [`archive/README.md`](archive/README.md) (kept in place — nothing deleted). This index below remains the
> **full map** of every document by cluster.

> **Status: The single entry point to all documentation.** ~170 documents exist across several eras.
> This index groups them by cluster with **purpose**, **authority level**, and **current status** so a new
> developer can navigate without reading everything. **Nothing is deleted.** Authority levels:
> **CONSTITUTION** > **AUTHORITATIVE** > **SUPPORTING** > **HISTORICAL** (point-in-time, kept for record).
>
> **Read in this order to onboard:** `ACTIVLIFE_HUB_PRODUCT_CANON.md` → `architecture/SYSTEM_ARCHITECTURE.md`
> → `IMPLEMENTATION_CONTRACT.md`. Everything else below is **supporting documentation** (additional detail,
> history, or implementation guidance).

---

## 0. Top-level recovery documents (start here)

| Document | Purpose | Authority |
|---|---|---|
| `GLOBAL_PRODUCT_SPECIFICATION.md` | What ALH is, end to end | **AUTHORITATIVE** |
| `DOCUMENTATION_INDEX.md` (this) | Map of all docs | **AUTHORITATIVE** |
| `CURRENT_ARCHITECTURE.md` | The one current architecture | **AUTHORITATIVE** |
| `PROJECT_STATUS.md` | What's built / partial / not / deprecated | **AUTHORITATIVE** |
| `FEATURE_MATRIX.md` | Feature × status × priority × deps | **AUTHORITATIVE** |
| `ROADMAP_V2.md` | Current implementation roadmap | **AUTHORITATIVE** |
| `IMPLEMENTATION_ROADMAP.md` | Living implementation progress tracker (Discovery → FED → Planning → …) | **LIVING (progress)** |
| `ADR_INDEX.md` | Every architecture decision record (003–008 = Project-centric) | **AUTHORITATIVE** |
| `MIGRATION_STATUS.md` | Committed vs. applied migrations + verification | **AUTHORITATIVE (ops)** |
| `MASTER_PRODUCT_DECISIONS.md` | Decisions log + source-of-truth index | **AUTHORITATIVE** |
| `ENGINEERING_PROCESS.md` | Mandatory engineering process rules (context review, docs-win, decisions) | **MANDATORY (process)** |

## 1. Constitution & product philosophy

*Purpose:* WHY ALH exists and the principles every feature must follow. *Status:* current.

- `ALH_PRODUCT_PHILOSOPHY.md` — **CONSTITUTION** (supreme; wins on conflict).
- `CONVERSATION_FIRST_PRINCIPLE.md` — **AUTHORITATIVE** (conversation vs. screens).
- `AI_PROJECT_MODELING_PRINCIPLE.md` — **AUTHORITATIVE** (ALH builds an executable project model, not text/checklists).
- `OPE_REQUEST_INTERPRETATION_PRINCIPLE.md`, `ENTERPRISE_POSITIONING_PRINCIPLE.md`,
  `ORGANIZER_OPERATING_SYSTEM_PRINCIPLE.md` — **AUTHORITATIVE** principles.
- `ACTIVLIFE_HUB_CORE_MISSION.md` — **AUTHORITATIVE** (precursor; sits under the Constitution).
- `WHY_ACTIVLIFE_HUB_EXISTS.md`, `ACTIVLIFEHUB_ORGANIZER_PHILOSOPHY_V1.md`,
  `MISSION_PHILOSOPHY_INTEGRATION_PROPOSAL.md` — **SUPPORTING** (older mission framing; partly superseded).

## 1b. Product Principles

*Purpose:* long-lived product requirements (not architecture, not implementation) that guide future
development. *Status:* current. Home: `PRODUCT_PRINCIPLES_INDEX.md`.

- `PRODUCT_PRINCIPLES_INDEX.md` — **AUTHORITATIVE** (index of Product Principles).
- `AI_PROJECT_MODELING_PRINCIPLE.md` — **AUTHORITATIVE** (ALH builds an executable project model, not text/checklists).
- `PROFESSIONAL_BASELINE_PRINCIPLE.md` — **AUTHORITATIVE** (complete professional operational baseline; AI on top of it, not instead).
- `FUTURE_PRODUCT_CAPABILITIES.md` — **LIVING** (accepted-but-deferred product capabilities; not a roadmap/backlog).
- `DISCOVERY_PRODUCT_BEHAVIOR_SPEC.md` — **AUTHORITATIVE** (canonical Discovery behavior spec; observable behavior only, per Engineering Process Rule 9).

## 2. Source-of-truth / master decisions

- `MASTER_PRODUCT_DECISIONS.md` — **AUTHORITATIVE** decisions log + index.
- `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md` (+ `_REVIEW`) — **SUPPORTING/HISTORICAL** (V1 product snapshot, 2026-06-10).
- `MASTER_DECISIONS_APPLY_PLAN.md`, `MASTER_DECISIONS_UPDATE_PROPOSAL.md` — **SUPPORTING** (process).
- `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`, `BUSINESS_MODEL_AND_MONETIZATION.md` — **SUPPORTING**.

## 3. Project-centric architecture (current era)

- `CURRENT_ARCHITECTURE.md`, `OCCURRENCE_SPEC.md`, `PROJECT_PUBLIC_SPACE_SPEC.md` — **AUTHORITATIVE**.
- **Architecture Decision Records (`ADR_INDEX.md`):** the foundational decisions of this era are now fully
  on disk — `ADR_003_ENTITY_OWNERSHIP`, `ADR_004_SOURCE_OF_TRUTH`, `ADR_005_LIFECYCLE_STATE_MACHINE`,
  `ADR_006_TRANSITION_AUTHORITY`, `ADR_007_BUSINESS_OPERATIONS`, `ADR_008_PUBLISH_FLOW` — **AUTHORITATIVE**.
- **`MIGRATION_STATUS.md`** — committed vs. applied migrations + verification procedure — **AUTHORITATIVE (operational)**.

## 4. OPE V1 (deployed engine)

*Purpose:* the deterministic planning engine that is live (`lib/ope`). *Status:* live; many docs historical.

- **AUTHORITATIVE for the engine:** `OPE_V1_TECHNICAL_DESIGN.md`, `OPE_MASTER_SPEC.md`, `OPE_OUTPUT_CONTRACT_V1.md`,
  `OPE_CLARIFICATION_ENGINE.md`, `OPE_CONCEPT_FUNNEL_V1.md`, `OPE_COST_ENGINE_MVP_V1.md`, `OPE_KNOWLEDGE_MODEL.md`,
  `OPE_EVENT_LIFECYCLE.md`, `ADR_001_*`, `ADR_002_*`.
- **SUPPORTING:** `OPE_CORE_MVP_V1`, `OPE_PATTERN_*`, `OPE_AI_*`, `OPE_DISCOVERY_ENGINE_PRINCIPLES_V1`,
  `OPE_PLANNING_WORKFLOW`, `OPE_SOURCING_ENGINE`, `OPE_ACTIVITY_TAXONOMY`, `OPE_UNIVERSAL_ACTIVITY_ARCHITECTURE_V1`.
- **HISTORICAL (audits/reports/plans):** `OPE_GAP_ANALYSIS`, `OPE_GAP_CLOSURE_PLAN`, `OPE_PB_*`,
  `OPE_IMPLEMENTATION_*`, `OPE_FINAL_ARCHITECTURE_REVIEW`, `OPE_STRESS_TEST`, `OPE_PATTERN_VALIDATION`,
  `OPE_V1_BUILD_SEQUENCE`, `OPE_M2/M3_IMPLEMENTATION_PLAN`, `PLANNER_MVP_AUDIT`, `OPE_WSH_INPUT_BEHAVIOR_REPORT`.

## 5. OPE V2 (frozen architecture; code dormant)

*Purpose:* an 8-module engine. *Status:* **PARTIALLY SUPERSEDED** by the Project-centric pivot; code uncommitted.

- `OPE_V2_IMPLEMENTATION_SPEC`, `OPE_V2_MODULE2/3/4_IMPLEMENTATION_SPEC`, `OPE_V2_MODULE_STATUS`,
  `OPE_V2_ARCHITECTURE_CLOSURE_REPORT`, `OPE_MODULAR_PIPELINE_PRINCIPLE`, `MULTI_AGENT_ARCHITECTURE_PRINCIPLE`,
  `WORKSPACE_EVOLUTION_PLAN`, `PHASE0_CONTRACT_DECISIONS`, `OPE_CORE_V2_CHANGE_PLAN` — **SUPPORTING/AMBIGUOUS**.

## 6. Budget & event finance

- `BUDGET_WORKSPACE_V1_DESIGN`, `BUDGET_INPUT_CONTRACT`, `BUDGET_COSTING_MODEL_ALIGNMENT`,
  `CONFIRMED_COMMITTED_CONTRACT`, `VENDOR_QUOTE_MARKETPLACE_CONTRACT`, `BUDGET_WORKSPACE_IMPLEMENTATION_PLAN`
  — **SUPPORTING** (needs Constitution reconciliation).
- `PROBLEM_DEFINITION_EVENT_FINANCE`, `EVENT_FINANCIAL_OBSERVATIONS`, `ESTIMATE_BUILDING_OBSERVATIONS` — **SUPPORTING** (research).

## 7. Engineering benchmark (research; now historical)

`CRM/ERP/PROCUREMENT/TASK_MANAGEMENT/KNOWLEDGE/AUTOMATION/AI/EVENT_MANAGEMENT_ENGINEERING`,
`FINAL_ENGINEERING_RECOMMENDATIONS`, `ARCHITECTURAL_IDEA_CATALOG`,
`COGNITIVE_MODEL_OF_A_WORLD_CLASS_EVENT_ORGANIZER`, `REAL_ORGANIZER_DECISION_MODEL`,
`PROJECT_MANAGEMENT_EVOLUTION` — **HISTORICAL research** (per `WORKSPACE_EVOLUTION_PLAN`).

## 8. Academy / certification / training

`MODULE_1..12_CONTENT_V1` (+ `FINAL`/`REVIEW`), `CERTIFIED_ORGANIZER_*`, `CERTIFICATION_EXAM_*`,
`VERIFIED_ORGANIZER_EXAM_*`, `ORGANIZER_ACADEMY_*`, `ORGANIZER_LEARNING/GROWTH/CAREER_*`,
`ACTIVLIFE_HUB_ORGANIZER_COMPETENCIES/FOUNDATION_V1`, `ORGANIZER_COMPETENCY_REQUEST_TO_OPE`,
`UOP_UNIVERSAL_ORGANIZER_PRINCIPLES_V1`/`V1_1`, `ACADEMY_*` audits — **SUPPORTING** (academy content; contains versioned duplicates).

## 9. Resource / vendor / worker networks

`RESOURCE_MARKET_ARCHITECTURE`, `VENDOR_NETWORK_ARCHITECTURE`, `WORKER_NETWORK_ARCHITECTURE` (+ `_REVIEW`),
`OPE_SOURCING_ENGINE`, `EVENT_REQUEST_MARKET_ARCHITECTURE` — **SUPPORTING** (sourcing/M5).

## 10. Website / marketing / trust

`WEBSITE_*`, `HOMEPAGE_CONTENT_V2`, `ORGANIZER_MARKETING_AUTOMATION_V1`, `MARKETPLACE_TRUST_MVP`,
`TRUST_AND_VERIFICATION_ARCHITECTURE`, `DISCOVERY_FEED_AND_SCALE_READINESS_SPEC_V1` — **SUPPORTING** (some partially implemented).

## 11. Knowledge bases (domain data)

`WEDDING_KNOWLEDGE_BASE_V1`, `WEDDING_PRICING_REFERENCE_V1`, `OPE_KB_BIRTHDAY_*`,
`OPE_KNOWLEDGE_FOOD_SAFETY_LOGISTICS_V1` — **SUPPORTING** (reference data).

## 12. Point-in-time audits / reports / checkpoints

`ALH_PROJECT_CHECKPOINT_2026_06_13`, `IMPLEMENTATION_GAP_AUDIT`(+`_V2`), `ARCHITECTURE_CLOSURE_REPORT`,
`ARCHITECTURE_CONSISTENCY_AUDIT`, `FINAL_ARCHITECTURE_AUDIT`, `CONSISTENCY_REVIEW_2026_06_04`,
`M5_COMPLETION_REPORT`, `IMPLEMENTATION_SYNC_CHECKLIST`, `PRE_COMMIT_AUDIT`, `*_QA`,
`ONE_TIME_PLANNER_PAYMENT_AUDIT`, `EXPERIENCED_REVIEW_QUEUE_QA` — **HISTORICAL** (snapshots; keep for record).

## 13. Roadmaps / plans (legacy)

`OPE_IMPLEMENTATION_ROADMAP`, `ACTIVITY_PLANNER_IMPLEMENTATION_ROADMAP_V1`,
`BUDGET_WORKSPACE_IMPLEMENTATION_PLAN`, `WORKSPACE_EVOLUTION_PLAN`,
`M5_ORGANIZER_WORKSPACE_IMPLEMENTATION_PLAN`, `EXPERIENCED_ORGANIZER_REVIEW_QUEUE_IMPLEMENTATION_PLAN`,
`WP1_PLANSTORE_IMPLEMENTATION_TASKS` — **HISTORICAL** (superseded by `ROADMAP_V2.md`).

## 14. Root documents

`README.md` (entry; **review for staleness**), `STRIPE_CHECKOUT_QA.md`, `LANGUAGE_AUDIT.md`,
`PHASE5_QA.md` — **SUPPORTING/HISTORICAL**.

---

*Authority resolves top-down: the Constitution wins over everything; among architecture docs,
`CURRENT_ARCHITECTURE.md` is canonical and HISTORICAL docs are kept only for record. When a doc's status
changes, update it here.*

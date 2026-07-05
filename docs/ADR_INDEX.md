# Architecture Decision Records — Index

> **Status: AUTHORITATIVE.** One page listing every ADR. ADRs are the canonical record of *why* the
> architecture is what it is. The Project-centric ADRs (003–008) recover decisions previously held only in
> working sessions, making the repository self-contained. Governed by `ALH_PRODUCT_PHILOSOPHY.md`; current
> architecture in `CURRENT_ARCHITECTURE.md`.

| ADR | Purpose | Status | Related |
|---|---|---|---|
| `ADR_001_OPE_CORE_IS_PLATFORM_CORE.md` | OPE core is the platform's core engine | **Accepted** (OPE V1) | `OPE_V1_TECHNICAL_DESIGN.md` |
| `ADR_002_OPE_COVERAGE_GATE.md` | Coverage/complexity gate (supported / refuse / handoff) | **Accepted** (OPE V1) | `OPE_MASTER_SPEC.md` |
| `ADR_003_ENTITY_OWNERSHIP.md` | Which entity owns each thing — Plan = scope/estimate, Project = everything realized | **Accepted** | `ADR_004`, `CURRENT_ARCHITECTURE.md` |
| `ADR_004_SOURCE_OF_TRUTH.md` | One writer per fact; reference / derive / immutable snapshot | **Accepted** | `ADR_003` |
| `ADR_005_LIFECYCLE_STATE_MACHINE.md` | Canonical event lifecycle + plan-version layer + freezes/snapshots | **Accepted** | `OPE_EVENT_LIFECYCLE.md`, `ADR_006` |
| `ADR_006_TRANSITION_AUTHORITY.md` | Who initiates vs. authorizes each transition; AI never authorizes commitments | **Accepted** | `ADR_005`, `ADR_007`, `PHASE0_CONTRACT_DECISIONS.md` |
| `ADR_007_BUSINESS_OPERATIONS.md` | Guarded-operation / closed-command model; one canonical operation per command | **Accepted** | `ADR_006`, `ADR_008` |
| `ADR_008_PUBLISH_FLOW.md` | Owner-only, idempotent publish → Public Space | **Accepted & Implemented** | `PROJECT_PUBLIC_SPACE_SPEC.md`, `MIGRATION_STATUS.md` |
| `ADR_009_EXECUTION_IS_A_WORKSPACE_PHASE.md` | Execution is a lifecycle phase of Project Workspace, not an independent module | **Accepted** | `PLANNING_AXIOMS.md`, `CURRENT_ARCHITECTURE.md` |
| `ADR_010_HUMAN_ROLES_AND_PIPELINE_AUTHORITY.md` | Client (requesting authority) vs Organizer (execution authority) across the pipeline; approved FED is the authority handoff; may be same or different actor | **Accepted** | `FUTURE_EVENT_DESCRIPTION_SPEC.md`, `PLANNING_AXIOMS.md`, `PROJECT_WORKSPACE_AXIOMS.md`, `SYSTEM_ARCHITECTURE_LAYERS.md` |
| `ADR_011_PROJECT_VIEW_ARCHITECTURE.md` | One Project, many role-based Views (projections): Public / Participant / Organizer / Client / Worker / Emergency‑Safety. Views are filtered projections of the same Project — no duplicated Project models or business logic; roles are evaluated per Project, not per user | **Accepted** | `ADR_010`, `ADR_003_ENTITY_OWNERSHIP.md`, `PROJECT_PUBLIC_SPACE_SPEC.md`, `CURRENT_ARCHITECTURE.md` |

**Reading order for the Project-centric architecture:** 003 (ownership) → 004 (source of truth) → 005
(lifecycle) → 006 (transition authority) → 007 (operations) → 008 (publish). Together with
`OCCURRENCE_SPEC.md` and `PROJECT_PUBLIC_SPACE_SPEC.md`, these fully describe the current architecture with
no dependency on chat history.

*Convention:* ADRs are numbered sequentially (`ADR_NNN_NAME.md`) and never deleted; a superseded ADR gets a
status banner and a pointer to its replacement.

# Project Lifecycle

> **Status: AUTHORITATIVE** · **Date: 2026‑07‑03** · **Type: Lifecycle terminology & definitions (consolidating).**
>
> This document names the canonical **Project Lifecycle** spine and defines its official terminology and
> axioms. It **consolidates** terminology that is defined in detail by the phase documents; it does **not**
> redefine, redesign, or override them. Where a phase document (spec / axioms / ADR) provides the detailed
> behavior for its stage, **that document governs that stage**. This document introduces **no new workflow, no
> new architecture, and does not design Revision.**

## Purpose

Provide one AUTHORITATIVE place that (a) names the end‑to‑end Project Lifecycle, (b) gives the official
definition of each lifecycle term, and (c) records the accepted lifecycle axioms and the architectural
conclusions about the independence of Publish and Approval and the Approved Project as the operational source
of truth. It preserves existing AUTHORITATIVE terminology where compatible and cross‑references the owning
documents rather than duplicating their content.

## The canonical lifecycle

```
Idea
 ↓
Discovery
 ↓
Future Event Description (FED)
 ↓
Planning
 ↓
Draft Project
 ↓
Project Workspace
 ↓
Approve Project
 ↓
Approved Project
 ↓
Execution
```

The human authority gates within this spine — the Statement of Understanding, the Client's confirmation of
understanding, the Client's approval of the FED, and the approval that commits the Project — are defined by
`ADR_010_HUMAN_ROLES_AND_PIPELINE_AUTHORITY.md`. The formal state machine and the downstream operational
states (Ready → Registration → Completed → Closed → Archived, with locks and immutable snapshots) are defined
by `ADR_005_LIFECYCLE_STATE_MACHINE.md`. **Execution** is a phase *within* Project Workspace per
`ADR_009_EXECUTION_IS_A_WORKSPACE_PHASE.md`. **Publish** is a parallel, independent concept (below) defined by
`ADR_008_PUBLISH_FLOW.md`.

## Official definitions

- **Idea** — The initial expression of a desired future event, before any structured understanding exists. The
  unstructured entry point of the lifecycle.
- **Discovery** — The stage that turns an Idea into a shared **Statement of Understanding** by asking only
  meaning‑level clarification. Detailed behavior: `DISCOVERY_PRODUCT_BEHAVIOR_SPEC.md`.
- **Future Event Description (FED)** — The authoritative description of the desired future event, produced by
  its dedicated AI from the Statement of Understanding and **approved by the Client**. It is the
  Discovery→Planning hand‑off artifact. Detailed behavior: `FUTURE_EVENT_DESCRIPTION_SPEC.md`.
- **Planning** — The stage that **proposes** how to realize the approved FED. Planning produces a proposed plan;
  it proposes, it does not commit. Foundational axioms: `PLANNING_AXIOMS.md`.
- **Draft Project** — The Project as it exists **after Planning and before approval**: a proposed, editable,
  not‑yet‑authoritative Project created from Planning. It is prepared inside the Project Workspace and is **not**
  the operational source of truth.
- **Project Workspace** — The working area in which the organizer **reviews, refines, and prepares** the Draft
  Project before approval. Workspace prepares; it does not propose (that is Planning). Foundational axioms:
  `PROJECT_WORKSPACE_AXIOMS.md`. (Execution is a phase within the Workspace — `ADR_009`.)
- **Approve Project** — The deliberate **commit** gate that promotes a Draft Project to an Approved Project.
  Approval commits. The approving human authority is defined by `ADR_010`.
- **Approved Project** — The committed Project that becomes the **operational source of truth for Execution**.
  It corresponds to the *Approved* state of the lifecycle state machine (`ADR_005`), which governs its
  downstream operational states, locks, and snapshots.
- **Execution** — The phase (within Project Workspace, per `ADR_009`) that **carries out the Approved Project**.
  Execution executes only the Approved Project — never a Draft Project.
- **Publish** — The owner‑only, idempotent operation that makes a Project **visible in Public Space** (sets
  `projects.is_published = true` and nothing else). Publish controls Public Space visibility and is
  **independent of Project Approval**. Definition of record: `ADR_008_PUBLISH_FLOW.md`.

## Reserved — Revision (future concept only)

- **Revision** — **RESERVED. Future concept only.** The term is reserved to name a future, deliberate
  post‑approval change to an Approved Project. It is **not designed, not specified, and not implemented** here,
  and **no workflow is defined** for it. It is recorded solely to reserve the term and prevent conflicting use —
  in particular, to avoid overloading "Version," which means **release management** elsewhere
  (`ADR_005`) and in general tooling. **Do not design Revision in this document.**

## Lifecycle axioms (accepted)

1. **Planning proposes.**
2. **Project Workspace prepares.**
3. **Approve Project commits.**
4. **Approved Project becomes the operational source of truth.**
5. **Execution executes only the Approved Project.**
6. **Publish controls Public Space visibility.**
7. **Publish is independent of Project Approval.**

## Architectural conclusions (accepted from terminology research)

- **Publish and Approval are independent concepts.** Publish governs Public Space visibility (`ADR_008`);
  Approval governs the commit of the Project to the operational source of truth. Neither gates the other. This
  matches industry practice, where "publish" means visibility (e.g., publish‑to‑web, launch a public site) and
  is separate from a lifecycle approval/sign‑off.
- **The Approved Project is the operational source of truth for Execution.** Execution follows the Approved
  Project — analogous to a finalized, execution‑ready artifact (e.g., a signed agreement / banquet‑event‑order)
  that operations follow, rather than an unapproved draft.
- **Revision remains a reserved future concept only.** Industry practice supports an eventual
  approved‑artifact revision loop, but it is **not** adopted or designed here.

## Relationship to existing AUTHORITATIVE documents

This document is the terminology/definitions spine; the following documents own the detailed behavior and
remain authoritative for their scope. Where they and this document map, the mapping is shown; where they
provide detail beyond terminology, they govern.

| Concept | Owning document(s) |
|---|---|
| Discovery behavior | `DISCOVERY_PRODUCT_BEHAVIOR_SPEC.md` |
| FED behavior + Client approval | `FUTURE_EVENT_DESCRIPTION_SPEC.md` |
| Planning axioms / behavior | `PLANNING_AXIOMS.md`, `PLANNING_PRODUCT_BEHAVIOR_SPEC.md` |
| Project Workspace axioms / behavior | `PROJECT_WORKSPACE_AXIOMS.md`, `PROJECT_WORKSPACE_PRODUCT_BEHAVIOR_SPEC.md` |
| Execution is a Workspace phase | `ADR_009_EXECUTION_IS_A_WORKSPACE_PHASE.md` |
| Human roles & approval authority | `ADR_010_HUMAN_ROLES_AND_PIPELINE_AUTHORITY.md` |
| Formal lifecycle state machine, downstream states, locks, snapshots | `ADR_005_LIFECYCLE_STATE_MACHINE.md` |
| Publish / Public Space visibility | `ADR_008_PUBLISH_FLOW.md`, `PROJECT_PUBLIC_SPACE_SPEC.md` |

**Compatibility note (ADR_005).** `ADR_005` remains the authoritative **formal state machine**. This document
names the product‑facing lifecycle **terminology** (the artifacts an organizer sees): the *Draft Project* is
the specific pre‑approval, post‑Planning form of the Project prepared in the Project Workspace; the *Approved
Project* corresponds to the state machine's **Approved** state. This document neither adds nor renames states in
`ADR_005`.

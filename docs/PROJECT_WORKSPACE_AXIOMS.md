# Project Workspace Axioms

> **Status: AUTHORITATIVE (architectural axioms).** This document records **only** the foundational
> architectural axioms of Project Workspace — the statements from which later Workspace behavior will
> naturally follow. It is **not** a Product Behavior Specification and **not** a Technical Design. It contains
> no behavior, examples, implementation, UI, database, or algorithm detail, and introduces no new concept.
> Every axiom follows from the accepted architecture: `PLANNING_AXIOMS.md`, `PLANNING_PRODUCT_BEHAVIOR_SPEC.md`,
> `ADR_009_EXECUTION_IS_A_WORKSPACE_PHASE.md`, `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`, and the accepted pipeline.
> Where this document and those disagree, those documents win.

---

## Scope and baseline

1. **A Project Workspace cannot be created without an approved Planning result — an approved Planning result is its mandatory prerequisite.**

2. **Project Workspace consumes the approved Planning result as its authoritative baseline — the reference against which the project's actual reality is understood.**

3. **Project Workspace never rewrites the approved Planning result.**

## Actuality

4. **Project Workspace owns the truthful account of the project's actual reality.**

5. **Project Workspace never fabricates actual reality.** Actuality is held truthfully or reported absent; it is never invented.

## Realization

6. **Project Workspace owns realization of the approved Planning result.**

7. **Project Workspace includes the Execution lifecycle phase** (per `ADR_009`); Execution is a phase of the Workspace, not an independent module.

## Boundaries and authority

8. **Project Workspace never performs Planning.**

9. **Project Workspace never changes the project's intent.**

10. **The AI works; the organizer decides.** The Workspace surfaces and coordinates; consequential decisions rest with the organizer.

# ADR — Human roles and pipeline authority

> **Status: ACCEPTED** · **Date: 2026‑07‑02** · **Type: Architecture Decision Record.**
> This ADR resolves the **human‑role authority model across the pipeline** — role authority only. It
> introduces **no new entity, no root, and no Organizer Business**; it does not redesign the pipeline and does
> not modify implementation. Where it and the axioms/specifications disagree, those documents win.

---

## 1. Context

The current AUTHORITATIVE pipeline is:

```
Idea → Discovery → Statement of Understanding → (Client confirmation)
    → Future Event Description → (Client approval)
    → Planning → (Organizer approval)
    → Project Workspace → Execution → Completed / Archived
```

The architecture names two human roles — **Client** and **Organizer** — and operates human gates with them
(`FUTURE_EVENT_DESCRIPTION_SPEC`: the client approves the FED; `PLANNING_AXIOMS` and `PROJECT_WORKSPACE_AXIOMS`
Axiom 10: the organizer decides). But it never defines how authority passes between them, or whether they may
be the same person. `SYSTEM_ARCHITECTURE_LAYERS.md` Layer 4 flags this explicitly as *"a genuine architectural
decision, deliberately left open."* This ADR closes it, at the role/authority level only.

## 2. Decision

### Roles

1. **Client — the requesting authority.** The Client is the originator of the desired future event: the
   authority over *what is wanted*. Client authority governs the **understanding and approval of the desired
   future event**.
2. **Organizer — the execution authority.** The Organizer is responsible for turning the **approved** Future
   Event Description into a realizable project. Organizer authority governs **planning, execution, adaptation,
   and realization**.

### Same or different actor

3. **They may be the same human actor.** In a **self‑organized event**, one person holds both roles — Client
   and Organizer.
4. **They may be different actors.** In a **service / agency event**, Client and Organizer are distinct people.

   Client and Organizer are **roles/authorities, not persons.** Every gate binds to the *role*, never to a
   fixed count of humans.

### Authority per gate

5. **Statement of Understanding — confirmed by the Client.** The understanding is of *what the Client wants*;
   the Client confirms it.
6. **Future Event Description — approved by the Client.** The FED describes the desired future event; **Client
   authority** approves it.
7. **Planning decisions — owned by the Organizer** (Planning Axiom 10: the organizer decides).
8. **Project Workspace / Execution decisions — owned by the Organizer** (Project Workspace Axiom 10). Runtime
   realization decisions rest with the Organizer.

### The FED → Planning authority handoff

9. The **approved Future Event Description is the handoff artifact** between Client authority and Organizer
   authority. **Client authority ends at the approved FED; Organizer authority begins at Planning.**
   - The **Organizer may not silently rewrite the Client‑approved FED** (consistent with Planning Axiom 2 and
     the AI Artifact Ownership Principle: Planning realizes, it never invents, extends, or redesigns).
   - Planning **may identify** constraints, risks, tradeoffs, and required changes to the desired event.
   - If the FED **must change materially**, it **returns to Client approval** (the revision principle) — it is
     never changed under Organizer authority alone.

### What the system must not assume

10. The system must **not**:
    - assume Client and Organizer are the **same** actor;
    - assume Client and Organizer are **different** actors — both configurations are valid;
    - permit the Organizer to alter the Client‑approved FED **without returning to Client approval**;
    - bind either role to a **durable business entity** — roles are actor‑level authorities; this ADR
      introduces no Organizer Business and no new root entity.

## 3. Consequences

- The pipeline's authority layer is now coherent end‑to‑end: **Client authority** governs Discovery → Statement
  of Understanding → FED (understanding and approval of the desired event); **Organizer authority** governs
  Planning → Project Workspace → Execution (realization). The **approved FED is the single authority boundary.**
- Because gates bind to roles, one implementation serves both the **self‑organized** (one actor) and **service**
  (two actors) configurations without change.
- `SYSTEM_ARCHITECTURE_LAYERS.md` Layer 4 (Human Roles) can now be updated to reference this ADR and drop its
  INTENTIONALLY‑INCOMPLETE flag — a follow‑on update to that LIVING document, outside this ADR's scope.

## 4. Scope guardrail (how this decision was reached)

This decision was reachable **entirely at the role/authority level.** The "Organizer" here is the execution
*authority/actor*, **not** the Organizer Business root entity. It introduces no new root and does not touch the
frozen, out‑of‑scope Organizer Business. Had the resolution required the Organizer Business entity, the
architectural stop rule would have applied — it did not.

## Relationship to existing documents

- `SYSTEM_ARCHITECTURE_LAYERS.md` Layer 4 — this ADR resolves the gap it flagged.
- `FUTURE_EVENT_DESCRIPTION_SPEC.md` (Client approves the FED) and the `PLANNING` / `PROJECT_WORKSPACE`
  axioms & specifications (the organizer decides; Planning realizes and never redesigns; the revision
  principle) — this ADR unifies their human‑authority references without changing them.
- It defers to the Constitution, axioms, and specifications on any conflict.

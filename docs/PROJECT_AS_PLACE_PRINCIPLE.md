# Project-as-Place Principle

> **Status: AUTHORITATIVE — Architectural Principle.** Applies to every future implementation involving
> Projects, Project Workspace, Event Home, Public Space, and participant interaction. Governed by the
> Constitution (`ALH_PRODUCT_PHILOSOPHY.md`); consistent with `CURRENT_ARCHITECTURE.md`, `ADR_003_ENTITY_OWNERSHIP.md`
> (the Project is the durable Root Entity), and `CONVERSATION_FIRST_PRINCIPLE.md`. Records a product
> decision only — no implementation details, database design, or UI layouts.

## Purpose

Record the fundamental product decision that, in ActivLife Hub, a **Project is not a database record, not a
page, and not a collection of modules**. A Project is a **permanent digital place**.

## Background

Traditional systems model projects as records, and users navigate between modules:

Project · Budget · Tasks · Files · Chat · Registration · Payments.

ActivLife Hub deliberately follows a different model. **The Project itself is the destination.** People enter
one permanent address. Everything else is a manifestation of the same place.

## Core Principle

A Project in ActivLife Hub is a **permanent digital place with one stable address**.

- The place exists throughout the entire life of the project.
- Its address never changes.
- Its identity never changes.
- Only its current state changes.

Every role enters the **same place** — Organizer, Participant, Vendor, Photographer, Volunteer, Client,
Administrator. **Different permissions create different views of the same place. Not different systems.**

## Lifecycle

The Project does not become another product after the event. The **same place** naturally evolves through:

Idea → Discovery → Planning → Preparation → Invitations → Registration → Execution → Completion → Archive →
Memory → Future reuse.

The transition must be **continuous**. There is never a "new page". There is only one Project.

## Living Place

The Project behaves like a **living place**:

- Information naturally appears.
- Information naturally fades into the background.
- History is preserved.
- Nothing important disappears.
- The Project **accumulates memory rather than replacing it**.

## Address

Every Project has **one permanent public identifier** — for example:

```
https://alh.com/p/summer-bbq-US-1221-1
```

Human-readable slug · stable project identifier · version. The URL represents **the place itself**, not a
particular page.

## Relationships — projections of the same Project

- **Project Workspace** is not another product. It is simply the **organizer's view** of the Project.
- **Event Home** is not another product. It is simply the **participant-facing view** of the same Project.
- **Public Space** is another **projection** of the same Project.
- **Registration** happens **inside** the Project, not outside it.
- **Payments** belong to the Project.
- **Documents** belong to the Project.
- **Budget** belongs to the Project.
- **Communication** belongs to the Project.

## Design Consequences

Future implementations should always ask:

> "Does this make the Project feel more like a real place?"

or

> "Does this reduce the Project back into disconnected screens?"

If the second answer is true, **the implementation violates this principle.**

## Conclusion

The Project is the **permanent center** of ActivLife Hub. All other subsystems are **projections of the same
Project** for different roles and different moments of its life. The Project never stops existing. Only its
season changes.

## Related documents

`ALH_PRODUCT_PHILOSOPHY.md` (Constitution — invisible architecture; organizer sees "their event"),
`CURRENT_ARCHITECTURE.md` (Project-centric pipeline), `ADR_003_ENTITY_OWNERSHIP.md` (Project = the durable
Root Entity), `ADR_004_SOURCE_OF_TRUTH.md`, `ADR_005_LIFECYCLE_STATE_MACHINE.md`, `PROJECT_PUBLIC_SPACE_SPEC.md`,
`CONVERSATION_FIRST_PRINCIPLE.md`.

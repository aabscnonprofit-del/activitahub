# Project State Model Principle

> **Status: AUTHORITATIVE — Architectural Principle.** Applies to every future implementation involving
> Projects, Project Workspace, Event Home, Public Space, participant interaction, events, timeline, and
> notifications. Governed by the Constitution (`ALH_PRODUCT_PHILOSOPHY.md`); complementary to
> `PROJECT_AS_PLACE_PRINCIPLE.md`; consistent with `ADR_005_LIFECYCLE_STATE_MACHINE.md` and
> `ADR_007_BUSINESS_OPERATIONS.md`. Records a product/architecture decision only — no implementation
> details, database schemas, or UI layouts.

## Purpose

Record the fundamental architectural decision that **every meaningful action inside ActivLife Hub changes the
state of exactly one Project.** The Project Workspace is not a dashboard — it is the **live representation of
the current Project state**.

## Background

Traditional software stores information. ActivLife Hub stores the **living state of a Project**. Users do not
merely edit records — **every action changes the Project itself.**

## Core Principle

Every meaningful action inside ActivLife Hub changes the state of **exactly one Project**. The Project becomes
the **single integration point** of the entire platform.

## Examples

- Participant confirms attendance → Project state changes.
- Participant declines → Project state changes.
- Participant changes dietary requirements → Project state changes.
- Vendor accepts the contract → Project state changes.
- Vendor reports arrival → Project state changes.
- Photographer uploads photographs → Project state changes.
- Organizer changes schedule → Project state changes.
- Budget changes → Project state changes.
- Payment received → Project state changes.
- Weather forecast changes → Project state changes.

Every meaningful action has exactly one destination: **Project State.**

## Project Workspace

Project Workspace is not a collection of modules. It is the **current visible state of the Project**. Its
primary purpose is answering one question:

> "What changed since I was here last?"

## Attention Model

The Workspace continuously guides attention. It highlights: new events · waiting actions · completed actions ·
problems · risks · approvals · confirmations · late responses.

Never force users to search for changes. The Workspace should **naturally surface them**.

## Living State

The Project continuously evolves:

- Information appears naturally.
- Information loses importance naturally.
- History never disappears.
- The current state is always visible.

## Different Views

Organizer · Participant · Vendor · Volunteer · Coordinator · Photographer · Administrator.

Everyone observes the **same Project state**. Permissions determine which parts of that state are visible.
**Permissions never create different Projects.**

## Events

The Project State is produced by **events**. For example: invitation sent · registration completed · payment
received · vendor assigned · vendor arrived · task completed · document uploaded · media uploaded · review
submitted. **Every event updates Project State.**

## Project Timeline

The visible timeline of a Project is the chronological history of Project State. It is **not a log file** — it
is the **story of the Project**.

## Notifications

Notifications are not independent objects. They are **reactions to changes in Project State**.

## Project Health

The Workspace should naturally communicate: what is healthy · what needs attention · what is blocked · what is
completed — **without requiring the organizer to inspect every module separately.**

## Relationship with PROJECT_AS_PLACE_PRINCIPLE

- `PROJECT_AS_PLACE_PRINCIPLE.md` defines **what** the Project is.
- `PROJECT_STATE_MODEL_PRINCIPLE.md` defines **how** the Project lives.

The two principles are complementary.

## Design Test

Every future implementation should answer:

1. Does this action change Project State?
2. Does the Project immediately reflect that change?
3. Can every affected participant naturally observe that change according to permissions?

If not, **the implementation violates this principle.**

## Conclusion

The Project is the **living center** of ActivLife Hub. Every meaningful action changes the Project. Project
Workspace is simply the **real-time representation of that living state.**

## Related documents

`PROJECT_AS_PLACE_PRINCIPLE.md`, `ALH_PRODUCT_PHILOSOPHY.md`, `CURRENT_ARCHITECTURE.md`,
`ADR_005_LIFECYCLE_STATE_MACHINE.md`, `ADR_007_BUSINESS_OPERATIONS.md`, `ADR_004_SOURCE_OF_TRUTH.md`.

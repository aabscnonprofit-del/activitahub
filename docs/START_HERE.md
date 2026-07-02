# START HERE

## Purpose

This document is the mandatory starting point for every engineer, AI agent, architect, or contributor working on ActivLife Hub.

Before beginning any implementation, the documents below must be read.

---

## Mandatory Reading Order

1. `ALH_PRODUCT_PHILOSOPHY.md`
2. `ACTIVLIFE_HUB_PRODUCT_CANON.md`
3. `DISCOVERY_PRODUCT_BEHAVIOR_SPEC.md`
4. `OPE_DISCOVERY_ENGINE_PRINCIPLES_V1.md`
5. `AI_PROJECT_MODELING_PRINCIPLE.md`
6. `ENGINEERING_PROCESS.md`
7. `IMPLEMENTATION_ROADMAP.md`
8. `DOCUMENTATION_INDEX.md`

---

## Why the Roadmap Matters

`IMPLEMENTATION_ROADMAP.md` is mandatory because it records:

- what has already been implemented;
- what is currently being implemented;
- what has been intentionally postponed;
- which research ideas are deferred until after launch.

Do not begin new work without checking the roadmap.

---

## Current Development Priority

The current implementation sequence is:

```
Discovery
  → Statement of Understanding
  → Client confirms understanding
  → Future Event Description
  → Client approves the Future Event Description
  → Planning
  → Project Workspace
  → Execution
```

Do not skip stages. The pipeline advances only through explicit client approval gates: the client confirms
the Statement of Understanding before a Future Event Description is created, and approves the Future Event
Description before Planning begins.

**Revision principle:** if a stage is rejected, the workflow returns to the most recent approved stage.
Previously approved stages remain valid unless the client explicitly changes the underlying intent.

---

## Product Principle

ActivLife Hub is an operating system for organizers.

Every implementation decision should increase the organizer's ability to successfully organize larger, better, and more complex events.

---

## Engineering Principle

Do not redesign completed stages while implementing the next stage.

Complete one stage.

Pass Product Acceptance.

Then continue.

---

## Final Rule

If you think a new idea is valuable but it is not required for the current implementation stage:

Do not interrupt the implementation.

Record the idea in the appropriate research or roadmap section.

Continue implementing the current milestone.

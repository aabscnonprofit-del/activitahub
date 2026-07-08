# Arrival Coordination — Architecture Backlog

> **Type: Architecture backlog (non-authoritative).** Future decision points for Arrival Coordination — triggers,
> not current work. Nothing here is scheduled or implemented. **ActivLife Hub coordinates people, not
> transportation:** the primary value is helping participants meet each other before the activity starts;
> transportation is only the mechanism. Recording these does **not** change product behavior, schema, or UI.

Current shape this backlog builds on (as of writing): Arrival Coordination ("Getting there") lets an approved
participant indicate **I need a ride** / **I can offer a ride** with an optional pickup ZIP/area, seats, and a
short note — a lightweight attendance-coordination layer. Owner + approved participants see a safe summary
(counts + ZIP/seats/note); public visitors see nothing. No maps / exact address / phone / payment / matching.

---

## 1. Arrival Groups

**Current state.** Arrival Coordination allows approved participants to indicate:
- I need a ride
- I can offer a ride

This is a lightweight attendance-coordination layer.

**Backlog note.** If Arrival Coordination becomes widely used, introduce an **optional Arrival Board** — a space
where participants **voluntarily** coordinate how they travel to the activity before it begins. It is a **social
coordination space**. It is **NOT** transportation, **NOT** rideshare, and **NOT** route optimization.

**Possible future additions:**
- departure area
- departure time
- seats available
- group discussion
- organizer announcements

**Do NOT implement:**
- maps
- navigation
- automatic matching
- payments
- driver verification
- insurance
- route planning
- liability handling

**Reason.** The primary value is helping participants **meet each other before the activity starts**.
Transportation is only the mechanism — the real product value is **earlier social connection**.

**Decision trigger.** Arrival Coordination becomes **actively used** by organizers and participants.

---

## Principle

ActivLife Hub coordinates **people, not transportation**. An Arrival Board would deepen social connection ahead
of an activity; it must never turn the platform into a transportation provider, rideshare marketplace, or route
planner. Record the decision point now, so the feature — if built — starts from this principle rather than
drifting into logistics.

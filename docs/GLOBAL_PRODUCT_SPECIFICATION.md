# ActivLife Hub — Global Product Specification

> **Status: Highest-level product description.** This is the single document that orients anyone to what
> ActivLife Hub is. It **does not duplicate** existing documents — it summarizes and links them. When it
> describes *philosophy*, the **Constitution** (`ALH_PRODUCT_PHILOSOPHY.md`) is the higher authority; when
> it describes *current architecture*, `CURRENT_ARCHITECTURE.md` is canonical; when it describes *state*,
> `PROJECT_STATUS.md` and `FEATURE_MATRIX.md` are canonical. Start here, then follow the links.

---

## 1. What is ActivLife Hub?

> **An AI Operating System for independent event organizers** — software that turns an organizer's *idea*
> into a *real-world activity* with as little of the organizer's effort as possible.

The AI does the operational and intellectual work (understand, plan, decompose, cost, coordinate); the
organizer **directs** — reviews, approves, adjusts. Its success is measured by real gatherings that happen,
not by time spent in the app.

*Authority:* `ALH_PRODUCT_PHILOSOPHY.md` (constitution), `ACTIVLIFE_HUB_CORE_MISSION.md`.

## 2. Who is it for?

The **independent organizer** — a person or small company who *personally creates and runs activities*:
a child's birthday, beach yoga, a picnic, a city walk, a workshop, a wedding, a conference. Secondary:
the **participant/client** who joins, and the **vendors/workers** an organizer coordinates.

*Authority:* `ALH_PRODUCT_PHILOSOPHY.md §3`, `ACTIVLIFE_HUB_SOURCE_OF_TRUTH_V1_0.md`.

## 3. What problem does it solve?

Every event must currently be *invented and operated from scratch by one overloaded human.* The organizer's
own calendar — not demand, ideas, or supply — caps what they can deliver. ActivLife Hub removes the human
as the operational bottleneck, letting one organizer run events that would normally require a team.

*Authority:* `ALH_PRODUCT_PHILOSOPHY.md §1–2`, `WHY_ACTIVLIFE_HUB_EXISTS.md`.

## 4. What is NOT part of ActivLife Hub?

- It is **not** event-management software, a CRM, a planner, a marketplace, or a booking system — those
  are *modules*, not the product (`ALH_PRODUCT_PHILOSOPHY.md §0`).
- It is **not** an attention/engagement product — screen time is a cost, not a goal (§9).
- It does **not** promise real-world life outcomes (status, qualifications); it organizes *experiences*
  (`OPE_REQUEST_INTERPRETATION_PRINCIPLE.md`).
- The **Ticket Seller** path (publish-and-sell-tickets, no planning) is a *separate, out-of-scope operating
  model*, not the organizer journey (`TICKET_SELLER_OPERATING_MODEL.md`; flagged for reconciliation).

## 5. Product philosophy & core principles

Governed by the **Constitution** (`ALH_PRODUCT_PHILOSOPHY.md`) and the **Conversation-First principle**
(`CONVERSATION_FIRST_PRINCIPLE.md`). The principles every feature must follow:

1. Technology should help people meet **in the real world**.
2. **Organizer journey** over pages and entities.
3. **Conversation first**; screens only to compare/choose/confirm/visualize/pay.
4. **AI works, human decides** — never a data-entry operator.
5. The organizer is a **director**; AI coordinates the work.
6. **Invisible architecture** — the organizer never sees *Project, Occurrence, Registration, Budget,
   Public Space*; they see *their event*, *the date*.
7. Priority follows the **largest architectural gap** in the journey, not feature requests.

## 6. Main entities (internal — never shown to the organizer)

| Entity | Role | Spec |
|---|---|---|
| **Project** | the Root Entity — one durable engagement ("the event") | `CURRENT_ARCHITECTURE.md`, migration `041` |
| **Plan** | the scope + estimate produced by OPE (versioned, one active) | `OPE_V1_TECHNICAL_DESIGN.md`, migration `044/045` |
| **Budget** | pricing overlay on a Project (lines, quotes, fee, proposal) | `BUDGET_WORKSPACE_V1_DESIGN.md`, migration `042/043` |
| **Occurrence** | a concrete dated instance of a Project ("the date") | `OCCURRENCE_SPEC.md`, migration `046` |
| **Public Space** | the read-only public projection of a published Project | `PROJECT_PUBLIC_SPACE_SPEC.md`, migration `046` |
| **Registration / Payment** | per-Occurrence sign-up + payment (not yet built) | `PROJECT_PUBLIC_SPACE_SPEC.md` |

Ownership rule: the **Project owns everything realized** (budget, vendors, payments, participants, history);
the **Plan owns only scope+estimate** (`ADR_003_ENTITY_OWNERSHIP.md`, `ADR_004_SOURCE_OF_TRUTH.md`). The
lifecycle, transition authority, operations, and publish rules are recorded in `ADR_005`–`ADR_008`
(`ADR_INDEX.md`).

## 7. Complete user journey

From *"I have an idea"* to a real gathering, the organizer experiences: **describe the idea → answer a
couple of genuine questions → review the event OPE prepared → set the date → publish.** Internally this maps
to the pipeline in §8. The smallest natural journey is *one meaningful conversational decision → one review
screen* (`CONVERSATION_FIRST_PRINCIPLE.md`).

## 8. High-level architecture (canonical pipeline)

```
Client → Discovery / OPE → Project (Root) → Planner / Budget → Occurrence → Publish → Public Space → Registration → Payment
```

Full detail (and the legacy architecture it supersedes) in **`CURRENT_ARCHITECTURE.md`**.

## 9. Business model

Certification-gated organizer access (a paid subscription unlocked after academy certification), a
consumer **One Event License** for the standalone Planner, and a marketplace connecting participants to
certified organizers. Vendors/workers are coordinated, not resold.

*Authority:* `BUSINESS_MODEL_AND_MONETIZATION.md`, `MASTER_PRODUCT_DECISIONS.md §7/§11.8`.

## 10. Current implementation state (summary)

- **Live:** V1 marketplace (activities, requests, proposals, bookings), Stripe (Connect/invoices/
  subscriptions/refunds/event licenses), academy + certification, OPE V1 planner, Projects, Budget,
  Plan↔Project link, **Public Space**, **Publish Flow**.
- **Dormant:** OPE V2 (8-module engine; code uncommitted).
- **Not built:** Occurrence authoring, Registration, pipeline Payment, knowledge/learning loop.
- **Known divergence:** a legacy Event/marketplace architecture runs in parallel with the Project pipeline.

Canonical detail in **`PROJECT_STATUS.md`** and **`FEATURE_MATRIX.md`**; next steps in **`ROADMAP_V2.md`**.

---

*This document is the entry point to the product. For philosophy → the Constitution; for the doc map →
`DOCUMENTATION_INDEX.md`; for what's built → `PROJECT_STATUS.md`; for what's next → `ROADMAP_V2.md`.*

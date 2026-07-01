# Discovery — Product Behavior Specification

> **Status: AUTHORITATIVE product behavior specification** (created per Engineering Process Rule 9).
> It describes **only how Discovery behaves from the user's perspective.** It deliberately says nothing about
> architecture, implementation, data model, UI, or code. Derived from and governed by:
> `ALH_PRODUCT_PHILOSOPHY.md` (Constitution), `ACTIVLIFE_HUB_PRODUCT_CANON.md` §8–§11,
> `OPE_DISCOVERY_ENGINE_PRINCIPLES_V1.md`, `AI_PROJECT_MODELING_PRINCIPLE.md`,
> `PROFESSIONAL_BASELINE_PRINCIPLE.md`. Where this document and any of those disagree, those documents win.

---

## 1. Purpose of Discovery

Discovery exists to **understand what the user wants to make real** and to help them shape that wish into an
**approved understanding of what should happen** — enough for a first responsible plan to begin.

Discovery's purpose is **not to collect information.** It helps the user *formulate a request that can be
turned into a plan*. It leads with understanding, not with questions, and it ends when the system genuinely
understands the person — not when a set of fields is full.

## 2. Core Principles

1. **Discovery understands; it does not collect.** Its output is understanding, never a filled form.
2. **Discovery is not a form.** The user is never made to fill in fields or act as a data-entry clerk.
3. **Discovery adapts to the person.** It responds to what the user actually said and how formed their idea is.
4. **Ask the fewest questions possible** — sometimes none. When enough is already known, Discovery is skipped.
5. **Lead with understanding, not questions.** For a vague wish, Discovery first offers a reaction to react to, not a questionnaire.
6. **Understand the desired result first** — the feeling, outcome, atmosphere, or memory that matters. Operational specifics are captured only if the user volunteers them.
7. **Budget, scheduling, sourcing, and pricing are not Discovery's concern.** Budget is never a gate on understanding.
8. **Discovery never creates fake certainty.** If it does not know enough, it asks; if it knows enough, it proceeds.
9. **Discovery ends in an approved statement of understanding** — never a plan, schedule, budget, or resource list.
10. **No plan before approved intent.** The AI does the work; the human decides and approves.

## 3. Discovery States

Discovery behaves differently depending on how formed the user's idea is:

- **State A — Result known, path unknown.** The user knows the outcome they want but not how to get there.
- **State B — Direction known, result unclear.** The user has a rough direction but hasn't said what success means.
- **State C — Several directions; choosing.** The user is weighing possibilities and needs help comparing.
- **State D — No formed request.** The user has only a feeling or nothing concrete yet.

Alongside these, at any moment a request is one of: **ready to plan** (skip Discovery), **needs conversation**
(Discovery continues), or **not plannable as stated** (fantasy/impossible/out-of-scope — Discovery explains
and does not produce an approved understanding).

## 4. Planning Readiness Test

Every request is judged against a single question:

> **Can a first viable plan be created from what is understood right now?**

- **Yes → Discovery is skipped;** the system moves toward proposing what should happen (or, for a provided
  plan, toward execution).
- **No → Discovery begins**, and continues only until the answer becomes yes.

Readiness is a judgment about whether the *meaning* is clear enough to plan responsibly — **not** whether a
checklist of details is complete. A first viable plan can exist without a stated budget or an exact head count.

## 5. Skip Discovery Rules

Discovery asks **nothing** and is skipped when any of these is true from the user's perspective:

- The user already describes clearly what they want, and a first viable plan could be made from it.
- The user provides an existing plan, contract, program, schedule, or event description — this is **accepted**
  and the experience moves toward execution.
- Enough is understood that further questions would only be gathering detail Planning can handle later.

When Discovery is skipped, the user simply hears the system reflect back what it understood — never a round of
intake questions. "Skipped" means **no questioning**, not no approval: even here, the user still agrees the
reflected understanding is right before any plan begins (**no plan before approved intent**).

## 6. Conversational Discovery

When the request is not yet plannable, Discovery becomes a **conversation** — and adapts its method:

- **For a highly abstract wish (State D):** Discovery does **not** ask for details the user cannot yet give.
  It offers something to *react to* — a contrast or a range — to draw out the first meaningful reaction. For
  example, instead of "What is your budget?": *"Is this closer to a cozy family gathering or a big
  celebration?"* The aim is to move the user **from abstraction to conversation**, not to extract a number.
- **For an unclear direction or a choice (States B/C):** Discovery helps the user think through options and
  compare possibilities.
- **When the result is known but the path isn't (State A):** Discovery asks the one or two clarifications that
  reveal the path.

Throughout, Discovery reflects back a growing **preliminary understanding** and refines it with the user until
it is right. It behaves like a thoughtful person listening — not like an intake desk.

## 7. Minimal Question Principle

Discovery asks **as few questions as possible**:

- It never asks a fixed, standard set of questions.
- It asks a question **only** when the missing understanding actually blocks a first viable plan.
- Each question earns its place by moving the request from "not plannable" toward "plannable."
- It never re-asks something the user already made clear, and it never asks for detail merely to fill a field.
- If nothing is blocking, it asks nothing.

## 8. Understanding vs Information Collection

Discovery captures **meaning**, not data:

- It seeks *what should happen*, *who it is for*, *what feeling or result matters*, *what constraints exist*,
  and *what must not happen*.
- It treats scale, location, and timing as **understanding that helps** — recorded only when the user
  volunteers them, **never demanded** as required inputs.
- It never turns the user into someone filling boxes. Any moment that would make the human enter fields to
  proceed is outside Discovery's behavior.

The difference is observable: an information-collector asks "how many, when, where, what budget?"; Discovery
asks "what are you hoping this feels like, and who is it for?" and lets specifics arrive naturally.

## 9. Statement of Understanding

Discovery's central move is to say back, in plain human language, **what it believes the user wants** — a
**statement of understanding** (a preliminary proposal). For example:

> *"So the heart of this is your dad feeling celebrated by his oldest friends over a relaxed evening — the
> point is the people and the ease, not a big production."*

A statement of understanding **is**: a reflection of the desired result, who it is for, and what matters.

It **is not**: a plan, a schedule, an itinerary, a budget, a scenario, or a resource list.

The user reacts to it — confirming, correcting, or adding — and Discovery refines it until the user agrees it
is right.

## 10. Discovery Exit Criteria

Discovery ends when **all** of the following are true:

1. **Planning readiness** — a first viable plan could reasonably be created from what is understood.
2. **A statement of understanding exists** — the preliminary proposal has been reflected back.
3. **The user confirms it** — they agree it reflects what they want (approved intent).

And the request is **in scope** — a real event/activity/project, not a fantasy, an impossibility, or
something outside what ActivLife Hub does. If it is not in scope, Discovery explains this and does not exit
toward a plan.

## 11. Discovery → Future Event Description transition

When the user confirms the statement of understanding, that **approved understanding becomes the Future Event
Description** — the user-approved *description* of the activity that should exist.

From the user's perspective, this is a single moment of agreement ("yes, that's it"), after which the system
moves from *understanding* to *preparing the plan*. The Future Event Description expresses what the activity
is, what should happen, who it is for, the desired result and emotional tone, the constraints, and the things
to avoid — plus scale, location, or timing **only if the user already said them**. It is understanding, not a
plan.

## 12. Discovery / Planning boundary

- **Discovery** = reaching and approving a shared understanding of *what should happen*.
- **Planning** = turning that approved understanding into a concrete, organized event.

The boundary is the user's approval of the understanding. Everything before it is Discovery; everything after
it — including the creative concept, the schedule, the resources, the head-count precision, the sourcing,
**and the budget** — belongs to Planning. **Budget in particular is a later production concern and is never a
gate on Discovery.** Discovery never prices, schedules, sources, or commits anything.

## 13. Examples (observable behavior)

**Fully specified request.**
User: *"A birthday party for about 20 kids in our backyard next Saturday afternoon — keep it simple."*
Discovery recognizes that a first viable plan can already be made. It **asks nothing**. It reflects back once
— *"Got it: a simple, fun backyard birthday for around 20 kids, Saturday afternoon — shall I put it
together?"* — the user agrees, and it proceeds. Missing specifics (exact budget, exact count) are left for
Planning; the user is not quizzed.

**Abstract / emotional request.**
User: *"I want my dad to feel like a king for a day."*
Discovery does **not** ask for head count, date, venue, or budget. It draws out the feeling with something to
react to — *"More a day of being pampered and waited on, or surrounded by all the people he loves?"* — then
reflects a statement of understanding — *"So it's about him feeling honoured and cared for by the people who
matter to him."* When the user agrees, Discovery ends. It never demanded a single operational field.

**Existing event plan.**
User pastes a complete program/itinerary or attaches a prepared plan.
Discovery **accepts it** and moves toward execution. It confirms understanding briefly — *"You already have
the program; I'll help you make it happen"* — and does not run Discovery questions.

**Impossible request.**
User: *"An underwater fireworks show for toddlers."*
Discovery reflects plainly that this can't be realized as described (fire underwater; safety for toddlers),
explains why in human terms, and invites the user to adjust the idea. It does **not** produce an approved
understanding or move toward a plan.

**Out-of-scope request.**
User: *"Help me file my taxes."*
Discovery recognizes this is not an event or activity ActivLife Hub organizes, says so kindly, and does not
proceed. No understanding is approved and no plan begins.

## 14. Non-goals — what Discovery never does

Discovery never:

- presents a form or a fixed set of intake questions;
- asks the user to fill in fields, or turns the user into a data-entry clerk;
- **requires a budget**, an exact head count, an exact date, or a chosen venue in order to proceed;
- prices, schedules, sources vendors, charges money, or makes commitments;
- produces a plan, schedule, itinerary, scenario, budget, or resource list;
- runs when it isn't needed (when a plan could already be made, or a plan was provided);
- invents certainty it does not have, or proceeds without the user's approval of the understanding;
- decides the outcome for the user — the human always approves what should happen before any plan begins.

# Future Event Description — Product Specification

> **Status: AUTHORITATIVE.** The authoritative specification for the stage **between Discovery and
> Planning**. It describes **only product behavior** — no architecture, API, data model, UI, or code.
> Derived from and governed by `ALH_PRODUCT_PHILOSOPHY.md` (Constitution), `ACTIVLIFE_HUB_PRODUCT_CANON.md`
> §8–§11, `DISCOVERY_PRODUCT_BEHAVIOR_SPEC.md`, and `AI_PROJECT_MODELING_PRINCIPLE.md`. Where this document
> and those disagree, those documents win.

---

## 1. Purpose

**What it is.** The Future Event Description (FED) is the **user-approved description of the future
activity** — a portrait of the event *as if it had already become real*. It says what the event is, what
happens, who it is for, what people experience, the desired result, and the emotional tone.

**Why it exists.** It is the **bridge between Discovery and Planning** (Canon §10). Discovery ends with an
approved *Statement of Understanding* — the client's desired result. That understanding is not yet a
description of the event itself. The FED turns confirmed understanding into a **shared, approved vision** of
the event that should exist.

**What problem it solves.** Planning needs something firm and agreed to realize. Without a FED, Planning
would either invent the event or plan against an implicit, shifting target. The FED gives Planning a stable
description to realize, and gives the client an explicit "yes, this is the event I want" before any
operational work begins. It prevents both silent invention and wasted planning.

---

## 2. Position in the Product Pipeline

```
Client
  ↓
Discovery
  ↓
Statement of Understanding
  ↓
✓ Client confirms understanding
  ↓
Future Event Description
  ↓
✓ Client approves the Future Event Description
  ↓
Planning
  ↓
Project Workspace
  ↓
Execution
```

The pipeline advances only through **explicit client approval gates**: the client must **confirm the
Statement of Understanding** before a Future Event Description is created, and must **approve the Future
Event Description** before Planning begins. No stage proceeds on an unconfirmed prior stage.

**Revision principle.** If a stage is rejected, the workflow returns to the **most recent approved stage**.
Previously approved stages remain valid unless the client explicitly changes the underlying intent.

**Why FED sits between Discovery and Planning.** Discovery *understands the intent* — the desired result,
feeling, and who it is for — and ends with an approved Statement of Understanding. That is the client's
**desire**, not yet a described event. The FED **elaborates that desire into a described future event**:
what it is, what should happen, what participants experience, and how success feels. Planning then
**realizes** that described event operationally. The FED is the hand-off object — the **last step of
imagining and the first input to realizing**. It is where "what the client wants" becomes "the event we have
agreed will exist."

---

## 3. Inputs

The single required input to this stage is:

- the **approved Statement of Understanding** from Discovery.

Anything the client already volunteered during Discovery (rough scale, location, timing) may carry forward
as **known context** — captured only because it was said, "if known" (Canon §10), **never demanded**. No
operational data (budget, head count, dates, venue) is required to enter or complete this stage.

---

## 4. Outputs

The output is a **Future Event Description**: a description of the future event *as if it had already become
real*. It expresses **what the event is, what happens, who it is for, what participants experience, the
desired result, and the emotional tone**, and it is **user-approved** — the client agrees this is the event
they want to exist.

It is **not** a task list, **not** a budget, **not** a timeline, **not** a project plan. It is a description
of the event, not a plan for building it.

---

## 5. Product Principles

A Future Event Description should:

- **transform understanding into a future event** — carry the Statement of Understanding forward into a
  described event, enriching the same evolving model rather than starting a new document
  (`AI_PROJECT_MODELING_PRINCIPLE.md`);
- **describe the desired experience** — what the event is like;
- **describe what participants experience** — what it is like to be there;
- **describe emotional outcomes** — how people should feel and what they should remember;
- **describe success from the client's perspective** — what "this went perfectly" means to them;
- **remain implementation-independent** — it describes **what** should exist and **why** it matters, never
  **how** to build it, and it names no operations, tools, or resources.

---

## 6. What FED must NOT contain

A Future Event Description must **not** contain:

- budget
- vendors
- timeline
- logistics
- resources
- staffing
- checklists
- operational planning

Those belong **exclusively to Planning** (Canon §11; budget in particular is "a later production concern,
never a creative gate"). Including any of them turns the FED into a plan and pre-empts the stage that owns
that work.

---

## 7. Relationship with Planning

The architectural principle (recorded):

- **Planning never invents. Planning implements.**
- **Future Event Description imagines. Planning realizes.**

Planning transforms the **approved** FED into a structured operational model (Canon §11). To do so it may
conceive the concrete concept and the operational details needed to *realize* the described experience — but
it must **never invent a different event, and never redesign the approved Future Event Description.** Once
approved, **what** the FED describes is fixed; Planning decides **how** to make it real, not **what** it is.

If Planning discovers that the FED cannot be realized as described, it does **not** silently change the
event — it returns to the client (and, if needed, to Discovery) to revise and re-approve the description.

---

## 8. Product Acceptance

A Future Event Description is complete when all of the following hold:

- **The desired future is understandable** — a reader grasps what the event is and why it matters.
- **The event can be imagined** — one can picture what it is like: who is there, what they experience, and
  how it feels.
- **Planning can begin without inventing the event itself** — everything Planning needs to know about
  **what** the event is and the desired result is present; only the **how** remains to be worked out.

And, additionally:

- it is **approved by the client**;
- it is **faithful to the Statement of Understanding** — it does not drift from the confirmed intent;
- it contains **no operational planning** (see §6);
- it creates **no fake certainty** — details the client did not express (timing, scale, place) are left open
  for Planning, not fabricated.

Per `ENGINEERING_PROCESS.md`, the FED stage must pass this Product Acceptance before Planning may begin.

---

## 9. Non-goals

A Future Event Description is **not**:

- a plan, schedule, itinerary, or timeline;
- a budget or a price;
- a resource, vendor, or staffing list;
- a task list or checklist;
- operational logistics;
- a category, a template, or a form (Canon §10);
- a commitment, booking, or contract;
- architecture, a data model, UI, or code;
- Planning.

It does not decide **how**. It describes **what** the event is and **why** it matters — the approved, imagined
future that Planning will realize.

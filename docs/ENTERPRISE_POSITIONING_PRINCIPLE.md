# Enterprise Positioning Principle — One Event vs Enterprise Edition

> **Status:** **Future consideration — NOT for current implementation.** A long-term product
> principle recorded for durability. It changes no code, schema, architecture, or pipeline today;
> it constrains *how the consumer/professional and Enterprise editions are eventually divided*.
> **Scope:** product positioning / edition boundary. **Source:** product decision (recorded here as
> the authoritative statement).

---

## Principle

ActivLife Hub should **not** artificially limit the size of an individual event — **not** by number
of guests, budget, venue size, or any other measure of event *scale*.

The boundary between the consumer/professional product and the Enterprise product is defined by
**organizational complexity**, **not** by event scale.

---

## Rationale

A single organizer should be able to use ActivLife Hub to organize a **very large** event, as long
as the work is still managed as **one project**. Supporting large single events:
- demonstrates the platform's capability, and
- creates strong reference cases.

Enterprise customers buy a **different value proposition**. They require capabilities such as:
- multi-team collaboration;
- organizational hierarchy;
- approval workflows;
- centralized procurement;
- portfolio management;
- cross-project reporting;
- enterprise security;
- integrations;
- governance;
- compliance;
- administrative controls.

These capabilities belong to the **future Enterprise edition**, not to the **One Event** product.

---

## Strategic position

| Edition | Sells | Unit of value |
|---|---|---|
| **Consumer / Professional** | **Successful delivery of one event** | a single project |
| **Enterprise** | **Management of an organization's entire event operation** | a portfolio of projects + the organization around them |

This distinction is a **long-term product principle**.

---

## Architectural consistency (why this fits the existing design)

This principle is consistent with conclusions already recorded in the engineering research, which
keeps it cheap to honor later without redesign:

- The current **8-module pipeline** (Discovery → OPE → Project Assembly → Workspace → Marketplace →
  Execution → Completion Evidence → Closure) is scoped to **one project / one event** by design.
  Nothing in it imposes a scale cap, so "do not limit event size" requires no special work — it is
  the default.
- The **Enterprise capabilities** above map cleanly to ideas the benchmark deliberately scoped
  *outside* the per-event pipeline (see `ARCHITECTURAL_IDEA_CATALOG.md` /
  `FINAL_ENGINEERING_RECOMMENDATIONS.md`):
  - **Portfolio / program management** → an **aggregation view over many projects**, never a
    pipeline module (ERP study verdict).
  - **Cross-project relationship / identity memory** (repeat clients/vendors, organizer reputation)
    → a **future cross-cutting layer referenced by stable IDs**, owned by no pipeline module (CRM /
    Event studies — flagged architectural risk R2).
  - **Approval workflows, org hierarchy, centralized procurement, governance/compliance, admin
    controls, SSO/integrations** → org-level concerns layered *above* the per-event modules, not
    inside them.
- **Implication for keeping the door open:** the per-event seams should *reference* identity and
  ownership through stable IDs rather than embedding them, so an Enterprise layer can later
  aggregate and govern across projects without reworking the One Event pipeline. (This is the same
  seam-discipline already recommended for the future identity layer — no new requirement.)

---

## What this principle does and does not mean

- **Does:** keep the One Event product unlimited in event scale; locate multi-team/portfolio/
  governance value in a separate Enterprise edition; treat the edition boundary as
  *organizational complexity*, not headcount/budget.
- **Does not:** authorize building any Enterprise capability now; change the current modules; or
  introduce portfolio/identity layers into the per-event pipeline. Those remain **future
  considerations**.

---

*Recorded as a durable product principle. No implementation, no architecture change. Companion
context: `docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md`, `docs/ARCHITECTURAL_IDEA_CATALOG.md`,
`docs/FINAL_ENGINEERING_RECOMMENDATIONS.md`.*

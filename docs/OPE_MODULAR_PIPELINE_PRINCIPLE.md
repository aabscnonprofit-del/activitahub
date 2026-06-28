# OPE Modular Pipeline Principle

> **Purpose:** record the architectural decision that ActivLife Hub event creation is a
> **modular pipeline of replaceable modules**, not one monolithic OPE block.
> **Status:** living document · principle / decision.
> **Scope:** this document records a *principle*. It does **not** modify code, schema, or the
> existing OPE architecture, and it does **not** rename anything.

---

## Core decision

Event creation is composed of **distinct, replaceable modules**, connected in a pipeline:

```
Client Request
  → Discovery
  → Future Event Description
  → OPE
  → Marketplace
  → Execution
```

Each module owns a single responsibility and communicates with its neighbours through a clear
interface. **No module may take over the responsibility of another module.** The system is the
composition of these modules — it is *not* a single monolithic OPE block.

---

## 1. Module responsibilities

Each module has one responsibility and one only.

### Client Request
- **Owns:** capturing the client's initial ask in their own terms — the raw entry point, whether
  it is a concrete plan or only a desired result/emotion.
- **Produces:** a Client Request that downstream modules can act on.
- **Does not:** interpret deeply, design experiences, plan, source, or execute.

### Discovery
- **Owns:** the guided conversation that gathers enough personally meaningful material to define
  what should happen. Discovery discovers *meaning*, not planning parameters.
- **Produces:** the **Future Event Description** (see §3).
- **Does not:** plan, price, source vendors, or organize logistics. It does not implement; it
  defines what the event *should be*.

### Future Event Description
- **Owns:** being the approved, implementation-independent description of the event to be created
  — *what should happen*, the experience, the emotional result, the moments that must happen, and
  what makes it unique. It is the **hand-off contract** between Discovery and OPE.
- **Produces:** a stable, approved description that OPE consumes.
- **Does not:** specify *how* (resources, vendors, budget, timeline). Those belong downstream.

### OPE
- **Owns:** consuming the Future Event Description and **assembling everything required for its
  realization** — the structured plan: tasks, resources needed, roles, budget, risks, timeline,
  and the rest of the realization blueprint.
- **Produces:** a complete realization assembly derived from the approved description.
- **Does not:** discover meaning, find real people/vendors/availability, or track actual delivery.
  OPE plans *what is required*; it does not source it or run it.

### Marketplace
- **Owns:** finding **real people, vendors, resources, and availability** to fulfil what OPE
  assembled — matching real-world supply to the required needs, with real prices and real
  availability.
- **Produces:** concrete, available, real-world fulfilment of the assembled needs.
- **Does not:** define the event, plan the requirements, or track delivery. It connects required
  needs to real supply.

### Execution
- **Owns:** tracking **actual delivery** — what really happens as the event is realized and run.
- **Produces:** the record and status of real-world execution against the plan.
- **Does not:** discover, plan, or source. It observes and tracks the realization.

---

## 2. OPE remains a proper name

**OPE is a proper name.** It is **not** renamed, re-expanded, or reinterpreted by this document.
It is one module in the pipeline with the responsibility defined in §1; naming the other modules
(Client Request, Discovery, Future Event Description, Marketplace, Execution) does not rebrand or
redefine OPE.

---

## 3. Discovery creates the Future Event Description

**Discovery creates the Future Event Description.** The Future Event Description is the output of
Discovery and the approved, implementation-independent definition of what should happen. Discovery
is responsible for producing it; nothing upstream of Discovery defines it, and nothing downstream
rewrites its meaning.

---

## 4. OPE consumes the Future Event Description and assembles realization

**OPE consumes the Future Event Description and assembles everything required for realization.**
OPE takes the approved description as its input and produces the structured plan of what is
required to make it real (tasks, resources, roles, budget, risks, timeline). OPE assembles the
requirements; it does not define the event and does not source or run it.

---

## 5. Marketplace finds real people, vendors, resources, and availability

**Marketplace finds real people, vendors, resources, and availability.** It maps the requirements
OPE assembled onto real-world supply — actual providers, actual prices, actual availability — so
the plan can be fulfilled with real people and resources.

---

## 6. Execution tracks actual delivery

**Execution tracks actual delivery.** It follows what really happens during realization and run —
the real-world status of the event against the plan.

---

## 7. Modularity rule

Modules can later be **replaced, split, merged, extended, or improved without forcing a
full-system rewrite — as long as their interfaces remain clear.** Each module depends on its
neighbours only through their defined inputs and outputs (e.g., Discovery → Future Event
Description → OPE), never through their internals. Changing how a module works internally must not
require changing other modules, provided the interface it exposes is preserved.

---

## 8. Responsibility rule

**If a new function cannot be assigned clearly to exactly one module, the architecture needs
clarification before implementation.** A function that seems to belong to two modules, or to none,
is a signal that the module boundaries are unclear. The boundary must be clarified — and the
function assigned to a single owning module — *before* the function is built. Modules must not
absorb responsibilities that belong to their neighbours to make an ambiguous function fit.

---

## Pipeline (summary)

```
Client Request ──► Discovery ──► Future Event Description ──► OPE ──► Marketplace ──► Execution
   (capture)      (discover     (approved, implementation-   (assemble  (find real    (track
                   meaning)      independent definition)      what's     supply &      actual
                                                              required)  availability) delivery)
```

Each arrow is a clear interface; each box is a single responsibility; any box may be replaced or
improved behind its interface without rewriting the others.

---

## Non-goals of this document

- It does **not** modify code, schema, migrations, or the OPE engine.
- It does **not** rename OPE or any existing object.
- It does **not** alter other architecture documents (an optional one-line index link in
  `MASTER_PRODUCT_DECISIONS.md` aside).
- It does **not** specify implementation; it records the modular-pipeline principle to guide later
  specification.

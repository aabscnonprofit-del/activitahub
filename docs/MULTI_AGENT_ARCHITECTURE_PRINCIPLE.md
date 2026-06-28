# Multi-Agent Architecture Principle

> **Purpose:** record the decision that ActivLife Hub uses **specialized AI agents, separated
> by role** — not one universal AI brain.
> **Status:** living document · principle / decision.
> **Scope:** this document records a *principle*. It does **not** modify code, schema, or any
> existing architecture, and it does **not** rename anything. "OPE" remains a proper name.

---

## Core decision

AI responsibilities are **separated by role**. No single agent carries all responsibilities.
Each agent knows only its own job, and every agent operates on the **Project** (the aggregate
root) — never independently of it.

```
                         ┌─────────────┐
        client  ◄──────► │  Discovery  │  produces Future Event Description
                         └─────────────┘
                                │  (on Project)
                                ▼
                         ┌─────────────┐
                         │     OPE     │  extracts implementation requirements
                         └─────────────┘  (does NOT talk to the client)
                                │  (on Project)
                                ▼
        organizer ◄────► ┌─────────────┐
                         │     PSA     │  explains project state in human terms
                         └─────────────┘
                                │  (on Project)
                                ▼
                         ┌──────────────────────┐
                         │ Marketplace / Resource│  (later) finds real supply
                         └──────────────────────┘
```

The **Project is the shared center.** Agents read from and write to the Project; they do not
hold the workflow themselves and do not call each other as a monolith.

---

## Minimum agents

### 1. Discovery Agent — client-facing
- **Talks to:** the client.
- **Job:** find intent, details, constraints, and meaning through a guided conversation.
- **Produces:** the **Future Event Description**.
- **Does not:** plan, source, price, or report operational status.

### 2. OPE Agent — not user-facing
- **Talks to:** no one (it is **not** the user-facing assistant).
- **Works with:** the **Project** + its **Future Event Description**.
- **Job:** extract implementation requirements — resources, roles, dependencies, requests, and
  risks — for the approved Future Event Description.
- **Does not:** converse with the client, explain status, or find real vendors.

### 3. PSA Agent — organizer-facing
- **Talks to:** the live **organizer**.
- **Job:** connect the system to the organizer in human operational language — answer
  *"What is happening with this project right now?"* and explain what is **resolved**,
  **pending**, **needs an organizer decision**, **critical**, or **changed**.
- **Does not:** do Discovery with the client, run planning, or source resources. It interprets
  and communicates Project state; it is the **organizer-facing assistant**.

### 4. Marketplace / Resource Agent — later
- **Job (future):** search real resources, people, vendors, venues, and availability to fulfil
  what OPE extracted.
- **Status:** later. Listed here so it attaches to the Project like the others when built.

---

## Principles

- **No single AI agent carries all responsibilities.** Separation of role is mandatory.
- **Each agent knows only its own job.** It must not absorb a neighbour's responsibility.
- **Project is the shared center.** It is the aggregate root all agents operate on.
- **Agents operate on a Project, not independently.** No agent owns the workflow; the Project
  does.
- **OPE is not the user-facing assistant.** It extracts requirements; it does not converse.
- **PSA is the organizer-facing assistant.** It explains project state to the organizer.
- **Discovery is client-facing.** It gathers meaning from the client and produces the Future
  Event Description.
- **Agents can later use different models, tools, prompts, and cost profiles.** Because each
  agent is scoped to one job, each can be tuned, swapped, or priced independently without
  affecting the others — provided it keeps operating on the Project.

---

## Relationship to existing architecture

- This separation is consistent with the **modular pipeline**
  (`docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md`): Discovery, OPE, Marketplace, and Execution are
  modules that operate on a Project. The agents are the AI faces of those modules; the Project
  remains the root.
- It is consistent with the **Creative Engine & Discovery axioms**
  (`docs/CREATIVE_ENGINE_AXIOMS.md`): Discovery produces the Future Event Description (the
  approved "what should happen"); OPE consumes it.
- "OPE" is unchanged and remains a proper name. PSA, Discovery Agent, and Marketplace/Resource
  Agent are roles **alongside** OPE, not a rename or redefinition of it.

---

## Non-goals of this document

- It does **not** modify code, schema, migrations, prompts, or the OPE engine.
- It does **not** rename OPE or any existing object.
- It does **not** alter other architecture documents (an optional one-line index link in
  `MASTER_PRODUCT_DECISIONS.md` aside).
- It does **not** specify implementation; it records the multi-agent separation principle to
  guide later specification.

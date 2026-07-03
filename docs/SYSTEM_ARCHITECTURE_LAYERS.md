# System Architecture Layers

> **Status: LIVING.** This document describes the **architectural concerns** of ActivLife Hub — the distinct
> concerns from which the system is composed — and how they relate. **Architectural concerns may be
> independent or coupled; this document makes those relationships explicit so they can be reasoned about
> without conflating responsibilities.** It is a **map of concerns**: it states each concern's responsibility
> and boundary and points to the authoritative documents that define the details. It does **not** restate
> axioms or product behavior, and it **does not** introduce new architecture or product behavior. It is
> **intentionally incomplete**: where the accepted documents do not yet justify a concern's content, it is left
> open. Every statement here is derived from existing AUTHORITATIVE documents. Where this document and those
> disagree, those documents win.

---

## Purpose

Describe the architectural layers of ActivLife Hub so each layer's responsibility, boundary, and membership
are clear, and so that any single product stage can be understood as the composition of these layers (a stage
of the product architecture, producing an owned artifact, produced by an owning AI role, under human
authority, and — at execution — coordinating the external context without performing the physical work
itself).

---

## Layers

### 1. Product Architecture

- **Responsibility:** the product's stages and their ordered flow, approval gates, and the revision principle — *what the product does*, stage by stage.
- **Boundary:** from the client's intent through to a completed or archived project; the sequence of stages and the rules of passage between them.
- **Belongs here:** the pipeline stages — Discovery → Statement of Understanding → Future Event Description → Planning → Project Workspace (which includes the Execution phase) → Completed / Archived; the client‑approval and organizer‑approval gates; the revision principle (a rejected stage returns to the most recent approved stage); each stage's axioms and Product Behavior Specification as its authoritative definition.
- **Does not belong here:** which AI role performs a stage (Layer 3); which artifact a stage owns (Layer 2); who the humans are and where authority rests (Layer 4); the real‑world performance of the event (System context / external boundary); implementation or technical substrate (Layer 5).
- **Grounded in:** the Discovery, Future Event Description, Planning, and Project Workspace specifications and axioms; `ADR_009` (Execution is a Workspace phase; Completed / Archived terminal).
- **Status:** established for every stage covered by an authoritative document.

### 2. Artifact Ownership

- **Responsibility:** the artifacts the product produces, and the rule that each has exactly one authoritative owner.
- **Boundary:** the set of stage artifacts and the ownership, fidelity, failure, and approval rules over them.
- **Belongs here:** the artifacts — the Statement of Understanding, the Future Event Description, the approved Planning result, and the Project Workspace's truthful account of actual reality; one authoritative owner per artifact; an artifact is consumed downstream and never silently rewritten; an artifact is never fabricated (absent is preferred to fabricated); approval makes an artifact authoritative.
- **Does not belong here:** which AI role owns or produces the artifact (Layer 3); the stage sequence (Layer 1); the human approvers (Layer 4); implementation.
- **Grounded in:** `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`; the axioms/specs that name each artifact (Planning "never rewrites"; Project Workspace "owns the truthful account", "never fabricates").
- **Coupling:** distinct from AI Ownership (Layer 3) but **coupled** to it — an artifact is produced only by its owning AI role (`AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`), so the two concerns are bound per stage and do not evolve fully independently.
- **Status:** established.

### 3. AI Ownership

- **Responsibility:** the AI roles — one dedicated AI role per stage that produces that stage's artifact; roles kept separate; the "AI works" half of authority.
- **Boundary:** the AI roles and their separation; production of each artifact by its owning role; the failure discipline.
- **Belongs here:** a dedicated AI role per stage; separation of roles (no single universal AI); an artifact is produced only by its owning AI role; on failure the stage fails and nothing is fabricated, and no fallback or other role stands in; the AI performs the work.
- **Does not belong here:** the human decision authority — the "human decides" half (Layer 4); the artifact definitions (Layer 2); the stage flow (Layer 1); the internal construction of any AI (Layer 5 / out of scope).
- **Grounded in:** `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md`, `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`; the Planning and Project Workspace axioms (dedicated intelligence; no fabrication on failure).
- **Coupling:** distinct from Artifact Ownership (Layer 2) but **coupled** to it — each AI role exists to produce its stage's artifact, so the two concerns are bound per stage.
- **Status:** partial. Per `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`, only the **Intent Discovery AI** and the **Future Event Description AI** exist today; the Planning and Project Workspace AI roles are illustrative and not yet implemented.

### 4. Human Roles

- **Responsibility:** the humans in the system and where decision authority rests — the "human decides" half of authority.
- **Boundary:** the human role labels and their decision/approval points across stages.
- **Belongs here (as the documents state them):** the **client** — confirms the Statement of Understanding and approves the Future Event Description; the **organizer** — approves Planning and decides consequential matters in the Project Workspace; the general rule that the AI works and the human decides (approval gates and consequential decisions).
- **Does not belong here:** AI responsibilities (Layer 3); the artifacts themselves (Layer 2).
- **Grounded in:** the Future Event Description specification (client approves the FED); the Planning axioms/specification (organizer approves); the Project Workspace axioms/specification (organizer decides).
- **Status: INTENTIONALLY INCOMPLETE.** The authoritative documents name a **client** upstream (Future Event Description) and an **organizer** downstream (Planning, Project Workspace), and the Discovery specification names neither explicitly. The **relationship between client and organizer** — whether they are the same person, whether the organizer acts on the client's behalf, or whether they are distinct roles — is **not established** by any accepted document. Defining it is a genuine architectural decision, deliberately left open here rather than inferred.

### 5. Infrastructure

- **Responsibility (candidate):** the technical substrate on which the system runs.
- **Status: INTENTIONALLY INCOMPLETE.** No accepted authoritative product document establishes an infrastructure layer; the accepted architecture is behavioral and structural, not technical. Whether Infrastructure belongs in this product‑architecture layer model at all is a genuine decision not yet made, and is left open. No technical design, implementation, database, or code is asserted here — those are explicitly out of scope for this document.

---

## System context / external boundary

**The External World is not a system layer.** It is the external context/boundary established by `ADR_009`: the physical execution of the event happens **outside the system** — performed by people and vendors in the real world — while **Project Workspace owns the truthful account of that reality** (the account is a system artifact; it is not reality itself).

- **What lies here (outside the system):** the physical execution of the event (the actual doing); the real‑world actors who perform it (people, vendors); actual reality itself, which exists independently of the system.
- **Not part of the system:** everything above is outside every system layer. The system's relationship to it is only to coordinate it (at execution) and to hold a truthful **account** of it (Project Workspace, Layer 2) — the account is not reality itself.
- **Grounded in:** `ADR_009` (the actuator that performs the work is the real world — people and vendors — external to the system); the Project Workspace axioms/specification (actual reality exists independently of the system; the account is a representation, not reality itself).

---

## How the layers compose (derived view)

The concerns are **not all independent** — some are coupled (see the coupling notes on Layers 2 and 3). A
single product stage is the composition of several: a stage of **Product Architecture** (Layer 1) produces an
owned **artifact** (Layer 2), produced by an owning **AI role** (Layer 3), under **human** approval or decision
authority (Layer 4); and where a stage reaches execution, it coordinates the **external context** (see
*System context / external boundary*) without performing the physical work itself. This composition is stated
only to relate the concerns; the authoritative definition of any stage remains its own axioms and Product
Behavior Specification.

---

*This document intentionally remains incomplete until the core product architecture is finished.*

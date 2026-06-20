# OPE Discovery Engine — Principles v1

> **Type:** principles document (concepts only). **Not** UI, schema, API, code, or a new
> engine. It defines an **additive** layer; it replaces no existing OPE architecture.
> **Position in the chain:** between **Request** and **What Should Happen**.
> **Related:** `MASTER_PRODUCT_DECISIONS.md` (glossary — "what should happen", approval-before-
> planning), `OPE_CLIENT_MODE_COMPATIBILITY_AUDIT.md` (identified Discovery as the missing
> additive layer).

## Context

This document defines the **Discovery Engine** layer that exists between:

```
Request → What Should Happen
```

within the OPE architecture. It does not replace any existing OPE architecture. It defines how
OPE works when a request is **not yet sufficiently understood** to begin planning.

---

## Core principle

The purpose of Discovery is **not to collect information.**

The purpose of Discovery is to **help the client formulate a request that can be converted into
a plan.**

---

## Planning Readiness Test

Every request is evaluated against a single question:

> **Can a first viable plan be created from the information currently available?**

- **If yes** — Discovery is **skipped**; the request proceeds to planning.
- **If no** — Discovery **begins.**

---

## Discovery objective

Discovery continues until:

1. A first viable plan could reasonably be created.
2. A preliminary proposal can be presented.
3. The client **confirms** that the proposal reflects what they want.

---

## Preliminary Proposal

Discovery does **not** end with a plan. Discovery ends with a **preliminary proposal.**

**Example:**

> "I understand that your goal is for your son to feel like the central hero of the day while
> spending active time with his friends outdoors."

The proposal is a **statement of understanding.**

It is **not**:
- a plan
- a schedule
- a budget
- a scenario
- a resource list

---

## Discovery methods

Discovery may use:

- **Clarification** — questions to obtain missing information.
- **Guided Exploration** — helping the client think through options.
- **Idea Stimulation** — providing examples and directions when the client has not yet formed
  a request.
- **Comparison** — helping evaluate competing possibilities.
- **Iterative Understanding** — repeated refinement of the preliminary proposal.

---

## Discovery states

- **State A** — the desired result is known; the path is unknown.
- **State B** — a direction is known; the desired result is unclear.
- **State C** — several possible directions exist; the client is choosing.
- **State D** — no meaningful direction exists; the client has not yet formed a request.

---

## Initial Discovery trigger

When a request is **highly abstract** and no meaningful planning assumptions can be made,
Discovery should **not** begin with detailed information gathering. The client is often unable
to answer detailed questions because **the request itself has not yet been formed.** In such
situations, the first objective is **not** information collection — it is to **generate the
client's first meaningful reaction.**

**Principle:** Discovery should move the client **from abstraction to conversation.**

**Methods** (preferred): contrast; scale comparison; expectation calibration; range-based
prompts.

**Examples** — instead of *"What is your budget?"*, Discovery may use:
- "Is this closer to a simple bouquet or a million roses?"
- "Is this closer to a local weekend trip or a private island experience?"
- "Is this closer to hundreds, thousands, or tens of thousands of dollars?"
- "Is this closer to a compact family gathering or a large celebration?"

**Goal:** not to obtain precise information, but to **trigger the client's first meaningful
clarification.** Once the client reacts, Discovery may continue using the normal clarification
process.

**Rationale:** people find it easier to **react to a contrast** than to formulate a request
from scratch. A meaningful reaction creates the **first planning signal** and allows Discovery
to proceed.

---

## Completion criteria

Discovery ends when:
- planning readiness is achieved,
- a preliminary proposal exists,
- the client confirms understanding.

**Only then** may OPE proceed to planning.

---

## Relationship to existing OPE architecture

Discovery is an **additive layer.** The architecture remains:

```
Request → Discovery (if needed) → What Should Happen → Approval → Plan → Execution
```

No existing OPE planning architecture is replaced.

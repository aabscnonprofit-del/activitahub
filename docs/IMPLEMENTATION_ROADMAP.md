# Implementation Roadmap

**Status:** Living document
**Purpose:** High-level implementation roadmap for ActivLife Hub.
**Scope:** Tracks implementation progress only. This document does not define product behavior or architecture. Authoritative behavior remains in the Product Canon and related specifications.

---

## Current Status

### Documentation

- ✅ Product Philosophy
- ✅ Product Canon
- ✅ Product Principles
- ✅ Discovery Product Behavior Specification
- ✅ AI Project Modeling Principle
- ✅ Future Product Capabilities
- ✅ Engineering Process

Documentation phase is complete.

---

## Implementation Roadmap

### Phase 1 — Intent Discovery

#### Slice 1 — AI Discovery Foundation

**Status:** ✅ COMPLETE

**Implemented:**

- AI-driven Discovery
- Understand intent
- Ask minimum questions
- Zero or one clarification
- Statement of Understanding
- Stop after understanding

**Not included:**

- Planning
- Future Event Description
- Project creation

**Deployment note:** ⚠ Live OpenAI acceptance test required before production deployment.

#### Slice 2 — Future Event Description

**Status:** ⬜ Planned

**Input:** Statement of Understanding

**Output:** Future Event Description

**Purpose:** Transform understanding into a shared vision of the future event.

### Phase 2 — Planning

**Status:** ⬜ Planned

**Responsible for:**

- Budget
- Timeline
- Resources
- Vendors
- Logistics
- Tasks

Planning begins only after Discovery is complete.

### Phase 3 — Project Workspace

**Status:** ⬜ Planned

Create operational project workspace from the approved Future Event Description.

### Phase 4 — Event Execution

**Status:** ⬜ Planned

Support organizers during event preparation and execution.

### Phase 5 — Learning Loop

**Status:** ⬜ Planned

Capture outcomes. Improve future Discovery and Planning using completed projects.

---

## Current Focus

Current implementation target: **Future Event Description (Slice 2)**

No Planning work should begin until Future Event Description is implemented.

---

## Definition of Progress

The implementation sequence is:

```
Client
  ↓
Intent Discovery
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
  ↓
Learning Loop
```

Each stage must satisfy the Product Acceptance Audit before implementation continues.

The pipeline advances only through **explicit client approval gates**: the client confirms the Statement of
Understanding before a Future Event Description is created, and approves the Future Event Description before
Planning begins.

**Revision principle.** If a stage is rejected, the workflow returns to the **most recent approved stage**.
Previously approved stages remain valid unless the client explicitly changes the underlying intent.

---

## Post-Launch Research

**Status:** Deferred until after initial public launch.

The following ideas are intentionally postponed. They are considered product evolution, not launch blockers.

**Research topics:**

- Client world models
- Experience-based Discovery
- High-experience clients
- Adaptive Discovery
- Discovery conversation evolution
- Library of Discovery cases
- Client perception models
- Experience-gap hypothesis

**Guiding principle:**

Do not delay the launch for hypotheses that can be validated using real organizer/client conversations after release.

The launch priority remains:

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

Only after this implementation path is complete should Discovery evolution research become an active development track.

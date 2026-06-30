# OPE V2 — Implementation Specification

> **STATUS: HISTORICAL (2026-06-29 Architecture Canon Cleanup).** OPE V2 is a dormant, partially superseded
> lineage (M1–M3 built with zero production callers; M4 foundation only; M5–M8 unbuilt). The live planning
> spine is **Planning Engine V2 / EventPlanV2** (`lib/planning`). Kept for record; read as a parallel design,
> not current architecture. See `archive/README.md §1` and `architecture/README.md §3`.

> **Status: Production Specification.**
> This is **not** an architecture document. The architecture is complete (see
> `MASTER_PRODUCT_DECISIONS.md`, `OPE_MASTER_SPEC.md`). This document describes modules in
> enough detail to implement them directly in software. It introduces no new architecture and
> no new core concepts.

## Introduction — the production cycle

OPE V2 is built module by module. Each module passes through a fixed production cycle:

```
Specification  →  Code  →  Tests  →  Demo  →  Next Module
```

This document is the **Specification** step for **Module 1 — Discovery Engine**. Only Module 1
is specified here. Every other module (OPE Engine, Workspace, Marketplace, Resource Engine,
Project Chat, Closure Engine, Pricing, Scheduling, Execution, Monitoring, payments) is referenced
**only as a downstream stage** and is out of scope.

An engineer should be able to implement the Discovery Engine from this document alone, without
consulting the architecture documents.

---

## Global Implementation Rule (mandatory for every OPE module)

Every implementation module specified in this document — and every future one — **must** describe
all of the following sections, in this order. This template is reused by every OPE module.

1. **Purpose** — what the module does, in one paragraph.
2. **Responsibilities** — everything the module is responsible for.
3. **Responsibility Boundaries** — two explicit lists: *owns* and *does NOT own*.
4. **Inputs** — what it accepts and what it must reject.
5. **Outputs** — the exact object(s) it produces.
6. **Internal State** — temporary working state vs. persisted information.
7. **Workflow** — the full flow from entry to exit.
8. **Events** — all lifecycle events the module emits.
9. **Data Model** — the logical entities (no SQL, no ORM, no code).
10. **Acceptance Criteria** — how to verify correct implementation.
11. **Module Contract** — Consumes / Produces / Owns / Does Not Own / Next Module.

A module that cannot fill every section is not specification-complete and must not proceed to Code.

---

# Module 1 — Discovery Engine

> **Canonical anchor.** Per `MASTER_PRODUCT_DECISIONS.md` (*Planning Readiness Principle*,
> *WSH as the Planning Input*): the direct input to planning is **"What Should Happen" (WSH)** —
> the approved description of *what must happen at the event and what people should experience*.
> **Discovery develops WSH; Discovery does not create plans.** Discovery's single output is the
> **Future Event Description (FED)** — the implementation name for the approved WSH that crosses
> into OPE. FED and "approved WSH" are the same object.

## 1. Purpose

The Discovery Engine turns a client's intent into an **approved Future Event Description (FED)**
that contains **sufficient information to create a first viable plan**. It does this through a
guided conversation that progressively develops the WSH — clarifying, comparing alternatives,
calibrating expectations, and confirming understanding — until the FED is both **sufficient for
planning** and **approved by the client**. Discovery is the only module that talks to the client
to form the FED, and it is the only producer of the FED.

## 2. Responsibilities

Discovery is responsible for:

- Receiving the client's intent / request within a Project.
- Deciding, per the **Planning Readiness Principle**, whether the current understanding is already
  sufficient to create a first viable plan (**Path A — no Discovery loop needed**) or whether it
  must be developed further (**Path B — Discovery loop**).
- Conducting the clarification conversation: asking only the questions that move the FED toward
  planning-sufficiency; offering alternatives, examples, and preliminary proposals when useful.
- Maintaining and revising **working assumptions** about the client's intent as new answers arrive.
- Assessing **confidence** that the client's intent is understood sufficiently (see §9).
- Drafting the FED (the WSH: what happens + what people experience + the desired result, plus the
  client-stated context the description depends on).
- Presenting the FED to the client for **approval, rejection, or revision**.
- **Locking** the FED on approval and handing it off as the sole input to OPE.
- Emitting lifecycle events for every meaningful state change.
- Supporting **pause** and **resume** of a Discovery session without loss of state.

## 3. Responsibility Boundaries

### Discovery owns

- The client conversation that forms the FED.
- The interpretation of client intent (interpretation, assumptions, alternatives, calibration).
- The **WSH/FED content**: what should happen, what people should experience, the desired result,
  and the client-stated context required for a first viable plan.
- The **readiness decision** (sufficient-for-planning) and the **confidence** assessment.
- FED drafting, presentation, approval handling, and locking.
- The Discovery session's working and persisted state.

### Discovery does NOT own

Discovery is **explicitly not responsible for**, and must never produce or decide:

- **Planning** — tasks, phases, dependencies, the Event Plan. *(OPE Engine.)*
- **Scheduling** — dates, timelines, run-of-show. *(Scheduling / OPE.)*
- **Pricing / Budget** — cost estimates, quotes, money figures as decisions. *(Pricing / Budget.)*
- **Marketplace** — finding or selecting real vendors, venues, people. *(Marketplace / Resource.)*
- **Resources** — staffing, vendor needs, equipment, resource lists. *(Resource Engine.)*
- **Execution** — running the project, task completion, evidence. *(Execution.)*
- **Monitoring** — deviation tracking, re-planning. *(Monitoring.)*
- **Payments** — deposits, invoices, payouts. *(Payments.)*
- **Project Closure** — completion confirmation, settlement, archive. *(Closure Engine.)*

If a question during Discovery requires deciding any of the above, Discovery **records it as a
client-stated fact or constraint** (if the client volunteers it) but does not decide it. WSH/FED
never contains a timeline, staffing, vendors, budget, logistics, or a resource list.

## 4. Inputs

### Discovery accepts

- A **Project context** (the aggregate root the Discovery session belongs to) and the **client
  identity** within it.
- The **client's initial intent / request** — free text, in the client's own words.
- **Client conversation turns** — the client's answers, choices among offered alternatives,
  approvals, rejections, and revision requests.
- Optional **prefilled context** the client supplied up front (e.g., who it's for, roughly how
  many, where, when) — treated as *stated facts*, not as planning decisions.

### Discovery must reject

- **Empty or contentless intent** — no request text and no stated context → Discovery cannot begin
  forming a FED; it must prompt for intent rather than invent one.
- **Inputs that are not a client request** — out-of-scope content (not an event/activity intent).
  Discovery reports this and does not fabricate an FED.
- **Direct planning instructions in place of intent** (e.g., a pre-built schedule/budget submitted
  as the request) — Discovery does not consume these as its job; the planning-ready path is
  evaluated, but Discovery's output remains the FED, never a plan.
- **Attempts to approve a FED that does not exist or is not planning-sufficient** — rejected; the
  FED must be drafted and sufficient before it can be approved (see §10, §11).
- **Mutations to a locked FED** — a locked FED is immutable; changes require an explicit revision
  that unlocks/creates a new FED version (see §11).

## 5. Outputs

Discovery produces **exactly one output**:

> **Future Event Description (FED)** — the approved WSH.

**No other object may enter OPE.** Discovery does not emit plans, schedules, budgets, resource
lists, or vendor selections. The FED is produced in a **draft** form during the conversation and
becomes the module's true output only when it is **approved and locked**. The locked FED is the
sole hand-off to the downstream OPE Engine.

### FED Data Contract

The FED is a logical object with the fields below. Types are logical only (Text, Integer,
Identifier, Timestamp, Boolean, an enumerated value set, a List of …, or a Reference to another
logical entity). No storage, serialization, transport, or technology is implied.

| Field | Logical type | Required | Cardinality | Definition |
|---|---|---|---|---|
| `fed_id` | Identifier | yes | 1 | Stable identifier of this FED version. |
| `version` | Integer | yes | 1 | Revision number, unique and increasing within the Discovery session. |
| `lock_status` | Enum { draft, locked } | yes | 1 | Only a `locked` FED may be handed off. |
| `client_request` | Text | yes | 1 | The client's original intent, verbatim. |
| `description` | Text | yes | 1 | The WSH: what should happen + what people should experience + the desired result. Implementation-independent. |
| `stated_context` | List of ContextElement | yes | ≥1 | The planning-essential elements (see Planning Readiness Contract, §9). |
| `open_questions` | List of OpenQuestion | yes | ≥0 | Outstanding clarifications. For a valid FED, the count with `planning_essential = true` MUST be 0. |
| `approval` | Reference to ApprovalRecord | conditional | 0..1 | Present iff `lock_status = locked`. |
| `created_at` | Timestamp | yes | 1 | When this version was drafted. |
| `updated_at` | Timestamp | yes | 1 | Last change to this version (a locked version never changes after lock). |

**ContextElement** (each entry of `stated_context`):

| Field | Logical type | Required | Definition |
|---|---|---|---|
| `element_type` | Enum { event_nature, desired_result, audience_scale, location, constraint, mandatory_moment } | yes | Which planning-essential element this captures. |
| `value` | Text | yes | The element, captured from the client; never invented. |
| `confidence` | Enum { confirmed, assumed } | yes | `confirmed` = client stated/agreed; `assumed` = inferred by Discovery and surfaced to the client. |
| `source_refs` | List of Reference (ConversationTurn or ClientRequest) | yes (≥1) | Provenance for this element. |

**OpenQuestion** (each entry of `open_questions`):

| Field | Logical type | Required | Definition |
|---|---|---|---|
| `text` | Text | yes | The clarification. |
| `planning_essential` | Boolean | yes | Whether resolving it is required for planning-sufficiency. |

### FED Invariants (guaranteed when `lock_status = locked`)

A locked FED is the only artifact that enters OPE. Every locked FED guarantees ALL of the
following; a FED that cannot satisfy them MUST NOT be locked:

1. **Approved by the client.** `approval` is present and references this exact `version`.
2. **Planning-ready.** It satisfies the Planning Readiness Contract (§9): every Required element is
   present in `stated_context`, each `confirmed` or `assumed`.
3. **No critical unresolved questions.** The number of `open_questions` with
   `planning_essential = true` is 0.
4. **Internally consistent / no contradictions.** No ContextElement contradicts another; every
   contradiction detected during Discovery was revised or retracted before lock.
5. **Fully traceable (no fabrication).** Every ContextElement has `source_refs` ≥ 1, and
   `description` is derived only from `client_request` and recorded conversation turns.
6. **Immutable.** A locked FED never changes. Any later change creates a NEW `version` with
   `lock_status = draft` that must be re-approved; the locked version is retained unchanged.
7. **No prohibited content.** It contains no timeline/schedule, tasks/phases, staffing, vendor
   selection, budget/cost figures, logistics, or resource list (§10).
8. **Sole hand-off.** It is the only object passed to OPE.

## 6. Internal State

Discovery distinguishes **temporary working state** (may be discarded; not authoritative) from
**persisted information** (belongs to the Project / Discovery session; survives pause, resume, and
reload).

### Temporary working state (not authoritative; recomputed as needed)

- The current **confidence assessment** and the **readiness decision** for the latest turn.
- **Candidate next questions / alternatives** under consideration before one is chosen.
- In-flight **interpretation** of the most recent answer before it is confirmed into an assumption.
- Any transient agent reasoning used to choose the next move.

### Persisted information (authoritative; the Discovery session record)

- The **client request** (original intent, verbatim).
- The ordered **conversation history** (every client turn and every Discovery turn shown).
- The set of **confirmed assumptions** about intent (each with status: assumed / confirmed /
  revised / retracted).
- Open **clarification questions** still outstanding.
- The current **FED draft** and its **version history**.
- The **readiness flag** (planning-sufficient: yes/no) as last decided and recorded.
- The **session status** (see §13 state set) and the **approval record**.

Rule: temporary state may be regenerated from persisted information at any time; losing temporary
state must never change the Discovery outcome.

## 7. Discovery Workflow (Client Intent → FED Approved)

```
[1] Client Intent received (within a Project)
        │  reject if empty / not a request / planning instruction-as-request  (§4)
        ▼
[2] Readiness evaluation (Planning Readiness Principle)
        │
        ├── Path A: current understanding is already planning-sufficient
        │         → go to [5] (draft FED directly; no clarification loop)
        │
        └── Path B: not yet sufficient → enter the Clarification Loop [3]
        ▼
[3] Clarification Loop (repeat)  (detail in §8)
        - choose the single highest-value next move (question / alternative / example / proposal)
        - present it; record the client's answer as a conversation turn
        - update / revise working assumptions
        - re-evaluate confidence and readiness (§9)
        - exit the loop when readiness = sufficient, OR pause, OR abandon
        ▼
[4] Sufficiency reached (readiness = planning-sufficient)
        ▼
[5] FED Generation  (rules in §10)
        - assemble the FED draft (description = what happens + experience + desired result,
          plus client-stated context required for a first viable plan)
        ▼
[6] Client Approval  (§11)
        - present FED → client APPROVES / REJECTS / REQUESTS REVISION
        ├── REVISION requested → return to [3] (or [5]) with the revision as new input
        ├── REJECTED outright → session ends as rejected (no FED handed off)
        └── APPROVED → [7]
        ▼
[7] FED Locked  → emit handoff event → OPE consumes the locked FED
```

Pause may occur at any point in [2]–[6]; resume continues from the persisted state (§13).

## 8. Clarification Loop

Each iteration of the loop makes **one** decision: what is the single most useful next move toward
planning-sufficiency, or whether to stop. The loop is driven by four questions, evaluated in order:

1. **Is another question needed?**
   Yes if the **readiness decision is "not sufficient"** — i.e., the current WSH/FED could not yet
   yield a first viable plan because a planning-essential element of *what should happen* is
   unknown, ambiguous, or unconfirmed. Discovery then selects the move with the **highest expected
   contribution to sufficiency** (a clarification question, a choice between alternatives, an
   example, an expectation calibration, or a preliminary proposal) — never a fixed checklist, and
   never a planning/pricing/scheduling question (those are downstream).

2. **Does enough understanding exist?**
   Yes if the readiness decision is "sufficient" (§9). The loop stops and proceeds to FED
   generation. Discovery must **not** keep asking once sufficiency is reached (no over-collection).

3. **Must previous assumptions be revised?**
   If a new answer **contradicts or weakens** a prior assumption, Discovery revises or retracts that
   assumption (status change, recorded), recomputes readiness, and continues. A revision can move
   readiness from "sufficient" back to "not sufficient."

4. **Does uncertainty remain?**
   If understanding is sufficient overall but a **specific point is uncertain**, Discovery records
   the point as a stated assumption and may surface it for confirmation at FED presentation (§11)
   rather than blocking the loop. Unresolved, non-planning-essential uncertainty does not prevent
   sufficiency; planning-essential uncertainty does.

Loop exits: **sufficiency reached** (→ FED generation), **pause** (→ session paused, state
persisted), or **abandon** (→ session abandoned).

## 9. Confidence Model (logical, not mathematical)

Confidence is a **qualitative readiness judgement**, not a score. The single test is the canonical
Planning Readiness question applied to the WSH/FED:

> **Does the current WSH/FED contain sufficient information to create a first viable plan?**

Discovery answers this by checking that the FED can describe, from the client's own input, a
coherent *what-should-happen* that a planner could act on — i.e., the following are each either
**known and confirmed** or **safely assumable from what the client said** (never invented):

- **What should happen** — the nature of the event and the activity at its center.
- **What people should experience / the desired result** — the outcome the event must achieve.
- **For whom / scale** — who it is for and roughly how many, to the extent a first viable plan needs.
- **Where** — the place or kind of place, to the extent a first viable plan needs.
- **Hard constraints / mandatory moments** — anything the client stated must or must not happen.

Readiness is **sufficient** when every planning-essential element above is known/confirmed or safely
assumable, and no outstanding contradiction remains. Readiness is **not sufficient** when a
planning-essential element is unknown, ambiguous, or contradicted. Time/date and any resource,
budget, vendor, or scheduling detail are **not** part of this test (they are downstream). The
judgement is recomputed after every turn and after every assumption revision, and it is the only
gate that releases the loop.

### Planning Readiness Contract

This is Discovery's **frozen, local** statement of what "sufficient for a first viable plan" means,
so Discovery is self-contained and needs no other document to decide readiness. It mirrors what
downstream planning requires; if planning's needs change, this contract is updated in lockstep.
Discovery does not own this requirement — it mirrors it. It is a checklist of elements, not a
scoring formula.

**Required elements** — each must be present in the FED's `stated_context`, and each must be
`confirmed` or `assumed` (never unknown, never contradicted):

| Required element | Maps to ContextElement `element_type` | Meaning | Boundary note |
|---|---|---|---|
| Event nature | `event_nature` | What should happen — the activity at the center. | Captured from the client. |
| Desired result | `desired_result` | What people should experience / the outcome the event must achieve. | The success intent. |
| Audience & scale | `audience_scale` | For whom, and roughly how many. | Captured as a STATED FACT, not a planning decision. |
| Place | `location` | The place or kind of place. | Captured as a STATED FACT, not a planning decision. |
| Constraints / mandatory moments | `constraint` and/or `mandatory_moment` | Anything the client stated must or must not happen. | Satisfied by any such elements, OR an explicit "none stated". |

**Explicitly excluded — must NEVER be required and must NEVER block sufficiency:** date/time,
schedule, budget or cost, vendors, staffing, resources, logistics. Their absence never makes a FED
insufficient (they are downstream).

**Sufficiency rule.** Readiness = `sufficient` **if and only if** all three hold:
1. every Required element above is present and `confirmed` or `assumed`; AND
2. no ContextElement is contradicted; AND
3. no `open_questions` entry with `planning_essential = true` remains.

Otherwise readiness = `not_sufficient`.

## 10. FED Generation Rules

**When the FED may be generated:**

- Only when the readiness decision is **sufficient** (§9), **or** on the Path-A direct route where
  the original request was already planning-sufficient.
- The FED may be generated as a **draft** for client presentation (§11). It becomes the module
  output only after approval and locking.

**When the FED must NOT be generated:**

- When readiness is **not sufficient** — Discovery must continue the clarification loop instead.
- When the input was **rejected** (§4) — empty/not-a-request/out-of-scope.
- When a planning-essential element would have to be **invented** rather than taken from the client.
  Discovery never fabricates *what should happen*; if it is unknown, the loop continues.

**Mandatory FED content (a FED is invalid without all of these):**

- **clientRequest** — the original intent, verbatim.
- **description** — the WSH: *what should happen* + *what people should experience* + the *desired
  result*, expressed as an approved, implementation-independent description.
- **stated context required for a first viable plan** — the planning-essential elements from §9
  (event nature, desired result, for-whom/scale, where, hard constraints / mandatory moments) as
  **captured from the client**, each marked confirmed or assumed.
- **readiness = sufficient** and a **version** identifier.

**Prohibited FED content (must never appear):** a timeline/schedule, tasks/phases, staffing, vendor
selections, budget/cost figures as decisions, logistics, or a resource list. These belong to
downstream modules and would violate the WSH definition.

## 11. Client Approval

- **Presentation.** Discovery presents the FED draft to the client in client-facing language,
  surfacing any assumptions it made (especially points marked *assumed* rather than *confirmed*) so
  the client can correct them. Presentation does not require any planning detail.
- **Approval.** The client approves the FED. On approval, Discovery **locks** the FED (immutable),
  records an approval entry (who, when, FED version), and emits the handoff event. Only an approved,
  locked FED may enter OPE.
- **Rejection.** The client rejects the FED. The current FED draft is not handed off. The session
  moves to a **rejected** outcome. Discovery may offer to restart/refine (returning to the loop) if
  the client chooses; an outright rejection with no continuation ends the session without an FED.
- **Revision.** The client requests changes. Discovery treats the revision request as new input,
  returns to the clarification loop (§8) or to FED generation (§10) as appropriate, produces a **new
  FED version**, and re-presents it. Revisions are unlimited; each produces a new version.
- **Locking.** A locked FED is **immutable**. Any later change requires an explicit new revision
  that creates a new FED version; the previously locked version is retained in history. A locked FED
  is the only artifact OPE consumes.

## 12. Data Model (logical entities — no SQL, no ORM, no code)

- **DiscoverySession** — the unit of work; belongs to a **Project**. Holds status (§13), the client
  identity, timestamps, and references to all entities below. One active Discovery session per
  Project at a time.
- **ClientRequest** — the original intent: verbatim text plus any prefilled stated context.
- **ConversationTurn** — one entry in the ordered conversation; role (client | discovery), content,
  timestamp. Discovery turns may carry an interpretation, offered alternatives, or a question.
- **Assumption** — one interpreted fact about intent; fields: statement, source turn, status
  (assumed | confirmed | revised | retracted).
- **OpenQuestion** — an outstanding clarification still needed for sufficiency.
- **ReadinessDecision** — the latest qualitative judgement: sufficient | not_sufficient, with the
  short reason and the timestamp/turn it was computed at. (Persisted as the readiness flag; the
  transient computation is working state per §6.)
- **FutureEventDescription (FED)** — the output entity; its authoritative field list is the **FED
  Data Contract (§5)**, and its lock-time guarantees are the **FED Invariants (§5)**. Has a
  **version history**; at most one **locked** version.
- **ApprovalRecord** — who approved/rejected/requested-revision, which FED version, and when.

Relationships: a Project has one active DiscoverySession; a DiscoverySession has one ClientRequest,
many ConversationTurns, many Assumptions, many OpenQuestions, a sequence of FED versions, and an
ApprovalRecord per approval action.

## 13. Events

Discovery emits the following lifecycle events (names are logical; payloads reference the
DiscoverySession and Project):

- `discovery.session_started` — a Discovery session opened for a Project.
- `discovery.input_rejected` — input failed acceptance rules (§4), with reason.
- `discovery.turn_recorded` — a client or Discovery turn was appended.
- `discovery.assumption_added` / `discovery.assumption_revised` / `discovery.assumption_retracted`.
- `discovery.question_asked` — Discovery posed a clarification / alternative / proposal.
- `discovery.readiness_evaluated` — a readiness decision was computed (sufficient | not_sufficient).
- `discovery.fed_drafted` — a FED draft (version N) was generated.
- `discovery.fed_presented` — the FED draft was presented to the client.
- `discovery.fed_revision_requested` — the client requested changes; a new version will follow.
- `discovery.fed_rejected` — the client rejected the FED.
- `discovery.fed_approved` — the client approved the FED (version N).
- `discovery.fed_locked` — the approved FED was locked (immutable).
- `discovery.handoff_ready` — the locked FED is available as input to OPE.
- `discovery.session_paused` / `discovery.session_resumed`.
- `discovery.session_abandoned` — the session ended without an approved FED.

Session **status** set (state machine): `started → in_discovery → readiness_sufficient →
fed_drafted → fed_presented → (fed_approved → fed_locked → handed_off) | fed_rejected | abandoned`,
with `paused` reachable from any non-terminal status and returning to its prior status on resume.

## 14. Acceptance Criteria

Every criterion is objectively verifiable against the emitted events (§13), the FED Data Contract
(§5), or the Planning Readiness Contract (§9). The Discovery Engine is correct when all hold:

1. **Single output.** Across any complete session, the only object delivered downstream is one FED.
   *Verify:* the hand-off payload type is FED, and no other object type is emitted to OPE.
2. **Path A — zero questions when already sufficient.** If the first `discovery.readiness_evaluated`
   is `sufficient`, the count of `discovery.question_asked` events before `discovery.fed_drafted`
   is exactly 0.
3. **Path B — gate before draft.** No `discovery.fed_drafted` event occurs while the most recent
   `discovery.readiness_evaluated` is `not_sufficient`.
4. **Provenance (no fabrication).** In every emitted FED, every `stated_context` ContextElement has
   `source_refs` count ≥ 1. *Verify:* scan all ContextElements for empty `source_refs`; expect none.
5. **Revision recompute.** Every client turn that contradicts a `confirmed` ContextElement is
   followed by a `discovery.assumption_revised` or `discovery.assumption_retracted` event and then a
   fresh `discovery.readiness_evaluated`; the value may become `not_sufficient`.
6. **Stop condition.** No `discovery.question_asked` event occurs after the most recent
   `discovery.readiness_evaluated = sufficient`, unless a later revision sets it to `not_sufficient`.
7. **FED validity.** Every emitted FED satisfies the FED Data Contract (§5) — all required fields
   present, all enum values in range — and passes all 8 FED Invariants (§5).
8. **Approval gate.** `discovery.handoff_ready` is emitted only for a FED whose `lock_status =
   locked` and whose `approval` references that exact `version`.
9. **Immutability.** After a FED reaches `lock_status = locked`, its fields are unchanged for the
   rest of the session; any change appears as a new FED `version` with `lock_status = draft`.
   *Verify:* the locked version reads identically on every later inspection.
10. **No critical unresolved questions at lock.** For every locked FED, the count of
    `open_questions` with `planning_essential = true` is 0.
11. **Rejection.** After `discovery.fed_rejected` for a version, no `discovery.handoff_ready` is
    emitted for that version; the session status becomes `fed_rejected`, or `in_discovery` iff the
    client issued an explicit, recorded continue action (the branch is decided by that recorded
    action, not by Discovery).
12. **Pause/resume fidelity.** After `discovery.session_paused` then `discovery.session_resumed`,
    the persisted conversation, ContextElements, readiness flag, FED draft, and status equal their
    values immediately before the pause (no loss, no duplication).
13. **Readiness contract enforcement.** *Verify:* removing any one Required element (§9) from the
    inputs forces `discovery.readiness_evaluated = not_sufficient`; restoring it permits
    `sufficient`. Excluded elements (date/budget/vendors/etc.) never affect the result.
14. **Out-of-scope rejection.** An empty, non-request, or planning-instruction-as-request input
    produces `discovery.input_rejected` (with a reason) and no `discovery.fed_drafted`.
15. **Boundary enforcement.** No emitted FED contains any prohibited-content field (§10), and the
    hand-off contains no object other than the FED.
16. **Events exactly once.** Each state transition in §13 emits its corresponding event exactly once
    — no duplicates, no omissions.

## 15. Test Scenarios

Each scenario is given/when/then.

1. **Simple request (Path A).**
   *Given* a request already sufficient for a first viable plan. *When* Discovery runs. *Then* no
   clarification loop is entered; a FED draft is generated immediately, presented, approved, and
   locked. Acceptance #2, #6.

2. **Incomplete request (Path B).**
   *Given* a request missing a planning-essential element. *When* Discovery runs. *Then* readiness =
   not_sufficient, the clarification loop asks targeted questions, and a FED is drafted only after
   readiness becomes sufficient. Acceptance #3, #4.

3. **Contradictory answers.**
   *Given* a client answer that contradicts a prior confirmed assumption. *When* the answer is
   recorded. *Then* the affected assumption is revised/retracted, readiness is recomputed (may
   regress), and the loop continues until sufficiency is re-established. Acceptance #5.

4. **Customer changes mind (during draft).**
   *Given* a FED draft has been presented. *When* the client changes a requirement. *Then* Discovery
   treats it as a revision, produces a new FED version, and re-presents; prior version retained.
   Acceptance #8.

5. **Paused discovery.**
   *Given* an in-progress session. *When* the client (or system) pauses it. *Then* status becomes
   `paused`, all persisted state is intact, and no FED is handed off. Acceptance #10.

6. **Resumed discovery.**
   *Given* a paused session. *When* it is resumed. *Then* it continues from the exact prior status,
   conversation, assumptions, and FED draft, with no loss or duplication. Acceptance #10.

7. **Customer rejection.**
   *Given* a presented FED. *When* the client rejects it outright. *Then* the FED is not handed off,
   `discovery.fed_rejected` is emitted, and the session terminates as rejected (or returns to the
   loop if the client opts to continue). Acceptance #11.

8. **Empty / contentless input.**
   *Given* an intent with no request text and no stated context. *When* submitted. *Then*
   `discovery.input_rejected` is emitted and no FED is drafted. Acceptance #14.

9. **Out-of-scope input.**
   *Given* content that is not an event/activity request. *When* submitted. *Then*
   `discovery.input_rejected` (reason: out-of-scope) and no FED. Acceptance #14.

10. **Planning-instruction-as-request.**
    *Given* a pre-built schedule/budget submitted in place of intent. *When* submitted. *Then*
    Discovery does not consume it as a plan; it is rejected as not-a-request, and the only object
    Discovery can ever output remains a FED. Acceptance #1, #14, #15.

11. **Readiness regression after a draft.**
    *Given* a FED draft exists (readiness sufficient). *When* a client turn contradicts a
    `confirmed` ContextElement before approval. *Then* the element is revised/retracted, readiness
    recomputes to `not_sufficient`, the draft is not approvable, and the loop resumes.
    Acceptance #5, #3.

12. **Path-A FED rejected → Path B.**
    *Given* a directly-drafted (Path A) FED is presented. *When* the client rejects it and issues a
    continue action. *Then* the session returns to `in_discovery` and runs the clarification loop.
    Acceptance #11.

13. **Revision storm.**
    *Given* a presented FED. *When* the client requests several successive revisions. *Then* each
    yields a new FED `version`, all versions are retained, and only the finally-approved version is
    locked and handed off. Acceptance #8, #9.

14. **Immutability enforcement.**
    *Given* a locked FED. *When* a change is attempted on it. *Then* the change is refused on the
    locked version and instead produces a new draft `version`; the locked version is unchanged.
    Acceptance #9.

15. **Abandoned session.**
    *Given* an in-progress session. *When* it is abandoned (explicit abandon action). *Then* status
    becomes `abandoned`, `discovery.session_abandoned` is emitted, and no FED is handed off.

16. **Concurrent intent for the same Project.**
    *Given* a Project with an active or paused Discovery session. *When* a second intent arrives for
    the same Project. *Then* no second active session is created (one active session per Project,
    §12).

17. **FED-invariant negative (prohibited content).**
    *Given* a candidate FED that would include prohibited content (e.g., a schedule or a budget
    figure). *When* it is assembled. *Then* it fails the FED Invariants (§5) and is neither locked
    nor handed off. Acceptance #7, #15.

## 16. Implementation Notes

- **Two paths, one engine.** Implement readiness evaluation as the first step; Path A (skip the
  loop) and Path B (run the loop) are the same engine differing only on the readiness gate. Do not
  build a separate "questionnaire" path.
- **Readiness is the only loop gate.** Centralize the §9 judgement in one place; every loop
  iteration and every assumption revision calls it. Keep it qualitative (sufficient / not), with a
  short human-readable reason, not a numeric score.
- **Assumptions are first-class.** Model interpretation as explicit Assumption entities with status
  transitions; this is what makes revision (Scenario 3/4) and honest FED presentation (§11) possible.
- **Working vs persisted (§6).** Persist conversation, assumptions, readiness flag, FED versions,
  and status; recompute candidate next moves and confidence from them. Losing working state must not
  change outcomes — verify this in tests (resume).
- **FED is append-only by version.** Never mutate a locked FED; revisions create a new version.
  Keep the full version history for traceability into OPE.
- **Strict output discipline.** The handoff carries the FED and nothing else. No partial plan,
  schedule, budget, or resource hint may leak into the FED — enforce the prohibited-content check
  (§10) at FED generation.
- **Session is owned by the Project.** The DiscoverySession belongs to a Project; one active session
  per Project. Discovery references the Project as its container but does not modify Project state
  beyond its own session and the locked-FED handoff. (Project internals are out of scope here.)
- **Reject early.** Apply §4 rejection rules before any conversation cost is incurred.
- **Events are the integration surface.** Downstream modules learn of the FED only via
  `discovery.fed_locked` / `discovery.handoff_ready`; do not let other modules read Discovery's
  working state.

---

## Out of Scope (explicit)

This section consolidates what Discovery intentionally does NOT do. Everything here is owned by
another module or is deliberately left to implementation.

### Responsibilities Discovery does not own
Discovery does not perform, decide, or produce any of: planning (tasks, phases, Event Plan);
scheduling (dates, timelines, run-of-show); pricing or budgeting (cost figures, quotes); marketplace
selection (finding/choosing vendors, venues, people); resources, staffing, or vendor needs;
execution; monitoring; payments; or project closure. Discovery may RECORD client-stated facts about
these (as `stated_context`) but decides none of them, and no FED ever contains a plan, schedule,
budget, resource list, vendor selection, or logistics (§10, FED Invariants §5).

### Deliberately left to implementation (this document defines none of them)
- **Presentation / UI** — how the conversation and the FED are shown to the client.
- **Runtime realization of Discovery's reasoning** — whether decisions are made by an AI agent or
  otherwise, and any model, prompt, tooling, determinism, or fallback behavior.
- **Event delivery** — how the §13 events are transported, persisted, or subscribed to.
- **Storage** — how sessions, conversations, assumptions, or FED versions are stored.
- **Identity / authorization** — how the client is authenticated and resolved for approval;
  Discovery states only the logical rule that approval is the client's act (§11).
- **Project internals** — the Project entity beyond the facts that a Discovery session belongs to a
  Project and the locked FED is handed to it.
- **OPE's internal requirements** — Discovery mirrors the planning-sufficiency requirement as the
  Planning Readiness Contract (§9) but is not the authority for OPE's input needs.

The specification is implementation-agnostic: it defines Discovery's logical behavior, contracts,
and guarantees only.

---

## Module Contract — Discovery Engine

> This contract format is **mandatory for every future implementation module.**

- **Consumes:** a Client's intent / Request within a Project, plus the client's conversation turns
  (answers, choices, approval/rejection/revision).
- **Produces:** exactly one object — the **Future Event Description (FED)**, approved and locked
  (the approved WSH). No other object enters OPE.
- **Owns:** client understanding; development of the WSH/FED; the clarification conversation;
  working assumptions and their revision; the readiness/confidence judgement; FED drafting,
  presentation, approval, and locking; the Discovery session state.
- **Does Not Own:** planning, scheduling, pricing/budget, marketplace, resources/staffing/vendors,
  execution, monitoring, payments, project closure. (Discovery records client-stated facts about
  these but decides none of them.)
- **Next Module:** **OPE Engine** — consumes the locked FED and converts it into Implementation
  Requirements. (Specified separately; referenced here only as the downstream consumer.)

# OPE V2 — Module 4: Project Workspace (Organizer Workspace) — Production Specification

> **STATUS: HISTORICAL (2026-06-29 Architecture Canon Cleanup).** OPE V2 is a dormant, partially superseded
> lineage. Only the M4 *Foundation* subset exists in `lib/organizer-workspace` (dormant); the rest is unbuilt.
> Kept for record; read as a parallel design, not current architecture. See `archive/README.md §1` and
> `architecture/README.md §3`.

> **Status:** production specification · approved-for-implementation candidate.
> **Scope:** this document specifies *what* Module 4 is and *what it owns*. It contains **no code, no
> implementation, and no architecture redesign.** It does not rename OPE, does not modify the frozen
> engine, and does not alter Modules 1–3.
> **Sources of truth:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_MASTER_SPEC.md`,
> `docs/OPE_V2_IMPLEMENTATION_SPEC.md` (M1), `docs/OPE_V2_MODULE2_IMPLEMENTATION_SPEC.md` (M2),
> `docs/OPE_V2_MODULE3_IMPLEMENTATION_SPEC.md` (M3). Pipeline framing:
> `docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md`. Workspace continuity: `docs/OPE_WORKSPACE_V1.md`,
> `docs/M5_ORGANIZER_WORKSPACE_IMPLEMENTATION_PLAN.md`.

---

## 0. Positioning (read first)

Module 4 is the **first stateful module** in the OPE V2 pipeline. Modules 1–3 are pure, deterministic
transforms (FED → IR → Project). Module 4 is different **by design**: it is the **live, durable,
multi-user working environment** in which an organizer does the human work of preparing an event.

The central question Module 4 answers: **how does a Project become the organizer's working
environment?**

The answer: Module 4 takes the **immutable** assembled `Project` from Module 3, snapshots it as a
read-only backbone, and builds a **mutable overlay** of working state around it — statuses, notes,
checklists, attachments, decisions, collaboration, and routed marketplace results — without ever
altering the Project, the IR, or the FED. The Workspace is where structure (from OPE) becomes work
(by people), up to the moment Execution begins.

---

## 1. Purpose

A `Project` (Module 3 §5) is a correct, ordered, traceable **operational structure** — but it is
inert. It has no owner, no progress, no notes, no attachments, no collaboration, no sourced
resources, and no lifecycle. Nobody can *work* in it.

**Module 4 exists to turn the inert Project into a living Organizer Workspace** — a durable place
where one or more organizers:
- see the Project (work packages, ordering, timeline, needs, risks, cost) as their plan of record;
- record and advance **working state** (statuses, assignments, checklists);
- **collaborate** (notes, internal communication, attachments, decisions);
- **launch Marketplace requests** for needs and **route accepted results** back into the workspace;
- progress the project through a **lifecycle** (Planning → Preparation → Ready) and hand off a
  ready project to Execution.

Module 4 owns the **operational reality of preparing** the event. It does not re-plan it, source it,
or run it — those belong to other modules.

---

## 2. Responsibilities

Module 4 owns the live workspace and everything that is *organizer working state*:

1. **Open and hold the Workspace** — initialize a Workspace from a verified assembled Project,
   snapshot the Project **immutably**, and persist the Workspace durably.
2. **Project state & work-package state** — track lifecycle phase and, per work package, status,
   assignee, checklist completion, and local notes/attachments. (State *about* the Project, never
   changes *to* the Project.)
3. **Collaboration** — workspace membership, notes, internal communication (comments/threads),
   attachments, and recorded organizer decisions.
4. **Checklists** — present each work package's derived items (read-only labels), track their
   completion, and allow organizer-added custom items.
5. **Allowed manual edits** — only edits that **do not change the approved client intent or the
   Project structure** (overlay-only: statuses, notes, checklists, attachments, decisions,
   assignments, custom items).
6. **Marketplace interaction (initiator/consumer side only)** — **launch** Marketplace requests
   from Project needs, **receive** Marketplace results, let organizers **accept/decline** them, and
   **route accepted results** into the workspace overlay as references.
7. **Lifecycle & hand-off** — advance Planning → Preparation → Ready, freeze at Ready, and emit a
   **ReadyForExecution** hand-off for Execution (Module 6).
8. **Emit logical workspace events** for every state change (in-memory/log; §10).

---

## 3. Responsibility boundaries

### 3.1 What Module 4 OWNS
- The **Organizer Workspace** aggregate, its **durable state**, and its **lifecycle**.
- **Work-package working state** (status, assignee, checklists, local notes/attachments).
- **Collaboration**: members, notes, internal communication, attachments, decisions.
- **Marketplace request initiation & result routing** (the workspace side of the seam).
- The **ReadyForExecution hand-off** to Execution.
- The **allowed-edit policy** (what overlay data may change) and the **immutability guard** on the
  Project snapshot.

### 3.2 What Module 4 EXPLICITLY does NOT own
- **Discovery** (M1) — it does not gather meaning or define client intent (the FED).
- **IR generation** (M2 / OPE) — it does not author, re-author, re-price, or re-plan requirements.
- **Project structuring** (M3) — it does not create, modify, reorder, or delete work packages,
  dependencies, timeline, or carried needs/risks/cost. The Project is **immutable** here.
- **Marketplace sourcing** (M5) — it does not search/match/rank vendors, staff, or rentals, and does
  not produce real prices/availability. It only *asks* and *receives*.
- **Execution** (M6) — it does not run the event, track actual delivery, or capture run-day status.
- **Completion evidence** (M7) and **closure** (M8).
- **Payments / Stripe**, anywhere — never in this module.

### 3.3 Design-question resolution (every capability → exactly one owner)

| Capability in question | Owner | Why |
|---|---|---|
| Define client intent / meaning (FED) | **M1 Discovery** | Upstream definition. |
| Author/re-plan requirements, needs, dependencies, cost (IR) | **M2 OPE** | Planning. |
| Create/modify Project structure (work packages, graph, timeline) | **M3** | Structuring; immutable downstream. |
| **Hold the Project as a working environment** | **M4** | The workspace. |
| **Work-package status / assignment / checklists** | **M4** | Working state. |
| **Notes / communication / attachments / decisions / membership** | **M4** | Collaboration. |
| **Launch a Marketplace request; receive & route accepted results** | **M4** | Workspace is the initiator/consumer. |
| **Search/match/rank vendors·staff·rentals; real price/availability** | **M5 Marketplace** | Real-world supply. |
| **Run the event; track actual delivery / run-day status / actuals** | **M6 Execution** | Delivery. |
| Completion evidence / closure | **M7 / M8** | Their stages. |
| Re-planning when intent must change | **M1→M2→M3** (re-run) | Not an in-workspace edit (§16). |

**Rule applied (Pipeline Principle §8):** any capability that did not map cleanly to one module was
assigned a single owner above; Module 4 absorbs none of its neighbours' work.

---

## 4. Inputs

### 4.1 Accepts
- **One assembled `Project`** (Module 3 §5/§9): `status = assembled`, `version = 1`, valid per
  Module 3's `validateProject`. This is the sole structural input and becomes the **immutable
  snapshot**.
- **Organizer identity/context** (the opening member; collaboration context).
- **Workspace operations** (commands; §8) issued over the life of the Workspace.
- **MarketplaceResult** objects (from Module 5) delivered into the `receive_marketplace_result`
  operation — treated as **opaque references** to Module 5-owned results, not sourced data.

### 4.2 Verifies before opening (verify-don't-trust)
Module 4 re-verifies the incoming Project rather than trusting upstream (mirroring how M3 verifies
the IR). On `openWorkspace`:
1. **Is a well-formed, valid Project** — passes Module 3's `validateProject` (structure, partition,
   acyclic ordered graph, timeline coverage, carried-content presence).
2. **Is assembled** — `status = assembled`, `version = 1`.

Each subsequent **operation** is validated against the current Workspace (referenced ids exist; the
edit is overlay-only; the lifecycle phase permits it).

### 4.3 Rejects
**Open-time refusals (`WorkspaceRefusal`):**
| Condition | Reason |
|---|---|
| Not a well-formed / invalid Project | `invalid_project` |
| `status ≠ assembled` (or `version ≠ 1`) | `project_not_assembled` |

**Operation-time rejections (`OperationRejection`) — state unchanged:**
| Condition | Reason |
|---|---|
| References an unknown work package / need | `unknown_work_package` |
| Attempts to change immutable Project/IR/FED data | `immutable_field` |
| Operation not permitted in the current phase (e.g. edits after `ready`) | `phase_locked` |
| References an unknown / mismatched Marketplace request or result | `unknown_marketplace_ref` |
| Malformed or unknown operation | `invalid_operation` |

---

## 5. Outputs

- **The `Workspace`** — the durable, live aggregate (§9): the immutable Project snapshot + the
  mutable overlay. This is the primary output and the object the organizer interacts with.
- **Workspace events** (§10) — the logical record of every state change.
- **Outbound `MarketplaceRequest`s** — handed to Module 5 (the workspace produces the request; M5
  fulfils it).
- **`ReadyForExecution` hand-off** — produced when the lifecycle reaches `ready`; the object
  Execution (Module 6) consumes to begin running the event.

### 5.1 Workspace Invariants (hold at all times)
1. **Project immutability** — the Project snapshot (and its transitive IR/FED references and all
   structural fields: work packages, dependency graph, timeline, carried needs/risks/cost) is
   **never modified** by any Workspace operation.
2. **Overlay references are valid** — every overlay element (work-package state, note scope,
   sourced-resource attachment, marketplace request) references an element that exists in the
   Project snapshot (or a valid workspace-local id).
3. **One work-package state per work package** — the overlay holds exactly one `WorkPackageState`
   per Project work package; none extra, none missing.
4. **No re-plan inside the Workspace** — no operation changes requirement descriptions, needs,
   dependencies, timeline, or any Discovery/OPE-derived content (those require a re-plan upstream).
5. **Real supply lives only in the overlay, by reference** — accepted Marketplace results are stored
   as **references** in `WorkPackageState.sourcedResources` (owned by Module 5); they are **never**
   written back into the abstract Project.
6. **No execution / payment content** — no run-day status, no actuals, no completion evidence, **no
   payments/Stripe**. (Pre-execution preparation only.)
7. **Lifecycle is monotonic** — phase advances `planning → preparation → ready`; it never moves
   backward; at `ready` the overlay is frozen against further mutation (except the controlled
   re-open path, §7).
8. **Traceability preserved** — the Workspace carries `projectRef → irRef → fedRef`; nothing in the
   Workspace can sever this chain.

---

## 6. Internal State

Unlike Modules 1–3, **Module 4 is stateful and durable.** It owns the persistence of the Workspace
(M3 §6 explicitly delegated lineage/persistence to M4).

- **State shape:** a `Workspace` aggregate = an **immutable** `Project` snapshot + a **mutable
  overlay** (lifecycle phase, members, per-work-package state, notes, communication, attachments,
  decisions, marketplace requests). See §9.
- **Persistence:** the Workspace is durable and survives across sessions. This spec describes state
  **logically** — **no schema, table, ORM, or storage technology is designed here.**
- **Mutation model:** state changes only through the closed set of **Workspace operations** (§8).
  Each accepted operation produces a new consistent state + events; each rejected operation leaves
  state unchanged. An **append-only event log** (§10) records the history.
- **Lineage/versioning:** when a re-planned FED yields a new IR → new Project (a new Module 3
  output), Module 4 decides how the new Project relates to the existing Workspace (e.g. supersede /
  new version / migrate overlay). This **current/superseded lineage that M3 deferred is owned here**
  (§16). v1 may scope this to "a Workspace is bound to one Project version"; richer migration is a
  recorded future improvement (§13).
- **Concurrency/collaboration:** multiple members may act; operations are individually validated and
  serialized into the event log (last-writer-wins at field granularity is acceptable for v1; richer
  conflict handling is a future improvement).

---

## 7. Workflow

1. **Open** — `openWorkspace(project, openedBy)`: verify the Project (§4.2); on failure return a
   `WorkspaceRefusal`. On success, snapshot the Project immutably, seed one `WorkPackageState` per
   work package (status `not_started`, derived checklist items), add the opener as `owner` member,
   set phase `planning`. → emit `workspace.opened`.
2. **Plan / prepare (operations)** — organizers issue operations (§8): add notes / attachments /
   decisions, add members, add custom checklist items, complete checklist items, set work-package
   status / assignment. Each is validated (overlay-only, valid refs, phase-permitted) and emits its
   event; rejected operations leave state unchanged.
3. **Source via Marketplace** —
   - `launch_marketplace_request(needRef)` → create an outbound `MarketplaceRequest` (status
     `launched`) referencing an abstract need / work package. → emit
     `workspace.marketplace_request_launched`. (Module 5 fulfils it; Module 4 does not search.)
   - `receive_marketplace_result(requestId, resultRef)` → attach a received `MarketplaceResultRef`
     to the request (status `results_received`). → emit `workspace.marketplace_result_received`.
   - `accept_marketplace_result(requestId, resultId)` → route the accepted result into the relevant
     `WorkPackageState.sourcedResources` (by reference); close the request. → emit
     `workspace.marketplace_result_accepted`. `decline_marketplace_result` → emit
     `workspace.marketplace_result_declined`.
4. **Advance lifecycle** — `advance_phase` moves `planning → preparation → ready` (monotonic). At
   `ready` the overlay freezes. → emit `workspace.phase_advanced`.
5. **Hand off to Execution** — on reaching `ready`, produce a `ReadyForExecution` hand-off
   (projectRef + accepted resources + final checklist/decision summary). → emit
   `workspace.ready_for_execution`. Execution (Module 6) consumes it.
6. **Re-plan signal (no re-plan here)** — if intent must change, `request_replan` emits
   `workspace.replan_requested` (a signal to the upstream pipeline); Module 4 performs no re-planning
   and does not mutate the Project (§16).

---

## 8. Workspace Contract

Two logical surfaces (engine-agnostic; reference Module 3's `validateProject` read-only for §4.2):

```
openWorkspace(project: Project, openedBy: MemberRef) → Workspace | WorkspaceRefusal
applyOperation(workspace: Workspace, op: WorkspaceOperation) → OperationResult
```
where `OperationResult = { ok: true, workspace: Workspace, events: WorkspaceEvent[] } | { ok: false, rejection: OperationRejection }`.

**`WorkspaceOperation` is a closed, typed set** (each mutates the overlay only):
`add_note` · `add_attachment` · `record_decision` · `add_member` · `add_checklist_item` ·
`complete_checklist_item` · `set_work_package_status` · `assign_work_package` ·
`launch_marketplace_request` · `receive_marketplace_result` · `accept_marketplace_result` ·
`decline_marketplace_result` · `advance_phase` · `request_replan`.

**Contract guarantees:**
- **Total:** `openWorkspace` and `applyOperation` always return a typed result; they never throw.
- **Immutability:** no operation ever mutates the Project snapshot or its IR/FED references
  (Invariant §5.1 #1/#4); a mutating attempt is rejected `immutable_field`.
- **Atomic & safe:** a rejected operation leaves the Workspace byte-for-byte unchanged; an accepted
  operation yields a consistent Workspace + events emitted exactly once.
- **Closed surface:** only the listed operations exist; anything else → `invalid_operation`.
- **Marketplace seam:** the contract *produces* `MarketplaceRequest`s and *consumes*
  `MarketplaceResultRef`s; it never performs sourcing.

*(Whether the Workspace is updated immutably-returned or mutated-in-place is an implementation
choice (§13); the contract is specified functionally.)*

---

## 9. Data Model (logical — no SQL, no ORM, no code)

Logical types only. The carried `Project` keeps the Module 3 §9 shape **unchanged and read-only**.

### `Workspace` — aggregate root
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `workspace_id` | Identifier | yes | Stable id. |
| `projectRef` | `{ projectId, version }` | yes | Reference to the snapshot's Project. |
| `project` | Project (immutable snapshot) | yes | Read-only Module 3 Project (carries `irRef`/`fedRef`). |
| `phase` | Enum { planning, preparation, ready } | yes | Lifecycle phase (monotonic). |
| `members` | List of WorkspaceMember | yes (≥1) | At least the owner. |
| `workPackageStates` | List of WorkPackageState | yes | Exactly one per Project work package. |
| `notes` | List of Note | yes (≥0) | Project- or work-package-scoped. |
| `attachments` | List of Attachment | yes (≥0) | References to stored files. |
| `decisions` | List of Decision | yes (≥0) | Recorded organizer decisions. |
| `marketplaceRequests` | List of MarketplaceRequest | yes (≥0) | Outbound requests + received results. |
| `createdAt` / `updatedAt` | Timestamp | yes | Lifecycle timestamps. |

### `WorkPackageState`
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `workPackageId` | Identifier | yes | References a Project work package. |
| `status` | Enum { not_started, in_progress, blocked, done } | yes | Pre-execution working status. |
| `assigneeMemberId` | Identifier \| null | optional | Responsible member. |
| `checklistItems` | List of ChecklistItem | yes (≥0) | Derived + organizer-added. |
| `sourcedResources` | List of MarketplaceResultRef | yes (≥0) | Accepted results (references only). |
| `updatedAt` | Timestamp | yes | — |

### Supporting entities
- **`WorkspaceMember`** — `{ memberId, role: Enum{owner, collaborator}, addedAt }`.
- **`ChecklistItem`** — `{ id, label: Text, source: Enum{derived, organizer}, done: Boolean, completedByMemberId?, completedAt? }`. *(Derived labels are read-only; only `done`/completion is mutable.)*
- **`Note`** — `{ id, authorMemberId, body: Text, scope: Enum{project} | { workPackageId }, at }`.
- **`Attachment`** — `{ id, name: Text, ref: Text (opaque storage reference), addedByMemberId, scope, at }`. *(No file bytes in the model.)*
- **`Decision`** — `{ id, authorMemberId, summary: Text, relatesTo?: { workPackageId } | { needId }, at }`.
- **`MarketplaceRequest`** (outbound) — `{ id, needRef: { workPackageId? , needId? , kind: Text }, status: Enum{launched, results_received, closed}, launchedByMemberId, at, results: List of MarketplaceResultRef, acceptedResultId? }`.
- **`MarketplaceResultRef`** (inbound, Module 5-owned) — `{ resultId, requestId, summary: Text, receivedAt, accepted: Boolean }`. *(An opaque reference to a Module 5 result — Module 4 stores it, it does not source it.)*
- **`ReadyForExecutionHandoff`** — `{ workspaceRef, projectRef, acceptedResources: List of MarketplaceResultRef, checklistSummary, decisions, at }`.

### Contract envelope types
- **`WorkspaceRefusal`** — `{ reason: Enum{invalid_project, project_not_assembled}, message? }`.
- **`OperationRejection`** — `{ reason: Enum{unknown_work_package, immutable_field, phase_locked, unknown_marketplace_ref, invalid_operation}, message? }`.
- **`WorkspaceEvent`** — `{ type: WorkspaceEventType, at, payload? }` (§10).

---

## 10. Events

Logical domain events — **in-memory / append-only log; no queues, buses, transports.** (Persistence
of the log is part of Module 4's durable state, §6.) Each accepted operation emits its event(s)
**exactly once**; rejected operations emit none.

| Event | When |
|---|---|
| `workspace.opened` | Workspace initialized from a verified Project. |
| `workspace.member_added` | A collaborator was added. |
| `workspace.note_added` | A note was added. |
| `workspace.attachment_added` | An attachment reference was added. |
| `workspace.decision_recorded` | A decision was recorded. |
| `workspace.checklist_item_added` | An organizer checklist item was added. |
| `workspace.checklist_item_completed` | A checklist item was completed. |
| `workspace.work_package_status_changed` | A work-package status changed. |
| `workspace.work_package_assigned` | A work package was assigned. |
| `workspace.marketplace_request_launched` | A Marketplace request was launched. |
| `workspace.marketplace_result_received` | A Marketplace result was received. |
| `workspace.marketplace_result_accepted` | A result was accepted & routed into the overlay. |
| `workspace.marketplace_result_declined` | A result was declined. |
| `workspace.phase_advanced` | Lifecycle phase advanced. |
| `workspace.ready_for_execution` | Reached `ready`; hand-off produced for Execution. |
| `workspace.replan_requested` | A re-plan signal was emitted upstream (no in-workspace re-plan). |
| `workspace.operation_rejected` | An operation was rejected (state unchanged). |

---

## 11. Acceptance Criteria

Each is objectively verifiable against §5.1 invariants, the §9 data model, the §8 contract, or §10
events:

1. **Open verifies the Project.** A non-assembled / invalid Project → `WorkspaceRefusal`
   (`project_not_assembled` / `invalid_project`); a valid assembled Project → a Workspace with one
   `WorkPackageState` per work package, an owner member, phase `planning`.
2. **Project immutability.** No operation changes any field of the Project snapshot or its
   `irRef`/`fedRef`; deep-compare the snapshot before/after any operation sequence → identical.
3. **Closed, total contract.** `openWorkspace`/`applyOperation` never throw; an unknown operation →
   `invalid_operation`; a rejected operation leaves the Workspace deep-equal to before.
4. **Allowed-edit policy.** Operations that would alter requirement text, needs, dependencies,
   timeline, or other Discovery/OPE/Project-structure data are rejected `immutable_field`; overlay
   edits (status, notes, checklists, attachments, decisions, assignments, custom items) succeed.
5. **Overlay reference integrity.** Every operation referencing a work package / need / marketplace
   request validates the reference; unknown → `unknown_work_package` / `unknown_marketplace_ref`.
6. **One state per work package.** The Workspace always has exactly one `WorkPackageState` per
   Project work package (none missing, none extra, none duplicated).
7. **Marketplace seam.** `launch_marketplace_request` produces a `MarketplaceRequest` referencing an
   abstract need (no sourcing performed); accepted results are stored as `MarketplaceResultRef`
   **references** in `sourcedResources` and never written into the Project.
8. **No execution/payment content.** The Workspace contains no run-day/actuals/completion-evidence
   fields and no payment/Stripe fields.
9. **Monotonic lifecycle + freeze.** Phase only advances `planning → preparation → ready`; a
   backward move or a mutating operation after `ready` → `phase_locked`.
10. **Ready hand-off.** Reaching `ready` produces a well-formed `ReadyForExecutionHandoff` carrying
    `projectRef`, accepted resources, and the checklist/decision summary.
11. **Traceability.** `workspace.projectRef → project.irRef → project.fedRef` is intact and
    unbroken by any operation.
12. **Events exactly once.** Each accepted operation emits its event(s) once; rejected operations
    emit only `workspace.operation_rejected` (or none, per chosen convention) and change no state.

---

## 12. Test Scenarios

1. **Open from a valid Project** → Workspace in `planning`, one `WorkPackageState` per work package
   (all `not_started`), owner present, `workspace.opened` emitted.
2. **Open from a non-assembled Project** (e.g. fabricated `status` other than `assembled`) →
   `WorkspaceRefusal: project_not_assembled`, no Workspace.
3. **Complete a checklist item & set a work-package status** → overlay updates, events emitted,
   Project snapshot unchanged.
4. **Reject an immutable edit** — an operation attempting to change a requirement description /
   dependency / timeline → `immutable_field`, state unchanged.
5. **Unknown work package** — `set_work_package_status` on a non-existent id → `unknown_work_package`.
6. **Collaboration** — add a collaborator, add a note and an attachment, record a decision →
   respective events; membership/notes/attachments/decisions present.
7. **Marketplace round-trip** — launch a request for a need → receive a result reference → accept it
   → it appears in the work package's `sourcedResources` (by reference); request `closed`; the
   Project remains abstract (no real-supply data in the snapshot).
8. **Decline a marketplace result** → result not routed; `sourcedResources` unchanged.
9. **Lifecycle** — advance `planning → preparation → ready`; verify monotonicity; an attempt to move
   `ready → preparation` → `phase_locked`.
10. **Freeze at ready** — a mutating operation after `ready` → `phase_locked`.
11. **Ready hand-off** — at `ready`, a `ReadyForExecutionHandoff` is produced with `projectRef`,
    accepted resources, and summaries; `workspace.ready_for_execution` emitted.
12. **Re-plan signal** — `request_replan` emits `workspace.replan_requested` and changes neither the
    Project nor the overlay structure.
13. **Totality** — malformed/unknown operations and bad inputs never throw; always a typed result.

---

## 13. Implementation Notes

- **First stateful module.** Implement persistence as a clear capability; this spec is behavior-level
  only (no schema). Reuse and supersede the prior workspace concept (`OPE_WORKSPACE_V1`,
  `M5_ORGANIZER_WORKSPACE_IMPLEMENTATION_PLAN`) for continuity — but the V2 Workspace consumes the
  **Module 3 Project** (it does not re-run `generatePlan` or edit inputs with recompute; that is a
  re-plan, §16).
- **Verify-don't-trust.** Reuse Module 3's `validateProject` read-only at open (analogous to M3
  reusing M2's validator). Importing the Project **types** + `validateProject` is permitted; the OPE
  engine/provider/registry and the frozen engine (`lib/ope/*`) must not be imported.
- **Immutability guard.** Hold the Project snapshot read-only (e.g. deep-frozen / never passed to a
  mutator); route every change through `applyOperation` so the guard is centralized.
- **Operation surface.** Model operations as a closed discriminated union; one validator per
  operation; total `applyOperation`.
- **Event log.** Append-only; the Workspace's history is part of its durable state.
- **Suggested module home:** a new self-contained module (e.g. `lib/workspace/`), depending only on
  the Project contract from `lib/project` (and its `validateProject`), never on Marketplace/Execution
  internals.
- **Recorded future improvements:** richer collaboration/conflict resolution; multi-Project-version
  migration of an existing Workspace; portfolio/multi-event dashboard; per-package needs/risks once
  the IR provides requirement-level links (M3 §13).

---

## 14. Out of Scope

- **Discovery / meaning gathering** (M1); **IR generation / re-planning** (M2/OPE); **Project
  structuring or any change to the Project** (M3).
- **Vendor / staff / rental search, matching, ranking; real prices/availability** (M5).
- **Marketplace request *fulfilment*** (M5) — Module 4 only launches/receives/routes.
- **Event execution, run-day tracking, actuals, deviations** (M6); **completion evidence** (M7);
  **closure** (M8).
- **Payments / Stripe / payouts** — entirely.
- **Real calendar scheduling / real dates** — the Workspace keeps the relative timeline; real dates
  belong to Execution.
- **Schema / storage / API / UI design** — behavior-level specification only.

---

## 15. Module Contract

**Logical contract (engine-agnostic; the Project is immutable input):**

```
openWorkspace(project: Project, openedBy: MemberRef) → Workspace | WorkspaceRefusal
applyOperation(workspace: Workspace, op: WorkspaceOperation) → OperationResult
```

- **Total:** always returns a typed result; never throws.
- **Project-immutable:** never mutates the Project snapshot, IR, or FED; mutating attempts → rejected.
- **Overlay-only edits:** the closed operation set changes only workspace overlay state.
- **Verify-don't-trust:** verifies the Project at open (`validateProject`, assembled); refuses
  otherwise.
- **Marketplace seam:** produces `MarketplaceRequest`s, consumes `MarketplaceResultRef`s; performs
  no sourcing.
- **Execution hand-off:** at `ready`, produces a `ReadyForExecutionHandoff`; performs no execution.
- **Stateful & durable:** owns Workspace persistence and the append-only event log (the one stateful
  module so far, by design).

---

## 16. Design rationale & boundary justifications (explicit answers)

- **Why Module 4 exists.** A Project is structure, not work. Someone must *own* it, progress it,
  annotate it, collaborate on it, source for it, and carry it to the point of execution. That living,
  durable, multi-user environment is real, distinct work — and it must exist in exactly one place so
  state is not re-invented by every consumer. Module 4 is that place.
- **Why Module 3 is not enough.** Module 3 is a pure, stateless, deterministic transform that emits
  an **inert** Project: no owner, no status, no notes, no attachments, no sourced resources, no
  lifecycle, no persistence. It deliberately stops at structure (M3 §6 delegates state/persistence/
  lineage to M4). Everything an organizer *does* with the plan is outside M3 by design.
- **Why Marketplace is not part of Workspace.** Marketplace deals in **real-world, external,
  non-deterministic supply** — searching, matching, ranking, real prices, real availability. Folding
  that into the Workspace would mix an organizer's local working state with a live external sourcing
  engine, and would pull real-supply data into a module whose backbone (the Project) is abstract by
  contract. The clean seam: the Workspace *launches a request* and *routes accepted results*;
  Marketplace *does the sourcing*. Two responsibilities, two modules.
- **Why Execution is not part of Workspace.** The Workspace owns **preparation** — human work
  **before** the event runs. Execution owns **actual delivery** — what really happens during the run
  (status, actuals, deviations). These are different time horizons and different truth sources
  (planned/prepared vs. actual). The Workspace freezes at `ready` and hands off; Execution begins
  there. Merging them would conflate "what we prepared" with "what actually happened."
- **What information is allowed to change inside the Workspace.** Only **overlay** data:
  lifecycle phase (forward only); work-package status & assignment; checklist **completion** and
  organizer-added custom items; notes, internal communication, attachments, decisions; workspace
  membership; launched Marketplace requests and **references** to accepted results. None of these
  alter the meaning or structure of the plan.
- **What is immutable because it belongs to Discovery or OPE.** Everything upstream of the Workspace:
  the **FED / approved client intent** (Discovery, M1); the **IR** — requirements, abstract needs,
  dependencies, risks, cost estimate (OPE, M2); and the **Project structure** — work-package
  identity/phase/requirement mapping, dependency graph, ordering, timeline, carried needs/risks/cost,
  and `irRef`/`fedRef` (M3). The Workspace references these read-only. Changing any of them is a
  **re-plan** — it must go back through M1→M2→M3 and produce a new Project; the Workspace can only
  *signal* that need (`request_replan`), never perform it.

---

*Specification only. No code, no implementation, no architecture redesign. The frozen engine and
Modules 1–3 are unchanged. Nothing committed or pushed.*

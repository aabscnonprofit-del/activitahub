# OPE V2 — Module 3: Implementation Requirements (Project Assembly) — Production Specification

> **Status:** production specification · approved-for-implementation candidate.
> **Scope:** this document specifies *what* Module 3 is and *what it owns*. It contains **no code,
> no implementation, and no architecture redesign.** It does not rename OPE, does not modify the
> frozen engine, and does not alter Modules 1–2.
> **Sources of truth:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_MASTER_SPEC.md`,
> `docs/OPE_V2_IMPLEMENTATION_SPEC.md` (Module 1), `docs/OPE_V2_MODULE2_IMPLEMENTATION_SPEC.md`
> (Module 2). Pipeline framing: `docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md`.

---

## 0. Naming — resolving the "Implementation Requirements" overlap (read first)

In the module map (`docs/OPE_V2_MODULE_STATUS.md`) Module 3 is titled **Implementation
Requirements**. The **Implementation Requirements (IR) object itself is produced and owned by
Module 2 (OPE Engine)** — see Module 2 §5/§12. To keep **exactly one owner per responsibility**,
this spec draws the line precisely:

- **Module 2 (OPE) owns the IR *data contract* and its *production*** — *what* is required
  (requirements, abstract resource/role needs, dependencies, risks, relative timeline, cost
  estimate). The IR is engine-agnostic and **not executable as-is**.
- **Module 3 owns the *operationalization* of that IR** — transforming the flat, abstract IR into
  an **operational Project structure** that downstream modules (Workspace, Marketplace, Execution)
  can act on. Module 3 **does not author, extend, re-price, or re-plan** the IR's content.

For clarity, Module 3's functional name is **Project Assembly**, and its output object is the
**Project** (the operational project structure / aggregate root in its initial *assembled* state).
The module-map title "Implementation Requirements" denotes the **pipeline stage centred on the
IR**, not a second authority over the IR contract.

---

## 1. Purpose

The IR is a correct but **abstract and flat** description of what an event requires: independent
lists of requirements, needs, dependencies, risks, and relative phases. It is engine-agnostic by
design and carries no operational structure. Nothing downstream can execute a flat IR directly.

**Module 3 exists to perform the one-time, deterministic transform IR → Project** — to turn the
abstract requirements into an **operational project structure**: requirements organized into
**work packages**, a **validated, ordered dependency graph**, and a **sequenced (still relative)
timeline**; with the IR's abstract `resourceNeeds`, `roleNeeds`, `risks`, and cost estimate
**carried through unchanged at the Project root** — all with full traceability back to the IR and
FED. The Project is the **single aggregate root** every downstream module then attaches to, so
structure is derived **once**, here, rather than re-derived (and diverging) in each downstream
module.

---

## 2. Responsibilities

Module 3 is a **pure, deterministic, stateless transform**. Given one valid IR it:

1. **Verifies the IR** (verify-don't-trust at the seam, mirroring how OPE verifies the FED). A
   malformed / invalid / non-current / unstructurable IR is refused — never partially assembled.
2. **Creates one Work Package per Requirement (v1 grouping rule).** Each IR requirement becomes
   exactly one work package; the partition is therefore the identity mapping (every requirement in
   exactly one package, every package holding exactly one requirement). See §7 for the deterministic
   id/name/phase derivation. *(A richer many-requirements-per-package grouping is deferred; see §13.)*
3. **Lifts and validates the dependency graph** — promotes the IR's requirement-level dependencies
   to **work-package-level** edges (§7.4), drops any intra-package edge, validates the graph is
   **acyclic**, and computes a valid **execution ordering** (topological order). It invents **no
   new** dependencies; a cycle → refusal (`unstructurable_requirements`).
4. **Sequences the timeline** — orders work packages within and across the IR's relative phases
   (`preparation → day_of → after`). The timeline remains **relative** (no real calendar dates).
5. **Carries needs, risks, and cost at the Project root, unchanged** — copies the IR's
   `resourceNeeds`, `roleNeeds`, `risks`, and cost estimate **byte-for-byte to the Project root**.
   It does **not** attach them to individual work packages in v1 (see C-1 resolution in §13), and
   does **not** enrich, route, source, or re-price them.
6. **Assembles the Project** — produces the Project aggregate with stable, deterministic operational
   identities and records transitive provenance (Project → IR → FED).
7. **Emits logical domain events** for the transform (in-memory; no transport/persistence).

---

## 3. Responsibility boundaries

### 3.1 What Module 3 OWNS
- The **IR → Project transform** and the **Project (operational structure)** object/contract.
- **Work-package creation** from requirements (v1: one package per requirement — the partition).
- **Materializing, validating (acyclic), and ordering** the dependency graph at work-package level.
- **Sequencing** the relative timeline into an ordered operational plan.
- **Carrying** the IR's abstract needs/risks/cost at the **Project root**, unchanged.
- **Transitive traceability** (Project → IR → FED) and **structural integrity** of the Project.

### 3.2 What Module 3 EXPLICITLY does NOT own
- **Authoring / extending / re-pricing / re-planning requirements, needs, or dependencies** — that
  is OPE (Module 2). Module 3 treats the IR as **immutable input**.
- **Real-world fulfilment** — finding real vendors/people, real prices, real availability, or
  preparing sourcing/RFQ requests — that is **Resource Marketplace (Module 5)**.
- **The live workspace** — UI, collaboration, ongoing edits, the organizer's working surface, and
  the Project's *ongoing* lifecycle/state — that is **Project Workspace (Module 4)**. Module 3
  produces the Project's **initial assembled state**; Module 4 owns its life thereafter.
- **Execution / progress / status tracking** and **real calendar scheduling (real dates)** — that
  is **Execution Tracking (Module 6)**.
- **Completion evidence** (Module 7) and **closure** (Module 8).
- **Payments / Stripe**, anywhere — never in this module.

### 3.3 Design-question resolution (every capability → exactly one owner)

| Capability in question | Owner | Why |
|---|---|---|
| Authoring requirements / abstract needs / dependencies / risks / cost | **M2 OPE** | "What is required" — planning. |
| Resolving abstract need quantities (e.g. `per_guest × count`) | **M2 OPE** | Part of "what's required"; already in the IR. |
| **Creating work packages from requirements** (v1: one per requirement) | **M3** | Core M3 structuring. |
| **Materializing / validating (acyclic) / ordering** the dependency graph | **M3** | Structuring; OPE *built* the dependencies, M3 makes them executable. |
| **Sequencing** the relative timeline (ordering, still relative) | **M3** | Structuring. |
| **Carrying** abstract needs/risks/cost at the Project root, unchanged | **M3** | Carry-through; no modification. |
| **Attaching** needs/risks to *specific* work packages | **deferred (§13)** | No requirement↔need/risk link exists in the IR yet. |
| **Enriching** ResourceNeeds / RoleNeeds with real vendors/people/prices/availability | **M5 Marketplace** | Real-world supply. |
| **Routing/deciding** how a need is fulfilled (source vs self-provide) | **M4 Workspace** (organizer decision) + **M5** (sourcing) | A live decision; M3 only makes needs addressable. |
| Preparing **Marketplace requests / RFQs** | **M5 Marketplace** | Marketplace owns demand→supply. |
| Preparing the **Project Workspace** (UI, state, collaboration, progress surface) | **M4 Workspace** | Workspace owns interaction & ongoing state. |
| Preparing **Execution Tracking** (status, progress, owners, reminders) | **M6 Execution** | Execution owns actual delivery. |
| **Expanding the timeline into real calendar dates** | **M6 Execution** (scheduling at run) | Real dates are a delivery concern. |
| Completion evidence / closure | **M7 / M8** | Their own stages. |

**Rule applied (Pipeline Principle §8):** any capability that did not map cleanly to exactly one
module was assigned to a single owner above; Module 3 absorbs none of its neighbours' work.

---

## 4. Inputs

### 4.1 Accepts
- **Exactly one Implementation Requirements (IR) object** as defined by Module 2 §12 — the object
  the OPE Contract returned as `ok` (so it has already passed OPE's structural + IR-invariant
  checks). The IR is self-contained and carries `fedRef` (transitive provenance to the FED).

### 4.2 Verifies before assembling (verify-don't-trust)
Module 3 re-verifies its input rather than trusting the upstream module. It checks, in order:
1. **Is a well-formed, structurally valid IR** (Module 2 §12 contract: required fields, enums,
   cardinality, internal consistency, CostEstimate shape, provenance present).
2. **Is current** — `status = current` (a `superseded` IR is not assembled).
3. **Is structurable** — has ≥1 requirement, and its dependencies (after lifting to work packages
   and dropping self-edges, §7.4) form an **acyclic** work-package graph; a cycle cannot be ordered
   into an executable plan and is detected during dependency resolution.

### 4.3 Rejects (typed refusal — no partial Project)
| Condition | Refusal reason |
|---|---|
| Not a well-formed / structurally invalid IR | `invalid_ir` |
| `status ≠ current` (e.g. superseded) | `ir_not_current` |
| No requirements, or dependency cycle (cannot be ordered) | `unstructurable_requirements` |

Module 3 does **not** re-verify FED↔IR traceability (it has no FED) — that guarantee was enforced
by OPE (Module 2 §5). Module 3 carries `fedRef` through unchanged.

---

## 5. Outputs

Module 3 produces **exactly one** object, or a typed Refusal:

- **`Project`** — the operational project structure (aggregate root) in its initial **assembled**
  state. Single hand-off object; nothing else enters the downstream pipeline.
- **`Refusal { reason, message? }`** — when input verification or structuring fails (§4.3).

### 5.1 Project Invariants (guaranteed for every assembled Project)
1. **Requirement partition (1:1 in v1)** — there is exactly one work package per IR requirement and
   exactly one requirement per work package; the union of all `WorkPackage.requirementIds` equals
   **exactly** the IR's set of requirement ids, with each list of length 1.
2. **Acyclic, ordered graph** — the work-package dependency graph is acyclic; the recorded `order`
   is a valid topological order of all work packages; every edge references existing work packages.
3. **No invented dependencies** — every Project dependency edge derives from an IR
   requirement-level dependency (M3 adds none); intra-package (self) edges are dropped.
4. **Phase consistency** — each `WorkPackage.phase` equals its requirement's `phase`, and every
   phase present appears in the sequenced timeline.
5. **Carry-through, unchanged (root)** — the Project root's `resourceNeeds`, `roleNeeds`, `risks`,
   and `costSummary` are carried from the IR **byte-for-byte** (content not modified, enriched,
   routed, or re-priced). In v1 they live **only at the Project root**, not on work packages.
6. **No real-world / downstream content** — no real vendors/people/availability, **no payments or
   Stripe**, **no real calendar dates**, **no execution/progress/status state**, and **no workspace
   UI state**. (IR invariants are preserved; M3 introduces none of these.)
7. **Content guard on M3-added text** — every text Module 3 *adds* (only `WorkPackage.name`) is
   derived solely from already-validated IR text and is subject to the same content prohibitions as
   the IR (Module 2 §5 #3–#7); M3 introduces no free text from outside the IR.
8. **Transitive traceability** — `Project.irRef` identifies the input IR, `Project.fedRef` equals
   the IR's `fedRef`, and every work package carries `derivedFrom` (≥1 IR provenance, copied from
   its requirement).
9. **Engine-/provider-agnostic** — the Project contains no field naming an OPE engine, provider, or
   the frozen engine; it is derived solely from the IR contract.
10. **Fixed assembled identity (v1)** — every assembled Project has `version = 1` and
    `status = assembled`; current/superseded lineage is **not** Module 3's concern (see §6).

---

## 6. Internal State

- **None (stateless, per-request).** Module 3 is a pure transform: one IR in → one Project (or
  Refusal) out. It holds **no session, no persistence, no mutable cross-call state**, and **does not
  read the system clock** (see `createdAt`, §7/§9).
- Module 3 **always** emits a Project with `version = 1` and `status = assembled`. It receives only
  the IR and therefore cannot — and does not — know about prior Projects.
- **All lineage / version / current / superseded semantics belong to Module 4 (Project
  Workspace).** When the same FED is re-planned and a new IR version arrives, Workspace decides how
  the resulting Project relates to prior ones (versioning, supersession, "at most one current");
  Module 3 takes no part in that decision. This keeps Module 3 stateless and deterministic: the
  **same IR input always produces an identical Project output** (§10 #10).

---

## 7. Workflow

Deterministic pipeline; total (always returns `Project` or `Refusal`; never throws). All derivations
below are **pure functions of the IR** — no clock, no randomness, no external state.

The transform (`assembleProject`) is **pure and emits no events**; the logical events of §8 are
added by a thin wrapper (`assembleProjectWithEvents`) that calls `assembleProject` **once** and maps
the single outcome to events (it does not change the transform). The event mapping is **reason-based**
(see §8), so a failure detected during verification still maps to the appropriate event.

1. **Receive** the IR.
2. **Verify** the IR (§4.2). On failure, return the Refusal — **no partial Project.** (The event
   layer then maps the refusal reason: `invalid_ir` / `ir_not_current` → `project.ir_rejected`;
   `unstructurable_requirements` → `project.assembly_failed`.)
3. **Create work packages (v1 rule: one per requirement).** For each IR requirement `r`, in IR
   `requirements` order, create one work package with:
   - `id` = `wp-<r.id>` (deterministic function of the requirement id; stable, unique).
   - `requirementIds` = `[r.id]` (exactly one).
   - `phase` = `r.phase`.
   - `name` = **derived from `r.description`**: trimmed, internal whitespace collapsed to single
     spaces, truncated to a fixed maximum of **120 characters** (no clock, no ids, no randomness).
   - `derivedFrom` = `r.derivedFrom` (≥1 provenance, preserving traceability).
4. **Lift & resolve dependencies.** For each IR `Dependency { fromRequirementId, toRequirementId,
   type }`, produce one work-package edge `{ fromWorkPackageId: wp-<from>, toWorkPackageId:
   wp-<to>, type }`. **Drop any intra-package (self) edge** (`from === to`). Since v1 has one
   requirement per package, every inter-requirement dependency maps to exactly one package edge.
   (Acyclicity was already established in step 2 — a cycle is refused there as
   `unstructurable_requirements`.) Compute `order` = a deterministic topological sort (ties broken
   by work-package `id` ascending).
5. **Sequence the timeline.** Emit a phase entry for each phase present among work packages, in the
   canonical order `preparation → day_of → after`; within each phase list its work-package ids in
   `order` (topological) sequence. `relativeWindow` per phase = the `relativeWindow` of the **first
   IR `TimelineElement` of that phase in IR `timeline` order** (or `null` if none / none set). The
   timeline is **relative only** — never a real date.
6. **Carry needs, risks, and cost at the root** — copy the IR's `resourceNeeds`, `roleNeeds`,
   `risks`, and cost estimate **unchanged** onto the Project root (not onto work packages in v1).
7. **Assemble the Project** — set `version = 1`, `status = assembled`,
   `irRef = { id: ir.ir_id, version: ir.version }`, `fedRef = { id: ir.fedRef.fedId, version:
   ir.fedRef.fedVersion }` (carried), and `createdAt = ir.createdAt` **carried forward**
   (deterministic — Module 3 never reads the clock). Validate with `validateProject`; on failure
   return `unstructurable_requirements`. Return the `Project`. (On success the event layer emits
   `project.work_packages_built → project.dependencies_resolved → project.assembled`.)

---

## 8. Events

Logical domain events only — **in-memory, returned on the result; no queues, buses, transports, or
persistence**. Emitted by the wrapper `assembleProjectWithEvents` (§7), which calls `assembleProject`
once and maps the single outcome to events. Each is emitted **exactly once** per call. The mapping
is **reason-based** — `project.requested` always fires first, then exactly one of the branches below.

| Event | When |
|---|---|
| `project.requested` | A Project assembly is requested (always first). |
| `project.ir_rejected` | Refusal `invalid_ir` or `ir_not_current`; carries the reason. No Project. |
| `project.assembly_failed` | Refusal `unstructurable_requirements` (e.g. dependency cycle or zero requirements) — **even when detected during verification**. Carries the reason. No Project. |
| `project.work_packages_built` | Success: requirements partitioned into work packages. |
| `project.dependencies_resolved` | Success: dependency graph lifted, validated acyclic, ordered. |
| `project.assembled` | Success: Project fully assembled and returned (success terminal). |

Ordering — `requested` then exactly one branch:
- refusal `invalid_ir` / `ir_not_current` → `ir_rejected`
- refusal `unstructurable_requirements` → `assembly_failed`
- success → `work_packages_built` → `dependencies_resolved` → `assembled`

Note: because the mapping is by refusal **reason** (not by where the failure was detected),
`unstructurable_requirements` always yields `assembly_failed`, even though a cycle / zero
requirements is caught during verification — no `work_packages_built` precedes it.

---

## 9. Data Model (logical — no SQL, no ORM, no code)

Logical types only (Text, Integer, Boolean, Identifier, Timestamp, Enum, List of …, Reference).
Carried IR sub-objects (`ResourceNeed`, `RoleNeed`, `Risk`, `CostEstimate`, `ProvenanceRef`) keep
the Module 2 §12 shapes **unchanged**.

### `Project` — root (operational structure)
| Field | Logical type | Required | Cardinality | Definition |
|---|---|---|---|---|
| `project_id` | Identifier | yes | 1 | Stable id of this Project (deterministic, e.g. `proj-<irId>-<irVersion>`). |
| `version` | Integer | yes | 1 | **Always `1` in v1** — Module 3 emits no lineage; versioning is M4's (§6). |
| `status` | Enum { assembled } | yes | 1 | **Always `assembled`** — current/superseded lineage is M4's (§6). |
| `irRef` | ProjectReference | yes | 1 | The IR this Project derives from (`{ id, version }`). |
| `fedRef` | ProjectReference | yes | 1 | Carried from the IR (`{ id, version }`; transitive provenance to the FED). |
| `workPackages` | List of WorkPackage | yes | ≥1 | One per IR requirement (v1). |
| `dependencyGraph` | DependencyGraph | yes | 1 | Validated, ordered work-package dependencies. |
| `timeline` | TimelinePlan | yes | 1 | Sequenced, relative phase plan. |
| `resourceNeeds` | List of ResourceNeed (carried) | yes | ≥0 | IR resource needs, **unchanged**, at root (v1). |
| `roleNeeds` | List of RoleNeed (carried) | yes | ≥0 | IR role needs, **unchanged**, at root (v1). |
| `risks` | List of Risk (carried) | yes | ≥0 | IR risks, **unchanged**, at root (v1). |
| `costSummary` | CostEstimate (carried, read-only) | yes | 1 | IR cost estimate, unchanged. |
| `createdAt` | Timestamp | yes | 1 | The IR's `createdAt`, **carried forward** (no system clock; deterministic). |

### `WorkPackage` (v1: holds exactly one requirement; no needs/risks attached — see §13)
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `id` | Identifier | yes | `wp-<requirementId>` — deterministic, stable, unique. |
| `name` | Text | yes | Derived from the requirement's `description`: trimmed, whitespace-collapsed, ≤120 chars. No engine ids, clock, or randomness. |
| `phase` | Enum { preparation, day_of, after } | yes | Equals the requirement's `phase`. |
| `requirementIds` | List of Identifier | yes (=1) | Exactly one IR requirement id. |
| `dependsOn` | List of Identifier | yes (≥0) | WorkPackage ids this package depends on (from §9 `DependencyGraph.edges`). |
| `derivedFrom` | List of ProvenanceRef | yes (≥1) | Copied from the requirement's `derivedFrom` (transitive to FED). |

### `DependencyGraph`
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `edges` | List of `{ fromWorkPackageId, toWorkPackageId, type }` | yes (≥0) | One per IR requirement dependency: `from`/`to` = `wp-<reqId>`; **self-edges (`from === to`) dropped**; both ids reference existing WorkPackages; `type` carried from the IR (`finish_to_start` \| `requires`). |
| `order` | List of Identifier | yes | A valid topological ordering of **all** WorkPackage ids; ties broken by `id` ascending (deterministic). Acyclic is guaranteed (a cycle is refused upstream). |

### `TimelinePlan` (relative — no real dates)
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `phases` | List of `{ phase: Enum{preparation,day_of,after}, workPackageIds: List of Identifier, relativeWindow: Text \| null }` | yes (≥1) | Phases present among work packages, in canonical order `preparation → day_of → after`; each lists its work packages in `order` sequence; `relativeWindow` = the `relativeWindow` of the **first IR `TimelineElement` of that phase** (in IR `timeline` order), else `null`. **Never a real date.** |

### References
- **`ProjectReference`** — `{ id: Identifier, version: Integer }`. Used for **both** `irRef` and
  `fedRef` (a single generic reference shape):
  - `irRef = { id: ir.ir_id, version: ir.version }`
  - `fedRef = { id: ir.fedRef.fedId, version: ir.fedRef.fedVersion }` (carried from the IR).

### Version / current semantics → owned by Module 4
Module 3 always emits `version = 1`, `status = assembled`, and takes **no** part in
current/superseded lineage. When a re-planned FED yields a new IR version, **Module 4 (Project
Workspace)** decides how the new Project relates to prior ones (versioning, supersession, "at most
one current"). This keeps Module 3 stateless and deterministic.

---

## 10. Acceptance Criteria

Each is objectively verifiable against the Project Data Contract (§9), the Project Invariants (§5),
or events (§8):

1. **IR-agnostic, engine-agnostic.** Module 3 imports only the IR data contract (`lib/ope-engine/
   types`) and **may reuse Module 2's IR structural validator** (`lib/ope-engine/ir` —
   `validateImplementationRequirements`) for verify-don't-trust, mirroring how OPE reuses Module 1's
   validators. It must **not** import the OPE engine/contract/provider/registry or the frozen engine
   (`lib/ope/*`). *Verify by inspecting imports.*
2. **Total.** `assembleProject` returns a `Project` or a `Refusal` (reason ∈ §4.3) for every input;
   it never throws.
3. **Refusal coverage.** Each reason (`invalid_ir`, `ir_not_current`, `unstructurable_requirements`)
   is reachable by some input, and yields **no Project**.
4. **Requirement partition (1:1).** There is exactly one work package per IR requirement and exactly
   one requirement per work package; the union of `WorkPackage.requirementIds` equals the IR
   requirement set exactly, every list has length 1, and `wp-<reqId>` ids are unique.
5. **Acyclic, ordered graph.** `dependencyGraph.order` is a valid topological order of all work
   packages (ties by id ascending); every edge references existing packages; no cycle; no self-edge.
6. **No invented dependencies.** Every dependency edge maps to a non-self IR requirement-level
   dependency, and every non-self IR dependency maps to exactly one edge.
7. **Carry-through unchanged (root).** The root `resourceNeeds`, `roleNeeds`, `risks`, and
   `costSummary` are equal field-for-field to the IR's. **No work package carries needs or risks**
   in v1 (`WorkPackage` has no `resourceNeeds`/`roleNeeds`/`riskIds` fields).
8. **No downstream/real-world content.** The Project contains no real vendor/person/availability,
   no payment/Stripe field, no real calendar date, no execution/progress/status field, and no
   workspace-UI field. *Verify per category.*
9. **Content guard on added text.** Every `WorkPackage.name` passes the IR content prohibitions
   (Module 2 §5 #3–#7) and is a pure transform of its requirement's already-validated `description`.
10. **Traceability.** `irRef` matches the input IR; `fedRef` equals the IR's `fedRef`; every work
    package's `derivedFrom` equals its requirement's `derivedFrom` (length ≥ 1).
11. **Fixed assembled identity.** Every assembled Project has `version === 1` and
    `status === 'assembled'`.
12. **Determinism.** The same IR assembled twice yields a Project equal field-for-field (ids, order,
    names, `createdAt` all deterministic; no clock/randomness).
13. **Empty-needs tolerance.** An IR with zero `resourceNeeds`/`roleNeeds` (e.g. current frozen
    adapter output) still produces a valid Project (root need lists may be empty).
14. **Cycle refusal.** An IR whose (non-self) requirement dependencies form a cycle → no Project,
    refusal `unstructurable_requirements`.
15. **Events exactly once.** The §8 events fire exactly once each, in a valid ordering; failures
    emit `project.ir_rejected` or `project.assembly_failed` and hand off no Project.

---

## 11. Module Contract

**Logical contract (engine-agnostic, total, deterministic):**

```
assembleProject(ir: IR) → Project | Refusal
```

- **Total:** always returns a `Project` or a typed `Refusal`; never throws.
- **Deterministic:** identical IR input → identical Project (stable ids, ordering).
- **Verify-don't-trust:** verifies the IR (§4.2) before assembling; refuses (§4.3) rather than
  emitting a partial Project.
- **IR-agnostic to the engine:** depends only on the IR data contract (Module 2 §12), never on how
  the IR was produced (which OPE provider / engine). Swapping the OPE engine must not change this
  contract.
- **Immutable input:** never mutates, enriches, re-prices, or re-plans the IR; it only structures it.
- **Stateless / no lineage:** always emits `version = 1`, `status = assembled`; never reads the
  clock; current/superseded lineage is **Module 4's** concern (§6).
- **Single hand-off:** the `Project` is the one object downstream modules (M4 Workspace, M5
  Marketplace, M6 Execution) consume.

---

## 12. Why Module 3 is separate (and exists)

- **Why it exists.** The IR is abstract and flat; it is not executable. Turning it into an
  operational structure (work packages, a validated ordered dependency graph, a sequenced timeline,
  with needs/risks/cost carried at the root) is real work that must happen **once**, in **one**
  place — otherwise every downstream module re-derives structure from the flat IR and the
  derivations diverge. Module 3 centralizes that transform and produces the single Project
  aggregate root.
- **Why separate from OPE (Module 2).** OPE answers *"what is required"* and is **engine-swappable**
  behind the IR contract. Operational structuring must stay **stable regardless of which engine
  produced the IR**. If structuring lived inside OPE, replacing the engine would force
  re-implementing it — violating the engine-replaceability principle. The **IR is the seam**;
  Module 3 lives on the far side of it.
- **Why separate from Project Workspace (Module 4).** Module 3 is a **deterministic, stateless,
  one-time transform** producing the Project's *initial* state. The Workspace is **live, stateful,
  and interactive** (UI, collaboration, ongoing edits, progress surface) and owns the Project's
  *ongoing* lifecycle. Module 3 owns the Project's **birth**; Workspace owns its **life**. Merging
  them would couple a pure transform to UI/state.
- **Why separate from Resource Marketplace (Module 5).** Marketplace deals with **real-world,
  external, non-deterministic supply** — real vendors, real prices, real availability. Module 3 is
  **supply-agnostic and deterministic**; it only makes needs addressable. Merging them would pull
  external, non-deterministic concerns into a pure transform and re-introduce the very "no real
  vendors / no payments" content that the IR and Project invariants forbid.

**Bottom line:** Module 3 is the deterministic bridge from *what is required* (OPE's abstract IR) to
*an operational project that can be worked, sourced, and run* (the Project) — owning structure, and
nothing of authoring, supply, interaction, or execution.

---

## 13. Deferred (recorded; out of scope for v1 — none block v1 implementation)

These are intentional v1 simplifications, recorded so a later version can lift them behind the same
`assembleProject(ir) → Project | Refusal` contract:

- **Per-work-package attachment of needs/risks (resolves review C-1).** v1 carries `resourceNeeds`,
  `roleNeeds`, and `risks` at the **Project root only**. Attaching them to *specific* work packages
  would require a **requirement↔need / requirement↔risk link in the IR**, which the Module 2 IR
  contract (§12) does not yet provide (needs/risks link only to FED provenance, not to
  requirements). Adding such links is a **Module 2 (OPE) enhancement**, not a Module 3 change;
  until it exists, per-package attachment is deferred.
- **Richer grouping (many requirements per work package).** v1 uses the deterministic
  one-package-per-requirement rule (§7.3). A later grouping (e.g. by dependency component within a
  phase) can replace step 3 without changing the contract or the partition invariant.
- **Real scheduling / calendar dates.** The timeline stays relative; real dates belong to Module 6
  (Execution).
- **Lineage / versioning.** Owned by Module 4 (§6); Module 3 always emits `version = 1`,
  `status = assembled`.

---

*Specification only. No code, no implementation, no architecture redesign. The frozen engine,
Module 1, and Module 2 are unchanged. Nothing committed or pushed.*

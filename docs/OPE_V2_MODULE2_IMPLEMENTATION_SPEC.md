# OPE V2 — Module 2 Implementation Specification

> **Status: Production Specification.**
> Not an architecture document. It describes Module 2 in enough detail to implement it directly.
> It introduces no new architecture and no new core concepts. "OPE" is a proper name (unchanged).
> Sources of truth: `MASTER_PRODUCT_DECISIONS.md`, `OPE_MASTER_SPEC.md`, and the upstream contract
> in `OPE_V2_IMPLEMENTATION_SPEC.md` (Module 1 — the Future Event Description / FED).

## Introduction — the production cycle

Module 2 follows the same cycle as Module 1:

```
Specification  →  Code  →  Tests  →  Demo  →  Next Module
```

This document is the **Specification** step for **Module 2 — OPE Engine**. Module 2 **owns the OPE
Contract** (the transformation of an approved FED into Implementation Requirements). The existing,
frozen deterministic engine (`lib/ope/*`) is **one implementation of that contract**, not the
contract itself. The specification is **engine-agnostic**: it depends on no particular engine, and
the contract is defined so a future engine can replace the current one **without changing any
upstream (Discovery/FED) or downstream (Implementation Requirements/Marketplace) module.**

This document follows the **Global Implementation Rule** defined in `OPE_V2_IMPLEMENTATION_SPEC.md`
(every module describes Purpose, Responsibilities, Responsibility Boundaries, Inputs, Outputs,
Internal State, Workflow, Events, Data Model, Acceptance Criteria, Module Contract). Module-specific
sections (the OPE Contract, the Engine Provider, generation rules, determinism/traceability) are
added in the same spirit as Module 1's domain-specific sections.

---

# Module 2 — OPE Engine

> **Canonical anchor.** Per `MASTER_PRODUCT_DECISIONS.md`: *OPE turns a Request into an approved
> "what should happen", and only then into an Event Plan.* Module 1 produces the approved "what
> should happen" as the **FED**. Module 2 consumes the **approved FED** and produces the
> **Implementation Requirements** — the realization assembly (tasks, resource needs, roles,
> dependencies, risks, timeline structure, cost estimate). OPE **implements** the approved FED; it
> never re-decides it.

## 1. Purpose

Transform an **approved, locked FED** into a structured, engine-independent **Implementation
Requirements (IR)** object: everything required to realize the approved experience, expressed
abstractly (no real people, vendors, prices, or dates). Module 2 owns the **OPE Contract**
(`FED → IR`) and delegates the actual computation to an interchangeable **Engine Provider**; the
first provider adapts the existing frozen engine unchanged.

## 2. Responsibilities

- Define and own the **OPE Contract**: the engine-agnostic mapping from an approved FED to a valid IR.
- Define and own the **Engine Provider** abstraction: the seam behind which a concrete planning
  engine plugs in. Select the active provider (default: the frozen-engine adapter).
- Accept an approved FED, validate it is plannable, and **reject** anything that is not.
- Invoke the active provider to produce an IR; **validate** the IR against the IR contract.
- Attach **provenance** to every IR element (which FED / FED version it derives from).
- Emit logical domain events for each step.
- Hand the validated IR to the downstream consumer. Guarantee that **replacing the engine provider
  changes neither the FED contract (upstream) nor the IR contract (downstream).**

## 3. Responsibility Boundaries

### OPE owns
- The **OPE Contract** (`FED → IR`) and the **IR output shape** (the realization assembly), aligned
  with the downstream Implementation Requirements module.
- The **Engine Provider** abstraction and provider selection.
- IR assembly, IR validation, and FED→IR provenance.
- The internal **FED → engine-input adaptation** (provider-internal; not part of the public contract).

### OPE does NOT own
OPE is **explicitly not responsible for**, and must never do:
- **Discovery / meaning** — it does not converse and does not change the approved FED. *(Module 1.)*
- **Talking to the client or organizer** — not user-facing. *(Discovery / PSA.)*
- **Finding real people, vendors, venues, or availability.** *(Marketplace, Module 5.)*
- **Pricing as a quote, payments, or Stripe** — the IR cost estimate is deterministic and abstract,
  not a market price or charge. *(Payments / Marketplace.)*
- **Real scheduling against calendars/availability, execution, or monitoring.** *(Modules 6–7.)*
- **Any specific engine implementation in the contract** — the contract must remain engine-agnostic.

## 4. Inputs

### OPE accepts
- An **approved, locked FED** (`lockStatus = locked`, with a matching approval) handed off by
  Discovery, within a **Project** (referenced by id; Project internals out of scope).

### OPE must VERIFY before producing an IR
OPE does **not** trust the hand-off blindly and does **not** rediscover intent. Before invoking any
provider it **verifies the FED contract** and refuses on any failure:
1. The input **is a FED**, well-formed per Module 1's FED Data Contract.
2. The FED **is locked** (`lockStatus = locked`) with a matching `approved` ApprovalRecord.
3. The FED **is valid** — passes Module 1's FED Invariants (§5).
4. The FED **is planning-ready** — OPE re-checks Module 1's Planning Readiness Contract (§9) over the
   FED's `statedContext`. It re-checks *readiness*; it never re-decides *what* the event is.

Verification reuses Module 1's validators. OPE never reinterprets or alters the FED's meaning (§11).

### Refusal reasons (typed; exactly one per refusal)
| `RefusalReason` | Meaning | Emits |
|---|---|---|
| `invalid_fed` | Not a FED, or fails the FED Data Contract / FED Invariants. | `ope.fed_rejected` |
| `fed_not_locked` | Not `locked`, or lacks a matching `approved` ApprovalRecord. | `ope.fed_rejected` |
| `fed_not_planning_ready` | Fails the Planning Readiness Contract. | `ope.fed_rejected` |
| `unsupported_fed_content` | A well-formed, ready FED the active provider cannot plan (outside its supported scope). | `ope.requirements_failed` |
| `provider_failed` | The active provider errored/threw while producing output. | `ope.requirements_failed` |
| `provider_output_invalid` | Provider output failed IR validation (IR Invariants §5 / IR Data Contract §12). | `ope.requirements_failed` |

In every refusal case **no IR is produced or handed off.**

## 5. Outputs

OPE produces **exactly one output**:

> **Implementation Requirements (IR)** — the realization assembly derived from the approved FED.

No other object enters the downstream pipeline. The IR is **engine-independent** (defined by the
contract, not by any engine's internal shape) and **fully traceable** to the FED.

### IR Invariants (guaranteed for every handed-off IR)
A handed-off IR guarantees ALL of the following; an IR that cannot is rejected
(`provider_output_invalid`) and never handed off:

1. **Traceable to a locked FED.** `fedRef` names a specific locked FED + version, and every
   substantive element carries ≥1 `derivedFrom` provenance reference to FED content.
2. **Internally consistent.** Every `Dependency` references existing `Requirement` ids; every
   `Requirement.phase` references a declared `TimelineElement` phase; no element contradicts another.
3. **No live vendors / people / availability.** Resource and role needs are ABSTRACT (kinds/roles +
   quantities) — never a named vendor, person, venue, or availability slot.
4. **No payments / Stripe.** No payment instruction, charge, or Stripe artifact.
5. **No execution state.** No task-completion, evidence, progress, or monitoring data.
6. **No real quote / charge.** `CostEstimate` is an estimate (a range or a status), never a quoted
   price or an amount charged to the client (§8/§10/§12).
7. **No engine-specific fields.** No field is named after, or shaped by, a particular engine's
   internal structures — the IR is engine-agnostic.
8. **Safe for downstream.** It conforms to the IR Data Contract (§12), so Implementation Requirements
   (Module 3) and Marketplace (Module 5) consume it without knowing which engine produced it.

## 6. Internal State

OPE is **stateless per request** at the contract level (`FED → IR`). Distinguish:

- **Temporary / provider-internal (not contractual, not persisted):** the FED→engine-input
  adaptation, the engine's intermediate computation, and the chosen provider's working data. These
  are invisible outside the module and may change freely when the engine is replaced.
- **Produced / persisted (belongs to the Project):** the validated **IR** (a versioned artifact
  attached to the Project) and the emitted **events**. The engine's internals are never persisted as
  OPE state.

## 7. Workflow (Approved FED → Implementation Requirements)

```
[1] Receive an approved, locked FED within a Project.
        │  reject if: not a FED / not approved-locked / invalid (FED invariants) / not plannable (§4)
        ▼
[2] Select the active Engine Provider (default: frozen-engine adapter). (§9)
        ▼
[3] Provider produces an IR draft from the FED:
        - adapt FED → engine input (provider-internal),
        - run the engine,
        - map the engine result → IR shape (with FED provenance).         (§8, §10)
        ▼
[4] Validate the IR against the IR contract: validity + traceability + no prohibited content. (§10, §11)
        │  on failure → ope.requirements_failed; NO IR handed off
        ▼
[5] Emit ope.requirements_ready; hand the validated IR to the downstream consumer.
```

## 8. The OPE Contract (engine-agnostic)

The OPE Contract is a **pure logical transformation**:

```
produceImplementationRequirements( FED ) -> IR  |  Refusal
```

- **Input type:** the **FED** (owned by Module 1) — referenced, never redefined here.
- **Output type:** the **IR** (full Data Contract, §12) — engine-independent.
- **Refusal type:** `Refusal { reason: RefusalReason, message?: Text }`, where `RefusalReason` is one
  of the six values in §4.
- **Total function.** The contract **always** returns an IR or a typed Refusal; it never throws to the
  caller (a provider exception is mapped to `provider_failed`).
- **No engine concept appears in the contract OR the IR.** Neither the signature nor any IR field
  references stages, `PlannerInput`/`Scenario`, budget seeds, or any engine data structure.
  Engine-specific shapes live only inside a provider (§9) and are mapped away before the IR exists.
- **Engine replacement guarantee:** because the contract is exactly `FED → IR | Refusal`, replacing
  the provider behind it (§9) changes neither `FED` nor `IR`, so **no upstream (Discovery) or
  downstream (Implementation Requirements / Marketplace) module changes.**

## 9. Engine Provider (the replaceable implementation)

A provider is the internal seam behind the OPE Contract. The OPE module owns the contract and selects
the **active provider**; provider selection is internal and never exposed downstream.

### Provider interface (logical — no technology implied)
An Engine Provider exposes exactly:

| Field / operation | Logical type | Meaning |
|---|---|---|
| `provider_id` | Identifier | Stable id of the provider (e.g. the frozen-engine adapter). |
| `provider_version` | Text | The provider's own version, recorded on the IR (`providerRef`) for provenance. |
| `deterministic` | Boolean | Whether identical FED input yields identical output. |
| `produce(fed: FED)` | → `ProviderOutput` \| `ProviderFailure` | Produce realization data, or fail. |

- `ProviderOutput` is the provider's RAW result. OPE **maps it into the IR (§12) and validates it**
  against the IR Invariants (§5). The provider **must not expose engine internals** (stages,
  `PlannerInput`, budget seeds, intermediate objects) on the IR — those are mapped away before the
  IR exists.
- `ProviderFailure` carries a reason. OPE surfaces a thrown/failed provider as `provider_failed`,
  output failing validation as `provider_output_invalid`, and a ready FED the provider cannot plan as
  `unsupported_fed_content` (§4).

### First provider — adaptation scope
- The **first/default provider** is a thin **adapter over the existing frozen engine** (`lib/ope/*`),
  reused **unchanged** — the engine is not modified and its golden snapshot must keep passing.
- **FED free-text → typed planning values is the PROVIDER's responsibility.** The FED carries text
  (e.g. `audience_scale = "about 8 close family"`); the engine needs typed fields (numeric count,
  category, venue type). The provider performs this extraction **internally** and **may reuse the
  existing extraction path** (`understandEventText` / `extractFromText` / `enrichInputWithWsh` →
  `generatePlan`). This extraction is provider-internal and never appears in the OPE Contract or IR.
- **Replacement rule:** a future provider (a different deterministic engine, an AI-assisted engine,
  a provider consuming a richer FED) may replace the default **without** touching the OPE Contract,
  the FED, or the IR. The adapter is internal and replaceable; the provider boundary is the only
  thing that changes.

## 10. Implementation Requirements Generation Rules

**When IR may be produced:**
- Only from an **approved, locked, valid, plannable FED** (§4).

**When IR must NOT be produced:**
- When the FED is rejected (§4) — refusal, no IR.
- When the active provider fails — `ope.requirements_failed`, no IR handed off.
- When any IR element would be **fabricated** rather than derived from the FED (every element must
  trace to FED content — §11).

**Mandatory IR content (an IR is invalid without all of these):**
- A set of **requirements/tasks** (what must be done to realize the FED).
- **Resource needs** (what is needed, with abstract quantities — not real vendors/people).
- **Role / staffing needs** (who is needed — abstract roles, not real persons).
- **Dependencies** (ordering/links between requirements).
- **Risks** (what could go wrong + mitigation).
- **Timeline structure** (relative phases/windows — not real dates).
- **Cost estimate** — an ESTIMATE only (see `CostEstimate`, §12): a low/likely/high range, or an
  explicit estimate STATUS when no numeric estimate is possible. Never a quote, a charge, or payment data.
- **Provenance** (each element references the FED and its version).
- A FED reference + IR **version**.

**Prohibited IR content (must never appear):**
- Real vendors / suppliers / venues, real people, or real availability.
- Real prices, quotes, payment instructions, or any Stripe artifact.
- Real calendar dates or schedules bound to real availability.
- Execution status, completion evidence, or monitoring data.
- Any change to the approved FED's meaning.

**`CostEstimate` is an estimate, not a price.** It expresses, deterministically and abstractly,
*roughly what realizing the approved FED may require*. It is **not** a quote, **not** an amount
charged to the client, and **not** Stripe/payment data. If the provider cannot produce a numeric
estimate, it MUST emit `CostEstimate.status = unpriced` (with an optional `note`/range) rather than
inventing a real price. Quotes, charges, and live pricing belong to downstream modules
(Marketplace / Payments).

## 11. Determinism & Traceability

- **Traceability (contract requirement, always):** every IR element references at least one FED
  element / the FED version it derives from. An IR element with no FED provenance is invalid. OPE
  never invents requirements the FED does not support.
- **Determinism (provider property):** the **default (frozen-engine) provider is deterministic** —
  the same FED yields an identical IR. The OPE Contract requires **validity + traceability** of the
  IR for any provider; determinism is declared per provider (`deterministic`) so a future provider can
  be substituted without breaking the contract. (If a non-deterministic provider is ever used, it must
  still produce a valid, fully-traceable IR.)
- **No re-discovery / no meaning change:** OPE **verifies** the FED (§4) but never reinterprets the
  client's intent or alters the FED's meaning. Every IR element is *derived from* the approved FED
  (provenance ≥1), never *added beyond* it.

## 12. IR Data Contract (logical — no SQL, no ORM, no code)

Logical types only (Text, Integer, Number, Boolean, Identifier, Timestamp, an enumerated value set,
a List of …, or a Reference). Engine-independent; no field references any engine structure.

### `ImplementationRequirements` (IR) — root
| Field | Logical type | Required | Cardinality | Definition |
|---|---|---|---|---|
| `ir_id` | Identifier | yes | 1 | Stable id of this IR. |
| `version` | Integer | yes | 1 | Increases each time the same FED is re-planned. |
| `status` | Enum { current, superseded } | yes | 1 | At most one `current` IR per (Project, FED). |
| `fedRef` | FedReference | yes | 1 | The locked FED + version this IR derives from. |
| `providerRef` | ProviderRef | yes | 1 | The provider + version that produced it. |
| `requirements` | List of Requirement | yes | ≥1 | What must be done. |
| `resourceNeeds` | List of ResourceNeed | yes | ≥0 | Abstract resource needs. |
| `roleNeeds` | List of RoleNeed | yes | ≥0 | Abstract role needs. |
| `dependencies` | List of Dependency | yes | ≥0 | Ordering/links among requirements. |
| `risks` | List of Risk | yes | ≥0 | Risks + mitigations. |
| `timeline` | List of TimelineElement | yes | ≥1 | Relative phases (no real dates). |
| `costEstimate` | CostEstimate | yes | 1 | An estimate (range or status). |
| `createdAt` | Timestamp | yes | 1 | When this IR version was produced. |

### Sub-entities
**FedReference** — `{ fedId: Identifier (req), fedVersion: Integer (req) }`.
**ProviderRef** — `{ providerId: Identifier (req), providerVersion: Text (req) }`.
**ProvenanceRef** — `{ fedVersion: Integer (req), source: Enum { description, context_element } (req), contextElementId: Identifier (optional) }`.

**Requirement**
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `id` | Identifier | yes | — |
| `description` | Text | yes | What to do (not who/when). |
| `phase` | Enum { preparation, day_of, after } | yes | Ties to a `TimelineElement` phase. |
| `derivedFrom` | List of ProvenanceRef | yes (≥1) | Provenance. |

**ResourceNeed** (abstract — never a vendor)
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `id` | Identifier | yes | — |
| `kind` | Text | yes | Abstract resource kind (e.g. "catering", "seating"). |
| `quantity` | Number \| null | optional | Sized amount, if known. |
| `basis` | Enum { per_guest, per_kid, flat, unspecified } | yes | Scaling basis. |
| `derivedFrom` | List of ProvenanceRef | yes (≥1) | Provenance. |

**RoleNeed** (abstract — never a person)
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `id` | Identifier | yes | — |
| `role` | Text | yes | Abstract role (e.g. "supervising adult", "host"). |
| `count` | Number \| null | optional | Number needed, if known. |
| `basis` | Enum { per_guest, per_kid, flat, unspecified } | yes | Scaling basis. |
| `derivedFrom` | List of ProvenanceRef | yes (≥1) | Provenance. |

**Dependency** — `{ fromRequirementId: Identifier (req), toRequirementId: Identifier (req), type: Enum { finish_to_start, requires } (req) }`. Both ids MUST reference existing Requirements.

**Risk**
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `id` | Identifier | yes | — |
| `description` | Text | yes | — |
| `severity` | Enum { low, medium, high } | yes | — |
| `mitigation` | Text | yes | — |
| `derivedFrom` | List of ProvenanceRef | yes (≥1) | Provenance. |

**TimelineElement** (relative — no real dates)
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `id` | Identifier | yes | — |
| `phase` | Enum { preparation, day_of, after } | yes | — |
| `name` | Text | yes | — |
| `relativeWindow` | Text \| null | optional | Relative descriptor (e.g. "2–3 weeks before"); NEVER a real date. |

**CostEstimate** (an estimate, never a price/charge)
| Field | Logical type | Required | Definition |
|---|---|---|---|
| `status` | Enum { estimated, unpriced } | yes | `unpriced` when no numeric estimate is possible. |
| `range` | `{ low: Number, likely: Number, high: Number }` \| null | conditional | Present iff `status = estimated`. |
| `currency` | Text \| null | optional | Accounting unit of the estimate; NOT a charge. |
| `lineItems` | List of `{ key: Text, amount: Number, basis: Text }` | yes (≥0) | Abstract estimate lines. |
| `note` | Text \| null | optional | Explanation (e.g. why `unpriced`). |

### Version / current semantics
- Re-planning the **same FED version** produces a NEW IR with `version = previous + 1`; the prior IR
  becomes `status = superseded`. **At most one IR is `current`** per (Project, FED version).
- A **new FED version** (a revised, re-approved FED) starts a new IR lineage at `version = 1`.

### Relationships
An IR belongs to a Project, references exactly one locked FED version (`fedRef`) and one provider
(`providerRef`); it contains the lists above; every Requirement/ResourceNeed/RoleNeed/Risk carries
`derivedFrom` ≥ 1; every Dependency references existing Requirement ids; every Requirement.`phase`
matches a declared TimelineElement phase.

(`OpeEvent` — the logical domain event — is defined in §13.)

## 13. Events

Logical/domain events only — **no queues, buses, transports, or external subscriptions** (consistent
with Module 1). Each state change emits its event exactly once; a failed/no-op step emits nothing new.

- `ope.requirements_requested` — an approved FED was received for planning.
- `ope.fed_rejected` — input rejected (not a FED / not approved / invalid / not plannable), with reason.
- `ope.requirements_assembled` — the provider produced an IR draft.
- `ope.requirements_validated` — the IR passed the IR contract checks.
- `ope.requirements_ready` — the validated IR is available to the downstream consumer.
- `ope.requirements_failed` — the provider or validation failed; no IR handed off, with reason.

(Provider selection is internal and need not be an emitted event.)

## 14. Acceptance Criteria

Each criterion is objectively verifiable against the IR Data Contract (§12), the IR Invariants (§5),
provenance (§11), or events (§13):

1. **Engine-agnostic types.** *Verify:* the OPE Contract signature and every IR Data Contract type
   import nothing from `lib/ope` and contain no field whose name matches an engine structure
   (`PlannerInput`, `Scenario`, `seed`, or a stage name). Inspect type definitions; expect none.
2. **Total contract.** `produceImplementationRequirements` returns either an IR or a `Refusal` whose
   `reason` ∈ the six §4 values, for every input; it never throws to the caller.
3. **Refusal coverage.** For EACH of the six `RefusalReason` values there exists an input/condition
   that yields exactly that reason and produces no IR. *(invalid_fed, fed_not_locked,
   fed_not_planning_ready, unsupported_fed_content, provider_failed, provider_output_invalid.)*
4. **Mandatory IR content.** Every produced IR satisfies the IR Data Contract (§12): all required
   fields present, ≥1 `requirements`, ≥1 `timeline`, a `costEstimate`, `fedRef`, `providerRef`,
   `version`, `status`.
5. **IR Invariants pass.** Every handed-off IR passes all 8 IR Invariants (§5). *Verify per invariant,*
   e.g.: no field carries a vendor/person/availability value; no payment/Stripe field exists;
   `costEstimate.status ∈ {estimated, unpriced}` with `range` present iff `estimated`; no field names
   an engine structure.
6. **Traceability.** Every Requirement/ResourceNeed/RoleNeed/Risk has `derivedFrom` length ≥ 1.
   *Verify:* scan for any empty `derivedFrom`; expect none.
7. **Internal consistency.** Every `Dependency` references existing Requirement ids and every
   `Requirement.phase` matches a declared TimelineElement phase. *Verify by cross-reference.*
8. **Determinism (default provider).** The same FED produced twice by the default provider yields an
   IR equal field-for-field (ids/timestamps assigned deterministically). *Verify:* run twice, compare.
9. **Engine replaceability.** A second stub provider implementing the §9 interface produces an IR of
   the same Data Contract shape, and the FED and IR types are unchanged. *Verify:* the stub compiles
   against the same `FED`/`IR` types; no upstream/downstream type changes.
10. **Frozen engine untouched.** The default provider does not modify `lib/ope/*`; the OPE golden
    snapshot (`test:ope`) still passes.
11. **Versioning.** Re-planning the same FED version yields `version+1` and marks the prior IR
    `superseded`; at most one IR is `current` per (Project, FED version).
12. **Events exactly once.** Input refusals emit `ope.fed_rejected`; provider/validation failures emit
    `ope.requirements_failed`; success emits `ope.requirements_ready`; each emitted exactly once, with
    no IR on any failure.

## 15. Test Scenarios

1. **Valid approved FED → IR.** Approved, locked, plannable FED → IR produced, all mandatory content,
   fully traceable, `requirements_ready` emitted.
2. **Draft / unapproved FED → rejected.** `ope.fed_rejected`, no IR.
3. **Invalid FED → rejected.** A FED failing the FED Invariants → rejected, no IR.
4. **Non-plannable FED → rejected.** A FED missing planning-readiness → rejected, no IR.
5. **Determinism.** Same FED twice through the default provider → identical IR.
6. **Engine replaceability.** A second stub Engine Provider yields an IR of the same contract shape;
   upstream (FED) and downstream (IR) types are unchanged.
7. **No prohibited content.** A provider attempting to emit a real vendor / price / date → the IR
   fails validation; nothing is handed off.
8. **Traceability negative.** An IR element with no `derivedFrom` → invalid; not handed off.
9. **Engine failure.** Provider throws / returns failure → `ope.requirements_failed`, no IR.

## 16. Implementation Notes

- **First provider = thin adapter over the frozen engine.** Do **not** modify `lib/ope/*`; verify the
  golden snapshot (`scripts/ope-*`) still passes. Keep the FED→engine-input adaptation **inside** the
  provider; the contract/IR layer must never import engine internals.
- **Define IR engine-independently first**, then make the adapter map the engine's output into it.
  Downstream (Implementation Requirements / Marketplace) depends only on IR.
- **Provenance is mandatory** — wire FED references into every IR element as the adapter builds it.
- **Determinism is a provider property**, not a contract requirement; the contract requires IR
  validity + traceability. This is what permits a future engine swap.
- **Stateless contract:** keep `produceImplementationRequirements` pure; persist only the resulting IR
  (to the Project) and events. Reuse Module 1's logical-event approach (no transports).
- **Reuse, don't duplicate:** the engine is reused as-is; the prohibited-content discipline mirrors
  Discovery's FED guard in spirit (different content rules).

---

## Out of Scope (explicit)

Module 2 intentionally does NOT do any of the following; each belongs to another module or is left to
implementation:

### Responsibilities not owned
Discovery / meaning; client or organizer conversation; finding real people/vendors/venues/availability;
real pricing, quotes, payments, or Stripe; real scheduling/calendars; execution; monitoring;
completion evidence; closure.

### Deliberately left to implementation (this document defines none of them)
- **Presentation / UI**, **event transport/persistence mechanism**, **storage**, **identity/authz**,
  and **Project internals** (Module 2 references a Project by id and attaches the IR to it).
- **The specific engine implementation** — the contract is engine-agnostic; the frozen engine is
  merely the first provider, replaceable without contract change.

The specification is implementation-agnostic and engine-agnostic: it defines OPE's logical behavior,
the OPE Contract, the IR output contract, and guarantees only.

---

## Module Contract — OPE Engine

> Same mandatory format as every OPE module.

- **Consumes:** an **approved, locked FED** within a Project (owned by Module 1).
- **Produces:** exactly one object — **Implementation Requirements (IR)**, engine-independent and
  fully traceable to the FED.
- **Owns:** the **OPE Contract** (`FED → IR`); the **Engine Provider** abstraction and selection; IR
  assembly, validation, and FED→IR provenance; the internal FED→engine-input adaptation.
- **Does Not Own:** discovery/meaning; real people/vendors/availability; pricing/payments/Stripe;
  scheduling/execution/monitoring/closure; and **any specific engine implementation** (the contract
  is engine-agnostic; the frozen engine is one replaceable provider).
- **Next Module:** **Implementation Requirements (Module 3)** / **Marketplace (Module 5)** consume the
  IR. (Specified separately; referenced here only as downstream consumers.)

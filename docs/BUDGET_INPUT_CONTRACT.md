# Budget Input Contract (resolves Budget Workspace Q1)

> **Purpose:** define, authoritatively and exactly, **which Project entities become Budget Lines** —
> the input boundary between the canonical Project (OPE V2 Module 3) and the Budget Workspace. After
> reading this, an engineer can turn a Project into a Budget Workspace **without inventing any
> additional logic or entities.**
> **Scope:** resolves Budget Workspace **Q1 only**. **No code, no redesign, no implementation.** OPE
> V2 is frozen and unchanged; this document only *reads* its contracts.
> **Sources read:** `OPE_V2_MODULE3_IMPLEMENTATION_SPEC.md` (Project §9, carried IR sub-objects),
> `OPE_V2_MODULE2_IMPLEMENTATION_SPEC.md` (IR §12 — the carried shapes), `OPE_MASTER_SPEC.md`,
> `OPE_EVENT_LIFECYCLE.md` (budget/resources freeze at Registration Closed), `BUDGET_WORKSPACE_V1_DESIGN.md`.

---

## 1. Source of Truth

- The **canonical Project** (Module 3 §9) is the authoritative source of scope. The Budget Workspace
  **references** it and **never mutates** it.
- The Project's cost-relevant content (Module 3 §9, carrying Module 2 §12 unchanged):
  - `workPackages` — work items/tasks (one per IR requirement; **no cost data attached** — M3 §13).
  - `resourceNeeds` — **abstract resource needs** `{ id, kind, quantity?, basis, derivedFrom }`
    ("never a vendor"; no price).
  - `roleNeeds` — **abstract role needs** `{ id, role, count?, basis, derivedFrom }` ("never a
    person"; no price).
  - `risks` — `{ id, description, severity, mitigation, derivedFrom }` (risk metadata; mitigation is
    text).
  - `dependencyGraph`, `timeline` — structure/ordering, relative (no real dates, no cost).
  - `costSummary` — the carried IR **`CostEstimate`** `{ status (estimated|unpriced), range?{low,
    likely,high}, currency?, lineItems[{key,amount,basis}], note? }`: a **read-only AGGREGATE
    estimate over the whole plan** — *not* a per-component price.
  - `project_id`, `version`, `status`, `irRef`, `fedRef`, `createdAt` — identity/provenance.

**Decisive observation (corrected):** Budget does **not** pre-decide which delivery components are
"financial." **Every Project *delivery component* — anything that *participates in delivering* the
event — becomes a Budget Line**; if it costs nothing, its price is simply **0** (an amount, **not** a
special state). A **`WorkPackage` is a planning *container* that describes work, not cost — it is
never a Budget Line itself**; the Budget Lines that realize a work package come from the **delivery
components** it contains. In the **current** Project contract the delivery components are
**`resourceNeeds` and `roleNeeds`**. Excluded (not delivery components): `workPackages` (planning
container — *holds* delivery components, never a line), `dependencyGraph`/`timeline`
(structure/ordering), `risks` (risk metadata), `costSummary` (read-only **aggregate** estimate, not a
component), and identity/provenance metadata. This is the *current* mapping, not a forever rule —
see §2.

> **Example (the decision):** WorkPackage *"Decorate venue"* (a container) → Budget Lines:
> *Balloons*, *Flowers*, *Decorator*, *Transport* (its delivery components). **No Budget Line is
> created for "Decorate venue" itself.**

---

## 2. Budget Input Contract (the rule)

> **Each Project *delivery component* in the current Project version produces exactly one
> `BudgetLine`. A delivery component is any Project entity that participates in delivering the event,
> regardless of whether it costs money** — Budget never excludes a component for being "not
> financial." A Budget Line references its source component by a stable `SourceComponentRef`; the
> Project owns the component (read-only), the Budget owns its pricing overlay; **cost may be 0**.

**Delivery components in the current Project contract:** `resourceNeeds`, `roleNeeds`. A
**`WorkPackage` is a planning container** — it *describes work*; the Budget describes the *cost of
delivering that work*. A work package may yield **several** Budget Lines (one per delivery component
it contains) or none, **but the work package itself is never a Budget Line.**
Formally, for the current Project version `P`:
```
BudgetLines(P) = { one BudgetLine per c ∈ ( P.resourceNeeds ∪ P.roleNeeds ) }
```
**Type-driven, not a fixed allowlist:** the rule is "every *delivery component*." If a future Project
version adds new delivery-component **types** (or marks entities as delivery components), Budget
creates lines for them **automatically** — with no change to this rule. (A `WorkPackage` remains a
container regardless: containers never become lines; their contained delivery components do.)

`costSummary` provides a **Project-level aggregate estimate for context only**; it never produces
Budget Lines and is **not** a per-line price (§5, §9).

---

## 3. The twelve determinations

| # | Question | Authoritative answer |
|---|---|---|
| 1 | Which Project entities **automatically** produce Budget Lines? | Every **delivery component**. In the current Project contract: **`ResourceNeed`** and **`RoleNeed`** — each → 1 line. A **`WorkPackage` is a planning container, NOT a Budget Line** (it holds delivery components; those become lines). Future delivery-component types are picked up automatically (§2). |
| 2 | Which entities **never** become Budget Lines? | Entities that are **not delivery components** (never excluded for being "non-financial"): **`WorkPackage`** (a planning container — *describes work*, not cost; its contained delivery components become lines, the work package itself never does) · `Requirement` (subsumed by its `WorkPackage`) · `Risk` (risk metadata — not a thing delivered; a priced mitigation must be an OPE-emitted need) · `Dependency`/`DependencyGraph` (structure/ordering) · `TimelinePlan`/`phases` (relative structure) · `costSummary`/`CostEstimate` (read-only **aggregate estimate**, not a component) · `irRef`/`fedRef`/`project_id`/`version`/`status`/`createdAt` (metadata). |
| 3 | Can **one** component produce **multiple** Budget Lines? | **No.** Strict **1:1** — one delivery component → exactly one Budget Line (consistent with M3's 1:1 discipline; preserves traceability). |
| 4 | Can **multiple** components produce **one** Budget Line? | **No.** No merging — a Budget Line references **exactly one** delivery component via `SourceComponentRef`. (Grouping for display is a UI concern, not a line merge.) |
| 5 | How are **optional** components represented? | The Project has **no `optional` flag** on any delivery component (ResourceNeed/RoleNeed carry none). So there is **no optional-component concept at the Project level in v1**: every delivery component → a Budget Line. "Optional / add-on" is a **Budget-local overlay annotation** the organizer may set (a pricing/commercial decision the Budget owns), **never** read from or written to the Project. |
| 6 | How are **zero-cost** components represented? | **Zero is an amount, not a state — there is no `zero` costState.** The Project carries **no per-component price**, so cost is a Budget-side input: a Budget Line starts **`unknown` (TBD)**; `organizerEstimate = 0` → **`estimated` (amount 0)**; a selected `$0` VendorQuote → **`confirmed` (amount 0)**. A 0 line is **counted as 0 in the base and stays visible — never omitted, never a special case.** |
| 7 | What **identifier** should Budget use to reference a component? | **`SourceComponentRef = { projectId, projectVersion, itemKind, itemId }`** where `itemKind ∈ { resource_need, role_need }` (**open to future delivery-component kinds**) and `itemId =` the component's `id` (`ResourceNeed.id` / `RoleNeed.id`), and `projectVersion =` the Project lineage version the Budget reflects. (A line may also carry an optional `workPackageRef` to the **containing** WorkPackage for grouping — see Q8 — but that ref is never the line's own identity.) |
| 8 | What **fields are required from Project** (per component)? | Per ResourceNeed: **`id`, `kind`, `basis`** (`quantity?`). Per RoleNeed: **`id`, `role`, `basis`** (`count?`). Project-level: **`project_id`, `version`**, **`costSummary`** (aggregate estimate context, incl. `currency?`). `derivedFrom` surfaced read-only for traceability. *(A `WorkPackage` may supply optional **grouping** context — its `id`/`name` — for displaying lines under their container, **if** OPE later links a component to its work package; in the current model needs sit at the Project root, so lines are flat until then.)* **There is NO per-component price** in the Project. |
| 9 | Which fields are **read-only** (Project-owned)? | **All Project-derived fields**: the component's `id` / `kind` / `role` / `quantity` / `count` / `basis` / `derivedFrom`, any WorkPackage grouping label, the `costSummary`, the structure, scope, and identity. The Budget reflects them; any change requires a **Project re-plan** (Budget never mutates Project). |
| 10 | Which fields may Budget **extend locally**? | Budget-owned overlay (never written back): per line — `organizerEstimate`, `quotes` (VendorQuotes) + `selectedQuoteId`, derived `costState`, `note`, an optional `optional`/add-on flag, `lineStatus` (active/orphaned); at root — `OrganizerFee`, totals (derived), `CommercialProposal` snapshots, currency (if Project `costSummary` is unpriced). |
| 11 | What happens **after Project re-plan**? | A re-plan yields a **new Project version** (M4 lineage). The Budget **reconciles** (Q12): new delivery components → new Budget Lines (`unknown`); removed components → their lines **orphaned** (retained, excluded from active totals, flagged — never deleted; quotes/proposal references preserved); surviving components (same `id`) → keep their line + overlay, refresh the read-only descriptor. Budget never mutates the Project. |
| 12 | How does Budget **reconcile** with Project? | A Budget-side `reconcile(budget, newProjectVersion)` that **reads** the new Project's **delivery components** (`resourceNeeds` + `roleNeeds`; **not** work packages, which are containers), **diffs by `SourceComponentRef.itemId`** within each `itemKind` (add new / orphan removed / refresh surviving), updates `budget.projectRef.projectVersion`, and appends journal entries. **Reconcile is the only path a new Project version enters the Budget; it reads the Project, never writes it.** |

---

## 4. Entity mapping (Project → Budget)

| Project entity (M3 §9) | Produces a Budget Line? | `itemKind` | Cardinality | Why |
|---|---|---|---|---|
| **`ResourceNeed`** `{id,kind,quantity?,basis,…}` | **Yes** | `resource_need` | 1 need → 1 line | **Delivery component** (goods/services to provide); cost may be 0. |
| **`RoleNeed`** `{id,role,count?,basis,…}` | **Yes** | `role_need` | 1 need → 1 line | **Delivery component** (people/roles to fill); cost may be 0. |
| `WorkPackage` `{id,name,phase,requirementIds,…}` | **No** (planning **container**) | — | 1 WP → 0..N lines (via its contained components) | **Describes work, not cost.** Its delivery components become lines; the work package **itself never becomes a Budget Line.** May supply an optional **grouping** label for its lines. |
| `Requirement` (inside WorkPackage) | No | — | — | *What to do*; **subsumed by its `WorkPackage`** (a container, not a line). |
| `Risk` `{id,description,severity,mitigation,…}` | No | — | — | **Not a delivery component** — risk metadata; `mitigation` is text with no price/need-link. A priced mitigation must be an OPE-emitted need. |
| `DependencyGraph` / `Dependency` | No | — | — | **Not a delivery component** — structure/ordering only. |
| `TimelinePlan` / `phases` | No | — | — | **Not a delivery component** — relative structure/timing. |
| `costSummary` (`CostEstimate`) | No (read-only **aggregate** context) | — | — | **Not a component** — it **is** the estimate; a Project-level total, not per-line prices. |
| `irRef` / `fedRef` / `project_id` / `version` / `status` / `createdAt` | No | — | — | **Not a component** — identity/provenance; Budget references `projectId` + `version`. |

---

## 5. Required fields (read from Project, read-only)

Per Budget Line (from its source **delivery component** — a `ResourceNeed` or `RoleNeed`):
| Field (Project) | From | Required | Budget use |
|---|---|---|---|
| `id` | ResourceNeed / RoleNeed | yes | → `SourceComponentRef.itemId` |
| `kind` / `role` | ResourceNeed / RoleNeed | yes | line label (UI: **Cost Item**) |
| `basis` | ResourceNeed / RoleNeed | yes | comparison/leveling context (per_guest/per_kid/flat/unspecified) |
| `quantity` / `count` | ResourceNeed / RoleNeed | optional | sizing context (if present) |
| `derivedFrom` | ResourceNeed / RoleNeed | yes (≥1) | provenance/traceability (read-only) |
| `id` / `name` of the **containing** WorkPackage | WorkPackage | optional | **grouping label only** (display lines under their container); never the line's identity, never its own line |

Per Budget Workspace (from the Project root):
| Field | From | Budget use |
|---|---|---|
| `project_id`, `version` | Project | `budget.projectRef = { projectId, projectVersion }` |
| `costSummary` (`range`, `currency`, `status`, `lineItems`) | Project | **Aggregate estimate context only** (a Project-level reference total; the currency seed). **Not** a per-line price. |

**Read-only rule:** every field above is Project-owned. Budget never writes any of them back.

---

## 6. Optional / Budget-local fields (overlay — Budget-owned)

Not from the Project; the Budget may add and edit these without touching scope:
- Per line: `organizerEstimate` (manual estimate), `quotes` + `selectedQuoteId`, derived `costState`
  (`unknown`/`estimated`/`confirmed`), `note`, an `optional`/add-on flag, `lineStatus`
  (`active`/`orphaned`).
- Per workspace: `OrganizerFee` (markup/service fee), derived totals, `CommercialProposal` snapshots,
  workspace `currency` (when `costSummary` is `unpriced`).

---

## 7. Identifier contract

```
SourceComponentRef = { projectId, projectVersion, itemKind, itemId }
  projectId       : the Project this budget reflects                  (Project.project_id)
  projectVersion  : the Project lineage version (M4-owned)            (the reflected version)
  itemKind        : Enum { resource_need, role_need }                 (which delivery-component list;
                    open to future delivery-component kinds — NOT work_package, a container)
  itemId          : the component's stable id                         (ResourceNeed.id / RoleNeed.id)
```
- `itemId` is the delivery component's own id, **stable within a Project/IR version**. Components
  never share an id within a kind; a Budget Line resolves to **exactly one** delivery component.
- A Budget Line **must** resolve its `SourceComponentRef` to an existing delivery component in
  `projectVersion`; otherwise it is invalid (or `orphaned` after a re-plan — §8).
- The Budget never invents an `itemId`; it only references ids the Project emitted. A `WorkPackage`
  id may appear only as an **optional grouping ref**, never as a line's `SourceComponentRef`.

---

## 8. Reconcile rules (Project re-plan → Budget)

`reconcile(budget, newProject)` — Budget-side, **reads** the new Project, **never writes** it:
1. Build the set of current **delivery components** `C = newProject.resourceNeeds ∪ roleNeeds`
   (**not** work packages — those are containers), keyed by `(itemKind, id)`.
2. **New** (`(itemKind, id) ∈ C`, no existing line): create a Budget Line (`costState = unknown`).
3. **Removed** (existing line whose `(itemKind, id) ∉ C`): set `lineStatus = orphaned` — **retain** the
   line, its quotes, and any proposal references; **exclude from active totals**; flag. **Never delete.**
4. **Surviving** (`(itemKind, id)` in both): keep the Budget Line and its overlay (quotes, selected
   quote, estimate, note); refresh the read-only descriptor (`kind`/`role`/`quantity`/`count`/`basis`
   and any WorkPackage grouping label).
5. Set `budget.projectRef.projectVersion = newProject.version`; append journal entries.
- Reconcile is the **only** way a new Project version enters the Budget. Overlay **migration** beyond
  "keep surviving lines, orphan removed" (e.g. re-pricing) is the organizer's decision, not automatic.

---

## 9. Edge cases

- **Volunteer / unpaid work** = a Budget Line whose cost the organizer sets to **0** —
  `organizerEstimate = 0` (state `estimated`, amount 0) or a selected `$0` VendorQuote (state
  `confirmed`, amount 0). It **stays visible** and counts as 0; it is **never excluded** for being
  unpaid.
- **Owned resource** (already-owned equipment, a venue you control) = a Budget Line that **starts
  `unknown`** and remains 0 only if the organizer **chooses** to price it 0 (`organizerEstimate = 0`).
  Budget does not assume 0 — the organizer decides.
- **Free activity / no-charge component** = a Budget Line with `organizerEstimate = 0`. Free is a
  **price of 0**, not an exclusion.
- **Unknown free/paid status** = the Budget Line **remains `unknown` (TBD)** until the organizer sets
  `0` or a price (or selects a quote). Budget never guesses; unknown stays visible and is carried as
  unpriced in the totals.
- **No per-component estimate from the Project.** Components carry no price; `costSummary` is an
  aggregate, not per-component. So every new Budget Line is **`unknown` (TBD)** until the organizer
  adds an estimate (incl. 0) or a vendor quote. `BudgetLine.projectEstimate` is therefore generally
  **null** in v1 (it would only populate if OPE later emits per-component estimates). *(Refines Budget
  design Q6: the OPE estimate is aggregate, not a per-line seed.)*
- **WorkPackage with no delivery components = no lines.** A work package is a container; if it
  contains no `ResourceNeed`/`RoleNeed`, it contributes **no** Budget Line (and never one for itself).
- **Budget must not invent lines from work packages or `costSummary.lineItems`.** Work packages are
  containers; `costSummary.lineItems` are abstract estimate artifacts. Neither is a delivery component;
  creating lines from them would invent scope. Lines come only from delivery components
  (`resourceNeeds` + `roleNeeds`).
- **★ Current provider emits work packages but no delivery components (open dependency).** The frozen
  engine adapter emits `workPackages` (≥1) but `resourceNeeds = []` / `roleNeeds = []` (M3 §13 /
  Module 2 **MAJ-5**). Because **work packages are containers, not lines**, a Project from the current
  provider yields **zero Budget Lines** until OPE emits the delivery components those work packages
  contain. This is an **upstream gap** (OPE must emit per-work-package resource/role needs), **not** a
  Budget decision; the Budget **must not** fabricate lines from work packages or `costSummary`. The
  contract is correct and future-proof; populating delivery components is a Module 2/3 enhancement,
  out of scope for Q1. (Until then the aggregate `costSummary` is shown as context only.)
- **Component ids change on re-plan.** If a re-plan regenerates ids, surviving components appear as
  removed + new (orphan + fresh line). Reconcile correctness depends on id stability across versions;
  where ids are not stable this is a known limitation (flagged, not solved here).
- **Risk requiring spend.** A risk mitigation that needs a paid resource must be emitted by OPE as a
  `ResourceNeed`/`RoleNeed`; the Budget never creates a line from a `Risk`.
- **Currency.** Taken read-only from `costSummary.currency` when present; otherwise a Budget-local
  setting (single currency in V1; mismatched vendor quotes flagged, not converted).

---

## 10. Final mapping table (authoritative)

| Project source (M3 §9) | Budget result | `itemKind` | Cardinality | Cost state at creation |
|---|---|---|---|---|
| `Project.resourceNeeds[*]` | **1 Budget Line each** | `resource_need` | 1:1 | `unknown` (TBD; cost may later be 0) |
| `Project.roleNeeds[*]` | **1 Budget Line each** | `role_need` | 1:1 | `unknown` (TBD; cost may later be 0) |
| `Project.workPackages[*]` | **none** — planning **container** | — | 1 WP → 0..N lines (via contained components; optional grouping label) | — |
| `Project.risks[*]` | none (not a delivery component) | — | — | — |
| `Project.dependencyGraph`, `Project.timeline` | none (structure) | — | — | — |
| `Project.costSummary` | none (read-only aggregate **context**) | — | — | — |
| `Project.{irRef,fedRef,project_id,version,status,createdAt}` | none (metadata; `projectId`+`version` referenced) | — | — | — |

**One-sentence contract:** *one Budget Line per **delivery component** — every `ResourceNeed` and
`RoleNeed` in the current Project contract (1:1, referenced by `SourceComponentRef`, read-only
descriptor, Budget-owned pricing overlay) — never excluded for being "non-financial"; cost may be
**0** (an amount, not a state); a **`WorkPackage` is a planning container that contains delivery
components and never becomes a Budget Line itself**; other non-delivery entities (risks, structure,
the aggregate `costSummary`, metadata) become no line; re-plan reconciles by `(itemKind, id)`
(add / orphan / keep) and the Budget never mutates the Project.*

---

*Resolves Q1 only. No code, no architecture change, no new entities. OPE V2 frozen and unchanged.
Companion: `BUDGET_WORKSPACE_V1_DESIGN.md`, `BUDGET_COSTING_MODEL_ALIGNMENT.md`. Not committed, not
pushed.*

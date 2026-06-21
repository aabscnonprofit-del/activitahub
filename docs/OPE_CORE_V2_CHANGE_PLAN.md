# OPE Core V2 — Change Plan

> **This document is NOT architecture and NOT a new source of truth. It is a work plan.**
> It sequences how the existing source-of-truth documents are migrated to the OPE Core V2 model. It introduces no new architecture, engines, schemas, or code. It rewrites no document — it only says *what* to change, *what* to keep, *what* to deprecate, and *in what order*.
>
> **Inputs:** the completed *OPE Core V2 Conflict Audit* (primary source), and the session's outcome / time / scenario audits. **Authority docs:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_V1_TECHNICAL_DESIGN.md`.

## OPE Core V2 model (reference)
```
Customer Request → Request Understanding → Scenario (what should happen)
→ Scenario Approval → Timeline → Timed Work Items
→ Resources → Staff → Vendors → Budget → Execution → Control
```
**Definitions used by this plan:**
- **Customer Request** = what the customer asks for.
- **Scenario** = *what should happen*. Not a category, not a template, not a scenario catalog.
- **Timeline** = when scenario elements happen; supports parallel work.
- **Timed Work Item** = work + time. Must eventually support: *what is performed · start time or dependency · end time or duration · location · responsible role/person · status.*

---

## 1. Executive Summary

**Why OPE Core V2 exists.** The Conflict Audit found that the source-of-truth documents describe a model whose primary object is an **event category/scenario-template**, with **time as optional metadata** and **no approval gate** between understanding the request and committing resources/budget. The documented chain is effectively *category → scenario(template/input) → plan(content+cost)*. The engine *mechanics* (deterministic cost, LLM-proposes-what, request assessment) are sound, but the *spine* is wrong: it is organized around money + curated content, not around **request → what-should-happen → approval → time → execution**.

OPE Core V2 reorders the documented model so that:
1. the **Customer Request** is the root object (request-first);
2. **Scenario** means *what should happen* (a desired-happenings structure), explicitly not a category/template/catalog;
3. a **mandatory Scenario Approval** gate precedes any resourcing or budget;
4. the **Timeline** is the execution backbone, and work items are **timed**;
5. **category is metadata only**;
6. there is **traceability from request to result**.

This change plan is a **documentation migration** to close the gap between the as-written source of truth and the V2 model. It does not build anything; it aligns the words first, so implementation can follow against a coherent contract.

---

## 2. Conflict Inventory (from the Conflict Audit)

| # | Conflict (V2 principle violated) | Primary locations | Severity | Summary |
|---|---|---|---|---|
| C1 | **Request-first** | OPE_V1 §1/§3.2/§8.1; OPE_MASTER_SPEC §3/§4/§15; MASTER §5/§11.6; Roadmap §8/§9; ERM §1/§2 | Med-High | Entry point and object model are **category/scenario-first**, not request-first; plan generation is gated on mapping a request to a category. |
| C2 | **Scenario = "what should happen"** | OPE_V1 §3.2/§4; OPE_MASTER_SPEC §3 vs §5; MASTER §5/§9/§11.6 | High | "Scenario" means **input object** (OPE_V1/Spec §3) *and* **assembled skeleton** (Spec §5) *and* **curated template KB** (MASTER) — three contradictory senses; none is "what should happen." |
| C3 | **Mandatory scenario approval** | OPE_V1 §6/§8.1; OPE_MASTER_SPEC App. A; OPE_EVENT_LIFECYCLE §1/§2; MASTER §10.3 | High | No scenario-approval gate exists. Where approval exists (Lifecycle "Ready"), it approves the **finished plan**, *after* resources/budget — the inverse of V2. |
| C4 | **Timeline as execution backbone** | OPE_V1 §5.1/§3.2/§4; OPE_MASTER_SPEC §12 (PLANNED); MASTER §5/§10.3; Roadmap §2/§7 | High | Timeline is a **relative scaffold / proposal section**, not the spine; date is optional; the date-anchored schedule is specified but PLANNED/unbuilt. |
| C5 | **Timed work items** | OPE_V1 §3.2; OPE_MASTER_SPEC §12/§13 (PLANNED); Roadmap §5/§3; Sourcing/Worker/Vendor (window, no duration) | High | Work items carry ~0/6 of the required time/owner/status fields; the timed-item schema exists only as PLANNED design. |
| C6 | **Category as metadata only** | OPE_MASTER_SPEC §4; OPE_V1 §3.1/§3.2/§5.2/§8.1; MASTER §11.6; ERM factor #2; Roadmap §8/§9 | Med-High | Category is the **pivot/gate/template key** in the planning + matching layers, not mere metadata. |
| C7 | **Request → result traceability** | OPE_EVENT_LIFECYCLE §6; OPE_V1 §3.2 / Roadmap §5; Learning §Capture; Roadmap C3 | Medium | Request→plan link exists (`source_request_id`), but the chain breaks at execution: no per-item status/owner, and actuals are not tied back to the request. *(Completed Activity status itself is defined separately and is not outcome-based — see `COMPLETED_ACTIVITY_SPEC_V1.md`.)* |

**Structural blockers (must lead the migration):** C3 (no approval gate), C2 (scenario meaning), C4+C5 (timeline/timed items).

---

## 3. Required Source-of-Truth Changes (document-by-document)

> "Modify" = section's framing conflicts with V2. "Keep" = already aligned / orthogonal. "Deprecate" = supersede the stated notion (mark historical; do not delete in this pass).

### MASTER_PRODUCT_DECISIONS.md *(top authority — sets the V2 decisions)*
- **Modify:**
  - §5 OPE™ — reframe input from "an event scenario" to **request-first**; introduce **scenario = what should happen**; record the **mandatory Scenario Approval** decision; record **timeline as backbone**. (C1, C2, C3, C4)
  - §11.6 Single Engine Strategy — "**Wedding is the template** / authored per category" → category as a **coverage/seed** dimension; Core defined around request→scenario→timeline, not "scenario · KB". (C6, C2)
  - §10.3 OPE Primary Outcome — add **Scenario Approval, Timeline, Timed Work Items** to the outcome/ordering (currently proposal-centric). (C3, C4, C5)
  - §1 — clarify "scenario-based discovery" is a **marketplace UX** sense, distinct from the V2 Scenario term. (C2)
- **Keep:** §2 marketplace models; §3 organizer tiers; §4 Stripe; §7 monetization; §10.4 Success; §11.1/§11.2 mission/philosophy; the 30-day access decision.
- **Deprecate:** §9 "Scenarios are an internal **knowledge base**… scenario KB powers OPE" (scenario-as-template-KB) — superseded by scenario = what-should-happen.

### OPE_V1_TECHNICAL_DESIGN.md *(build contract)*
- **Modify:**
  - §1 Summary — input = **Customer Request** (not "describe an event scenario"). (C1, C2)
  - §3.1/§3.2 — `category` as a **primary/typed key** → metadata; the scenario object → **what-should-happen**; reflect the need for approval state + timeline/timed-item fields (note as contract, not schema). (C2, C6, C4, C5)
  - §4 Scenario storage — separate **request inputs** from the **approved scenario**; make **date load-bearing** rather than `.optional()`. (C2, C4)
  - §5 / §5.1 / §5.2 — category-keyed templates / relative-bucket timeline → outcome/work-keyed knowledge + **timeline backbone**. (C4, C6)
  - §6 Planner workflow — insert a **Scenario Approval gate** before resourcing/budget. (C3)
  - §8.1 Scenario form — **request/intent-first** entry, not a category picker. (C1, C6)
- **Keep:** §2 layering rule (LLM = *what*, engine = *how much*); §7 cost engine; §9.2 assessment; §9.4 deterministic recompute; §10 cross-cutting (RLS/privacy/idempotency).
- **Deprecate:** §3 table set (`planning_scenarios/plans/plan_items/knowledge_entries/knowledge_pricing`) — already declared historical (Roadmap C3); mark superseded; §5.1 per-category timeline template.

### OPE_MASTER_SPEC.md *(engine object model + pipeline)*
- **Modify:**
  - §3 Scenario Intake — `intent` = request-first; define **Scenario = what should happen**, distinct from the input. (C1, C2)
  - §4 Classification — "**primary activity type**" → category as derived metadata; `module_selector` driven by work/outcome. (C6)
  - §5 Assembly — disambiguate the term "scenario skeleton"; outputs should be a **Timeline + Timed Work Items**, not just grouped checklists. (C2, C4, C5)
  - Appendix A pipeline — insert **Scenario Approval** and **Timeline** stages in order. (C3, C4)
  - §12 Execution Engine — re-prioritize from PARTIAL/PLANNED toward the backbone *in the design narrative* (implementation stays out of scope, §6). (C4, C5)
- **Keep:** §1 goal 2 / §2 "modules + rules, **not scenario enumeration**" (anti-template — aligned with V2 "scenario ≠ catalog"); §6 Resource Planning; §11 Risk; §2 separation of knowledge/logic.
- **Deprecate:** §4 "primary activity type" wording; §15 "Classification (direct)" as the canonical path.

### OPE_IMPLEMENTATION_ROADMAP.md *(sequencing)*
- **Modify:** §1 source-of-truth summary → V2 chain; §2/§4 add **Scenario Approval + Timeline + Timed Items** to the slice/flows; §7 composition emits **timed** items; §8 phases re-sequenced to V2; §10 contradictions updated with V2 resolutions; §11 first-task aligned to V2.
- **Keep:** §3 Out of scope; §9 risks/blockers (mostly); §5 "as-built schema wins / historical tables" note (consistent with deprecations above).
- **Deprecate:** the **category-mapping precondition** framing (§8/§9/§11) as the primary gate.

### OPE_EVENT_LIFECYCLE.md *(affected — approval & timeline placement)*
- **Modify:** distinguish **Scenario Approval** (pre-resourcing) from plan-"Ready" (§1/§2); hook **timed work items** to freeze points (§3); define **Completed against the requested outcome** for traceability (§6); reframe category-entry walkthroughs (§10). (C3, C5, C7, C6)
- **Keep:** the state spine; freeze points (time-as-backbone at lifecycle level — aligned); corrections temporal asymmetry (§4).
- **Deprecate:** none structural.

### EVENT_REQUEST_MARKET_ARCHITECTURE.md *(affected — request-first/category framing)*
- **Modify:** §1 request schema → **intent/outcome-first** (event type as metadata); §2 feasibility → "can the required **work** be fulfilled" (not "is this an event type we serve"); matching factor #2 → **capability**, not closed category. (C1, C6)
- **Keep:** demand-first model; waves/fairness; handoff to OPE.
- **Deprecate:** none.

### Documents requiring NO change (aligned or out of scope)
`OPE_SOURCING_ENGINE.md`, `WORKER_NETWORK_ARCHITECTURE.md`, `VENDOR_NETWORK_ARCHITECTURE.md`, `RESOURCE_MARKET_ARCHITECTURE.md`, `TRUST_AND_VERIFICATION_ARCHITECTURE.md`, `BUSINESS_MODEL_AND_MONETIZATION.md`, `ORGANIZER_OPERATING_SYSTEM_PRINCIPLE.md`. These are need/provenance/capability-driven and already model the supply layer correctly (Worker/Vendor explicitly reject category-as-primary). The only latent gap (an explicit **duration** field on a need/booking, C5) is deferred — see §6 Out of Scope.

---

## 4. Migration Order (safest sequence)

Top-down: fix the authority, then propagate so each child aligns to an already-corrected parent (avoids re-editing).

1. **MASTER_PRODUCT_DECISIONS.md** — set the V2 *decisions*: scenario = what-should-happen; request-first; mandatory Scenario Approval; timeline backbone; category = metadata. Everything inherits from here.
2. **OPE_MASTER_SPEC.md** — align the engine object model + pipeline (insert Approval + Timeline stages; category metadata; disambiguate "scenario").
3. **OPE_V1_TECHNICAL_DESIGN.md** — align the build contract (entry, scenario storage, workflow approval gate, timeline/timed-item fields); confirm §3 tables as historical.
4. **OPE_IMPLEMENTATION_ROADMAP.md** — re-sequence phases, update §10 contradictions, reset §11 first task to V2.
5. **OPE_EVENT_LIFECYCLE.md** — relocate approval, hook timed items to freeze points, outcome-based completion.
6. **EVENT_REQUEST_MARKET_ARCHITECTURE.md** — request-first / capability-not-category framing.

**Rationale:** define the conceptual model (1–2) before its realization (3–4) before its consumers (5–6). C2/C3 must be resolved in steps 1–2 first, because every later doc references "scenario" and the approval gate.

---

## 5. Validation Impact (future Universal Validation Suite)

The suite should encode **documentation-level conformance checks** (not new architecture) that fail if any source-of-truth doc drifts from V2:

1. **Chain presence & order** — each doc's pipeline narrative contains, in order: Request → Understanding → Scenario → **Approval** → Timeline → Timed Work Items → Resources → Staff → Vendors → Budget → Execution → Control.
2. **Scenario definition** — no doc defines "scenario" as category / template / catalog; every definitional use resolves to "what should happen." (Closes C2; detects C1/C2 contradictions.)
3. **Approval gate** — a **mandatory Scenario Approval** stage appears between Scenario and Timeline/Resources in every pipeline description. (C3)
4. **Timed-work-item contract** — every work-item specification enumerates the six fields (what · start/dependency · end/duration · location · responsible role/person · status). (C5)
5. **Timeline backbone** — date/time is required (not optional) and the timeline is the ordering axis, not a proposal section. (C4)
6. **Category = metadata** — no doc uses category as a primary object, gate, or template key. (C6)
7. **Traceability** — a request identifier threads request → scenario → timeline → resources → budget → execution → result, so actuals can be tied back to the request. *(Completed Activity status is separate and not outcome-defined — see `COMPLETED_ACTIVITY_SPEC_V1.md`.)* (C7)
8. **Term consistency** — cross-document, "scenario" carries exactly one meaning (no C1/C2 split).

These are assertions the suite *checks*; defining/implementing the suite is itself out of scope for this plan.

---

## 6. Out of Scope (must NOT change yet)

- **Worker Network**, **Vendor Network** — aligned; no edits.
- **Trust & Verification system** — orthogonal; no edits.
- **Business model / monetization** — no edits.
- **Pricing implementation** — no edits (pricing seeds/engine untouched).
- **Execution Engine implementation** — V2 re-prioritizes it in the *design narrative* only; **no code, no engine build**.
- **UI redesign** — entry-point reframing is a *documentation* decision here; no UI build.
- **Database schemas / migrations / code** — none in this pass.
- **Resource/Sourcing duration field (C5 supply-side)** — deferred to a later supply-layer pass.

---

## Appendix — Conflict → Document → Action matrix

| Conflict | MASTER | OPE_MASTER_SPEC | OPE_V1 | ROADMAP | LIFECYCLE | ERM |
|---|---|---|---|---|---|---|
| C1 Request-first | Modify §5/§11.6 | Modify §3/§4/§15 | Modify §1/§8.1 | Modify §8/§9 | — | Modify §1/§2 |
| C2 Scenario meaning | Modify §5 / Deprecate §9 | Modify §3/§5 | Modify §3/§4 | — | — | — |
| C3 Approval gate | Modify §10.3 | Modify App. A | Modify §6 | Modify §4 | Modify §1/§2 | — |
| C4 Timeline backbone | Modify §5/§10.3 | Modify §5/§12 | Modify §5.1/§4 | Modify §2/§7 | Keep §3 | — |
| C5 Timed work items | — | Modify §12/§13 | Modify §3.2 | Modify §5/§7 | Modify §3 | — |
| C6 Category metadata | Modify §11.6 | Modify §4 | Modify §3.1/§5.2/§8.1 | Modify §8/§9 | Modify §10 | Modify factor #2 |
| C7 Traceability | — | — | Modify §3.2 | Modify §5 | Modify §6 | — |

---

*Work plan only. No source document rewritten, no new architecture, no engines, no schemas, no code. Migration is documentation-first; implementation follows separately against the corrected contract.*

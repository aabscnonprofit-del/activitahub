# Planning Layer Migration Roadmap (v2)

> **Status: AUTHORITATIVE — migration plan of record.** Governed by `docs/IMPLEMENTATION_CONTRACT.md`.
> This document records the **already-approved** Planning Layer Migration sequence (v2, with Decision A
> applied) and the **architectural clarification accepted after Stage 5b**. It does **not** change the
> migration sequence, the implementation stages, or their dependencies.
>
> **Decision A (authoritative):** *PlannerInput must never be reconstructed from EventPlanV2.*

## Stage sequence (unchanged) and completion status

| Stage | Summary | Status |
|---|---|---|
| **0 — Baseline & parity harness** | Freeze current planning behaviour for objective verification. | ✅ Done |
| **1 — Planning Engine V2 boundary (inert)** | Introduce the `EventPlanV2` types + engine interface; wired to nothing. | ✅ Done |
| **2 — Planning Engine V2 reasoning** | Deterministic, LLM-free `FED → EventPlanV2`; not connected to production. | ✅ Done |
| **3 — Adapter A1 (delivery-component projection only)** | Project `EventPlanV2` → delivery-component shape; **no PlannerInput projection** (Decision A). A1 is temporary, removed by end of Stage 5. | ✅ Done |
| **4 — Persist EventPlanV2 in parallel** | Produce + persist `EventPlanV2` (migration `047`/M1) alongside the legacy plan; legacy remains authoritative; no PlannerInput derived; no consumer reads it. | ✅ Done |
| **5 — Consumer migration, then authority flip** | Migrate each consumer to read `EventPlanV2` directly, then flip authority. | ◐ In progress |
| &nbsp;&nbsp;5a — Budget ← EventPlanV2 | Budget sources lines directly from `EventPlanV2`; **Adapter A1 removed**. | ✅ Done |
| &nbsp;&nbsp;5b — Plan Review ← EventPlanV2 | Plan Review UI renders the prepared event natively from `EventPlanV2`. | ✅ Done |
| &nbsp;&nbsp;**5c — Commercial Proposal ← EventPlanV2** | Commercial Proposal reflects the `EventPlanV2`. | ▶ **Next** |
| &nbsp;&nbsp;5d — Public Space ← EventPlanV2 | Public projection presents the event from `EventPlanV2` (migration M2). | ◯ Pending |
| &nbsp;&nbsp;5e — Recompute ← EventPlanV2 | Recompute re-runs Planning Engine V2 from the persisted `EventPlanV2`. | ◯ Pending |
| &nbsp;&nbsp;5f — Authority flip | `EventPlanV2` becomes the **Source of Truth** (only after 5a–5e). | ◯ Pending |
| **6 — Retire PlannerInput producers & legacy entry** | Remove the FED→PlannerInput converter and the structured-form planner. | ◯ Pending |
| **7 — Remove the legacy Planning Layer** | Delete the category engine + `PlannerInput`; drop `ope_plans.input` (migration M3). | ◯ Pending |

**Adapters:** **A1** (temporary) — `EventPlanV2` → delivery-component projection; removed at end of Stage 5
(removed in 5a). **A2** — removed from the roadmap (it would have derived PlannerInput; forbidden by Decision A).
**DB migrations:** **M1** (`047`, Stage 4, done) · **M2** (Stage 5d) · **M3** (Stage 7).

*This sequence, its stages, and their dependencies are unchanged. The section below records an architectural
clarification only.*

---

## Stage 5b architectural clarification (recorded after Stage 5b)

During Stage 5b, an architecture review identified a **missing definition of the Project itself** — the
migration had been advancing the planning representation without an authoritative statement of what the
Project *is* and how it *lives*. This resulted in the acceptance of **two new authoritative architectural
principles**:

- **`PROJECT_AS_PLACE_PRINCIPLE.md`** — the Project is a permanent digital place with one stable address;
  every role enters the same place; only its season changes.
- **`PROJECT_STATE_MODEL_PRINCIPLE.md`** — every meaningful action changes the state of exactly one Project;
  the Project Workspace is the live representation of that state.

**These principles do not change the migration sequence.** They **clarify the architectural meaning** of the
remaining stages. Specifically, they record that the consumers being migrated in Stage 5 are not separate
products but **projections of the same Project**:

- **Commercial Proposal** (Stage 5c) is a **projection of the Project**.
- **Public Space** (Stage 5d) is a **projection of the Project**.
- **Event Home** is a **projection of the Project** (the participant-facing view).
- **Project Workspace** is the **organizer's projection of the Project**.
- **Registration** happens **inside the Project**, not outside it.
- **Payments** belong to the **Project**.

In other words, migrating each consumer to read `EventPlanV2` is migrating each **projection of the one
Project** to the single planning representation — consistent with the Project remaining the durable Root
Entity (`ADR_003_ENTITY_OWNERSHIP.md`) and the single integration point (`PROJECT_STATE_MODEL_PRINCIPLE.md`).

## Next implementation stage (unchanged)

**Stage 5c — Commercial Proposal ← EventPlanV2.**

---

*This document records the approved migration plan and the post-Stage-5b clarification. It adds no stage,
changes no dependency, and modifies no implementation stage. Related: `IMPLEMENTATION_CONTRACT.md`,
`PROJECT_AS_PLACE_PRINCIPLE.md`, `PROJECT_STATE_MODEL_PRINCIPLE.md`, `ADR_003_ENTITY_OWNERSHIP.md`.*

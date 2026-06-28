> **STATUS: SUPERSEDED** — the current implementation roadmap is `ROADMAP_V2.md`. Kept for record.

# OPE Implementation Roadmap

> **Status:** Implementation planning. Architecture phase is **closed** — this document does **not** design new architecture or redesign OPE. It sequences the build of what the two source-of-truth documents already decided.
> **Source of truth:** `docs/MASTER_PRODUCT_DECISIONS.md`, `docs/OPE_V1_TECHNICAL_DESIGN.md`.
> **Grounding:** reflects the deployed code through commit `7e7a836` (origin/main) plus the local migration files `026` (applied) and `027` (drafted, unapplied).

---

## 1. Source-of-truth summary

**MASTER_PRODUCT_DECISIONS.md** — product decisions:
- OPE is the core organizer value proposition; its **primary outcome is a Client Proposal Generator** (§10.3): Executive Summary, Timeline, Staffing Plan, Resource Plan, Budget Estimate, Risk Assessment, proposal-ready document. Priority order: **1) Proposal generator → 2) Attach proposal to request → 3) PDF export → 4) Convert to activity** (§10.3, resolves OPE design §13 Q4).
- Two marketplace models (§2): **Ready Activities** (supply-first, `activities`) and **Event Requests** (demand-first, `customer_requests`). OPE produces a **preliminary assessment before** a request reaches organizers (§5).
- **Single Engine Strategy** (§11.6): Activity Planner and Organizer Platform are surfaces over one shared OPE Core; only the professional output layer is organizer-gated.
- **Activity Planner is an official user-facing surface** (§11.5) — explicitly **supersedes** the OPE design's "organizer-only" non-goal.
- Money is deterministic; **"the LLM proposes *what*; the engine computes *how much*"** (§5). Organizer edits → deterministic recompute, no new LLM call.

**OPE_V1_TECHNICAL_DESIGN.md** — the build contract:
- Scenario → grounded plan → deterministic cost (low/likely/high) → review/edit → outputs (§1, §12).
- **Layering rule** (§2): LLM is the *content* engine (what tasks/resources/quantities); a separate **deterministic cost module** owns all money. They never overlap.
- KB grounds the plan (§5); cost engine is pure/deterministic (§7); organizer editing recomputes via the cost engine only (§9.4).
- Event Requests flow through an OPE **preliminary assessment** then reach organizers in **Marketplace** or **Direct** mode (§9).

**Both documents agree on the spine:** deterministic money + LLM-proposed content + editable plans + proposal as the primary output + request→assessment→organizer.

---

## 2. V1 implementation scope

The V1 deliverable is the **vertical slice**, working end-to-end and producing a draft that **reflects the actual request**:

> **user event request → generated OPE draft → editable plan → saved event plan** (→ proposal back to the customer).

In scope:
- Customer event request capture (`customer_requests`) and distribution to eligible organizers (`match_request` → `request_matches`).
- Generation of an OPE **draft plan** from a request, linked by `source_request_id`, with a deterministic **assessment**.
- Request-content **understanding** sufficient that named requirements (e.g. "foam party, alcohol, clowns, limousines") become **tasks, resources, cost lines, and risks** — per SoT "LLM proposes *what*".
- **Deterministic cost engine** for all money (low/likely/high), recomputed on edit.
- **Editable** plan (inputs, budget corrections, prep state) and **saved** plan with lifecycle.
- **Client Proposal** generation, attach-to-request, and PDF export (priorities 1–3 — already built).

Already implemented (do not rebuild): `ope_plans` store + CRUD, `createPlanFromRequest`, assessment display + freshness, proposal generator + send-to-request + print/PDF, lifecycle, readiness, deterministic cost engine for the seeded categories.

---

## 3. Out of scope (for now)

- **Worker Network / Vendor Network / Resource Market / Event Request Market advanced matching** (waves, fairness tiers, Direct-mode UI, trust tiers) — separate systems; OPE consumes them later.
- **Convert plan → marketplace activity** (priority 4) — after the slice + understanding.
- **Multi-region / multi-currency pricing**, historical/external pricing providers (design §12 v2).
- **pgvector / semantic KB** (design §5.2 future).
- **Verified (identity) badge** and capability/service-area profile model (not in schema; MASTER §3).
- **Per-organizer LLM generation quota UI** beyond a basic guard (design §7.6) until the LLM layer exists.

---

## 4. Required user flows

1. **Customer creates a request** → request stored → distributed to eligible organizers (`match_request`).
2. **Organizer opens a matched request** → **Generate OPE Plan** → deterministic draft created, linked via `source_request_id`, assessment computed.
3. **Draft reflects the request** → named requirements from the notes appear as tasks/resources/costs/risks (the V1 understanding step).
4. **Organizer edits** → inputs / budget corrections / prep state → deterministic recompute; assessment refreshed.
5. **Organizer saves / advances lifecycle** → persisted `ope_plan`.
6. **Organizer generates a proposal** → attaches it to the originating request (`send_proposal`) and/or prints to PDF.

Flows 1, 2, 4, 5, 6 are implemented. **Flow 3 is the V1 gap.**

---

## 5. Required database changes

All changes are **forward migrations on the as-built `ope_plans` schema** (the design doc's `planning_scenarios/plans/plan_items/knowledge_entries/knowledge_pricing` table set was never built — see §9 contradiction C3; the as-built schema wins).

- **026 `ope_plan_request_link`** — `source_request_id`, `assessment` on `ope_plans`. **APPLIED** (verified live).
- **027 `match_request_access_and_activity`** — broad V1 eligibility (certified + access + workload; drop activity/category/geo gates). **DRAFTED, UNAPPLIED** — apply before the slice can surface requests.
- **028 (new, for Flow 3)** — store structured request requirements + their plan contributions. Minimal option: a nullable `requirements JSONB` column on `ope_plans` (extracted features + provenance). No new tables; reuses the JSONB pattern. Only needed if requirements must be first-class/queryable; otherwise they can live inside the existing `input`/`result` JSONB.

No other schema changes for V1. `customer_requests` is unchanged (intent-first capture, if pursued, rides in existing `event_type` + `notes`).

---

## 6. Required UI screens / components

Existing (reuse, do not rebuild):
- Customer request form — `app/[locale]/requests/new/page.tsx`.
- Organizer matched-requests + **Generate OPE Plan** — `app/[locale]/dashboard/requests/page.tsx`.
- Plan detail / edit / assessment / readiness / lifecycle — `components/dashboard/{PlanDetailClient,SavedPlanView,EditPlanForm,AssessmentStrip,ReadinessStrip,LifecycleControls}.tsx`.
- Proposal document + send + print — `components/dashboard/{ProposalDocument,ProposalPrintButton}.tsx`, `app/[locale]/dashboard/plans/[id]/proposal/page.tsx`.

New / changed for V1:
- **Requirements panel** in the plan view: show the requirements detected from the request (chips/section) and let the organizer confirm/remove them — so Flow 3 is visible and editable. (Extends `SavedPlanView`/`PlanDetailClient`; no new route.)
- **(Optional) intent-first request input**: free-text "what do you want to organize?" + intent presets mapping to `event_type`, raw phrase retained in `notes`. UI-only over the existing field.

---

## 7. Required backend / API functions

Existing (reuse): `createPlanFromRequest`, `createPlan`, `getPlan`, `listPlans`, `updatePlanInputs`, `saveCorrections`, `savePrepState`, `advancePhase`, `sendProposalFromPlan` (`lib/actions/opePlans.ts`); `createRequest`, `match_request` RPC (`lib/actions/requests.ts`, migration 008/027); deterministic engine (`lib/ope/*`); `buildProposal`, `buildAssessment`, `applyBudgetCorrections` (`lib/workspace/*`, `lib/ope/request-plan.ts`).

New for V1 (Flow 3 — the core work):
- **Requirement extraction** — `extractRequirements(text) → Requirement[]` (deterministic keyword/synonym map first; LLM-backed later). Pure module under `lib/ope/`.
- **Requirement → plan composition** — extend the engine so `assembly.ts` / `resources.ts` / `budget.ts` / `risk.ts` read the extracted requirements and **inject add-on tasks, quantities, cost drivers, and risks** (e.g. foam→equipment+cleanup+slip risk; alcohol→beverage cost+over-serving/ID risk; entertainer→cost+booking task; transport→logistics cost). This is implementing the design's "LLM proposes *what*" output into the existing composition stage — **not** a new engine.
- **Add-on/feature data** — small JSON feature fragments under `data/ope/features/` (tasks + cost_drivers + risks per add-on), merged by the assembler. Mirrors the existing module-data pattern.
- **Wire-in:** `createPlanFromRequest` / `generatePlan` call extraction and pass requirements into the pipeline; `updatePlanInputs` re-runs them on edit (deterministic, reproducible).

---

## 8. Implementation sequence by phases

**Phase 0 — Make the slice reachable (smallest, unblocks everything).**
- Apply migration **027** (broad matching) so submitted requests reach organizers.
- Reconcile the request↔OPE category mapping so a submitted request reliably maps to a plan, or returns an honest coverage response (no silent mis-map). Align the request form's offered categories, the `createRequest` accepted set, and `REQUEST_TO_PLANNER_CATEGORY`.
- Verify request → Generate OPE Plan → editable → saved end-to-end against live data (026/027 applied).

**Phase 1 — Vertical slice acceptance (the V1 first target).**
- Confirm the full chain produces a **saved, editable** `ope_plan` from a real request, with assessment, proposal, and PDF. (Components exist; this phase is wiring verification + taxonomy fixes from Phase 0.)

**Phase 2 — Request understanding (deterministic) — the core V1 capability.**
- Build `extractRequirements` (keyword/synonym → feature) + `data/ope/features/*` fragments.
- Extend `assembly/resources/budget/risk` to consume requirements → drafts reflect the notes (tasks/resources/costs/risks/procurement). Surface them in the Requirements panel (§6).
- Deterministic, reproducible; money still computed by the cost engine only.

**Phase 3 — LLM "what" layer (SoT-aligned).**
- Per OPE design §2/§6: add the LLM content engine (`@anthropic-ai/sdk`, Sonnet 4.6 default) to *propose* items/quantities/requirements; the deterministic cost engine (§7) is unchanged. Replace/augment the Phase-2 extractor. Add the basic spend guard (§7.6). This closes the documented engine design.

**Phase 4 — Output completeness & breadth.**
- Convert plan → activity (priority 4); broaden categories/regions/pricing seeds; richer §9.2 assessment fields.

> Phases 0–2 deliver a slice that actually reflects the request **without** new infrastructure. Phase 3 fulfills the documents' LLM clause. Phase 4 widens coverage.

---

## 9. Risks and blockers

- **Migration 027 unapplied** — until applied, requests don't reach organizers (matching too strict). Blocks Phase 0. *(No DDL path from the dev environment; apply via Supabase SQL Editor.)*
- **Deploy ordering** — schema migrations must precede the code that writes their columns (already learned with 026/Task #3). Same rule for 028.
- **Taxonomy fragmentation** — three category sets diverge: request form options (`lib/categories`), `createRequest` accepted set, and OPE planner categories (`plannerInputSchema`). Must reconcile in Phase 0 or drafts mis-map.
- **Understanding is the real gap** — today the engine **ignores request notes** (verified: notes reach only `coverage` refusal regex + a `/theme/` regex + a section-A echo; no plan content derives from them). The slice "works" structurally but produces a generic template until Phase 2.
- **LLM introduction cost/latency** (Phase 3) — new dependency, API key, spend controls, failure modes (design §6.3/§10). Defer behind the deterministic Phase 2.
- **Pricing breadth** — only Honolulu seeds; non-seeded regions fall back with a disclaimer and the customer's budget target is not used in computation. Acceptable for V1 slice; flagged for Phase 4.

---

## 10. Contradictions between the source-of-truth documents

List them explicitly; proposed winner for each:

- **C1 — Customer-facing planner.** OPE_V1 §1.3 non-goal "No customer-facing planner (organizer-only)" vs MASTER §11.5 "Activity Planner is an official user-facing surface." **MASTER wins** — it explicitly supersedes OPE §1.3, which is marked "to be amended separately." (As-built already exposes a public planner.)
- **C2 — Primary output.** OPE_V1 §1/§8.1 originally framed "convert to activity" as a candidate primary outcome vs MASTER §10.3 "Client Proposal Generator is primary; convert-to-activity is priority 4." **MASTER wins** — already reconciled in OPE_V1 §13 Q4 (RESOLVED, 2026-06-04).
- **C3 — Database schema.** OPE_V1 §3 specifies `planning_scenarios / plans / plan_items / knowledge_entries / knowledge_pricing` (migration `017_ope.sql`) vs the as-built single `ope_plans` table (021/022) + JSON KB. **The as-built schema wins** for V1 (deployed; architecture phase closed). OPE_V1 §3 is historical; do not build its tables. *(Doc-vs-implementation divergence, not an inter-doc conflict, but decisive for the roadmap.)*
- **C4 — KB storage / routes.** OPE_V1 §5 (DB-table KB) and §8 (`/dashboard/planner`) vs as-built JSON KB (`data/ope/*`) and routes (`/dashboard/plans`, `/plan-an-event`). **As-built wins.**
- **C5 — Engine content source.** Both docs specify an **LLM** proposes "what" (MASTER §5, OPE_V1 §2/§6); the as-built engine is **fully deterministic, no LLM**. The documents agree with each other; the **implementation diverges**. **The documents win** as the V1 target — the LLM "what" layer is scheduled (Phase 3), with a deterministic interim (Phase 2) so the slice reflects requests sooner. This is implementing the design, not redesigning it.

---

## 11. First coding task recommendation

**Phase 0, step 1 — make the slice reachable and reliable:**

1. **Apply migration 027** (broad matching) — operational prerequisite.
2. **Reconcile the request→OPE category path** in code: align the request form's category options, `createRequest`'s accepted set, and `REQUEST_TO_PLANNER_CATEGORY` so every submittable request either maps to a plannable category or returns an honest coverage response — no silent mis-mapping. This is a small, safe, no-new-architecture change in `lib/ope/request-plan.ts` (+ the request form / `createRequest` category lists), and it is the precondition for the vertical slice to behave correctly end-to-end.

Then proceed to **Phase 2 (requirement extraction)** as the first substantive capability — the step that makes the generated draft actually reflect the customer's request, which is the whole point of the slice.

> Rationale: the vertical slice's components already exist (Tasks #1/#3/#5/#6). The cheapest unblock is matching + taxonomy reconciliation; the highest-value follow-on is request understanding. Neither introduces new architecture.

---

*This roadmap sequences only what MASTER_PRODUCT_DECISIONS.md and OPE_V1_TECHNICAL_DESIGN.md already decided. No new architecture, no OPE redesign. Where the two documents and the as-built code disagree, the winners are listed in §10.*

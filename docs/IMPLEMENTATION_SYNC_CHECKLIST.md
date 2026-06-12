# Implementation Sync Checklist — OPE v1

> **Purpose:** verify the OPE v1 **implementation scope** matches the approved architecture before/while
> building. **Not** new architecture, redesign, schema, API, or code.
> **Reads against:** the architecture set + `ARCHITECTURE_CLOSURE_REPORT`, and the **already-built**
> engine (`lib/ope`, M1–M3).
> **Surface note:** "OPE v1" here = the **organizer-facing** OPE (workspace → sourcing → marketplace),
> built on the **deterministic engine** that M1–M3 already proved. The **consumer Activity Planner** is a
> **second surface of the same engine** (Single Engine, `MASTER §11.6`) — not a separate engine.
> **Date:** 2026-06-11.

---

## 1. Features that MUST be in OPE v1

| Feature | Architecture owner | Built today (M1–M3)? |
|---|---|---|
| **Event intake → Scenario** | `OPE_MASTER_SPEC §3` | ✅ engine intake (`PlannerInput`→`Scenario`); ⛔ organizer persistence |
| **Coverage / complexity gate** (supported / refuse / handoff) | `ADR_002` | ✅ built (`coverage.ts`) |
| **Clarification loop** (UNKNOWN→ASK, ≤3) | `OPE_CLARIFICATION_ENGINE` | ✅ built (`clarification.ts`) |
| **Plan generator** — 6-section `OUTPUTS_V1` | `OPE_MASTER_SPEC §14` | ✅ built (`engine.ts`, deterministic) |
| **Budget engine** — low/likely/high + line items + currency note | `OPE_MASTER_SPEC §7` | ✅ built (`budget.ts`, Honolulu seed + fallback) |
| **Task & resource planning** — checklists + sized quantities | `OPE_MASTER_SPEC §6` | ✅ checklists + counts; ⛔ structured **needs** (staffing/vendor) emission |
| **Risk register** (applicable risks + mitigations) | `OPE_MASTER_SPEC §11` | ✅ built (`risk.ts`) |
| **Ready-to-send messages** | `OPE_MASTER_SPEC §10` | ✅ built (`communication.ts`) |
| **Recurring modifier** | M2 | ✅ built (`modifiers.ts`) |
| **Editable organizer workspace** — view/edit/recompute, current-plan-only corrections | `OPE_PLANNING_WORKFLOW §3`, `OPE_EVENT_LIFECYCLE` | ⛔ not built (consumer is in-memory; line-item IDs ready) |
| **Plan persistence + lifecycle states** | `OPE_EVENT_LIFECYCLE` | ⛔ not built |
| **Sourcing request / brief generation** (L0) | `OPE_SOURCING_ENGINE` | ⛔ not built (depends on needs emission) |
| **Early marketplace handoff** (Event Request assessment; Resource Market R0/R1 briefs) | `EVENT_REQUEST_MARKET`, `RESOURCE_MARKET §0–3` | ⛔ not built (Event-Request primitives exist) |

**Bottom line:** Milestones 1–4 (engine) are **substantially built** (M1–M3); the genuinely new OPE-v1
work is **persistence + editable workspace (M5)**, **sourcing brief generation (M6)**, and **early
marketplace integration (M7)**.

---

## 2. Features explicitly deferred (out of OPE v1)

| Deferred | Why / owner |
|---|---|
| **Community modifier** | `OPE_PATTERN_VALIDATION` — Phase 1c, after v1 |
| **Additional patterns** (Conference, Performance, Tournament, Expedition) | `OPE_PATTERN_COVERAGE_ANALYSIS` — coverage gaps |
| **Vendor / Staffing matching** (full networks) | `WORKER`/`VENDOR_NETWORK` — v1 emits **needs/briefs** only (L0/W0/V0), no matching |
| **Resource Market transactions** (R2 booking, R3 payments) | `RESOURCE_MARKET §12` — v1 = R0/R1 coordination/discovery |
| **Payments / escrow / contracts / disputes** | `RESOURCE_MARKET §6–9/§14` + Payment Engine (undefined) |
| **Trust Layer** (standing, verification mechanics) | `TRUST_AND_VERIFICATION` — consumes signals the v1 lifecycle will start to produce |
| **Learning / Monitoring implementation** | `OPE_LEARNING_ARCHITECTURE`, `OPE_MASTER_SPEC §13` — v1 captures actuals; promotion is post-v1 |
| **Multi-region pricing depth, FX** | `OPE_IMPLEMENTATION_READY §3` — v1 = one launch region + fallback note |
| **LLM tool-use planner** | superseded — engine is **deterministic** (`OPE_CORE_MVP`) |
| **Proposal view / PDF export / "convert to activity"** | `OPE_V1 §13.4` priority 2–4 — after the core plan + workspace |

---

## 3. Dependencies between modules

```
Intake ─▶ Coverage Gate ─▶ Clarification ─▶ Classification/Assembly ─▶ Resource Planning ─▶ Budget ─▶ Risk ─▶ Output (+ modifiers)
  (M1)         (built)         (built)              (built)                 (built/partial)     (built)  (built)   (built)

Editable Workspace (M5)  ── depends on ──▶  Output (M2) + Budget (M3) + a persistence decision (§5)
Sourcing Briefs   (M6)   ── depends on ──▶  Resource/Staffing NEEDS (M4) + request_brief contract (§5)
Early Marketplace (M7)   ── depends on ──▶  Sourcing Briefs (M6) + Event-Request primitives + OPE assessment
```

- The **engine pipeline (M1–M4)** is internally wired and proven (snapshot tests).
- **M5** needs persistence (a decision, not yet made) + the existing line-item IDs (ready).
- **M6** needs the **Staffing/Vendor needs emission** (currently PARTIAL — only `supervising_adults`) and
  the **`request_brief` contract** (undefined).
- **M7** needs M6 + the partly-built `customer_requests`/`proposals`/`bookings` primitives.

---

## 4. Contradictions between source-of-truth documents (must resolve with the build)

| # | Location | Contradiction | Resolution for v1 |
|---|---|---|---|
| C1 | `OPE_V1 §1` ("no customer-facing planner / organizer-only") | vs `MASTER §11.5` + the **built public planner** | adopt **Single Engine, two surfaces**; amend `OPE_V1 §1` (closure §5) |
| C2 | `OPE_V1 §6/§7.6/§13.2` (LLM planner + spend controls) | vs the **deterministic** engine in `lib/ope` | build deterministic; amend `OPE_V1 §6` |
| C3 | `MASTER §10.3` / `OPE_V1 §13.4` ("Primary Outcome = Client Proposal Generator") | vs the **consumer plan** built first; proposal is a **deferred view** (`OPE_IMPLEMENTATION_READY §5`) | v1 builds the **plan + workspace**; the proposal is a later view — reconcile the priority statement |
| C4 | `MASTER §11.9` lists **P9/P10 open** | already **resolved** (`OPE_IMPLEMENTATION_READY §5`: OUTPUTS_V1 canonical; proposal = view) | mark resolved in Master (sync) |

None of these **block** the engine work (the deterministic, two-surface reality is settled); they must be
**synced into the source-of-truth** so they stop misdirecting implementers.

---

## 5. Missing implementation decisions that BLOCK development

| Blocker | Blocks | Needed decision |
|---|---|---|
| **`request_brief` contract** (referenced in 8 docs, undefined) | **M6, M7** | the structured shape of an OPE→sourcing/marketplace need (capability/qty/window/budget/spec) — *concept-level, not schema* |
| **Staffing/Vendor needs emission** (`OPE_MASTER_SPEC §9` PARTIAL) | **M4→M6** | OPE must emit capability-typed needs, not just `supervising_adults` |
| **Plan persistence decision** | **M5** | that plans persist + are editable + versioned (capability-level; schema is a build detail, not decided here) |
| **Launch-region pricing scope** (`OPE_V1 §13.1` open) | **M3 breadth** | which region(s) priced for v1 (Honolulu confirmed as the seed; others = fallback) |
| **Consumer-planner monetization during v1** | release scope | the public planner is currently **free** vs `MASTER §11.8` "paid" — decide v1 stance (likely keep free during build; close later) |

**The two hard blockers for the new work are `request_brief` and Staffing needs emission** — both gate
M6/M7. M1–M5 can proceed without resolving the marketplace-side items.

---

## Sync verdict

- **Engine (M1–M4): in sync and largely built** — proceed to hardening + needs emission.
- **Workspace (M5): clear scope**, needs a persistence decision.
- **Sourcing + Marketplace (M6–M7): blocked** until `request_brief` + Staffing needs emission are
  decided (concept-level).
- **Source-of-truth sync (C1–C4):** do in parallel; does not block the engine.

_Sync/checklist only. No architecture, code, schema, or API. Reflects the cited documents + `lib/ope`
(M1–M3) as of the date above._

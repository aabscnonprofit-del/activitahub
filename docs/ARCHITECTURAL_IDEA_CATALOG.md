# ActivLife Hub — Architectural Idea Catalog

> **Purpose:** a single consolidated catalog of every significant engineering idea surfaced by the
> Global Engineering Benchmark (Parts 1–10), de-duplicated across documents, mapped to the owning
> ActivLife Hub module, and given a verdict. This is the cross-cutting index that the ten domain
> documents feed and that `FINAL_ENGINEERING_RECOMMENDATIONS.md` draws on.
> **Status:** engineering research only. **Changes no code, no schema, no architecture, no pipeline.**
> It maps ideas *onto* the existing 8-module architecture; it does not redesign it.
> **Source documents:** `PROJECT_MANAGEMENT_EVOLUTION.md` (P1), `TASK_MANAGEMENT_ENGINEERING.md`
> (P2), `EVENT_MANAGEMENT_ENGINEERING.md` (P3), `CRM_ENGINEERING.md` (P4),
> `PROCUREMENT_ENGINEERING.md` (P5), `ERP_ENGINEERING.md` (P6), `KNOWLEDGE_ENGINEERING.md` (P7),
> `AUTOMATION_ENGINEERING.md` (P8), `AI_ENGINEERING.md` (P9), `REAL_ORGANIZER_DECISION_MODEL.md` (P10).

## Verdict legend
- **ADOPT** — a universal engineering solution ALH does not yet have; add it conceptually to the
  named module's contract (no implementation in this research).
- **INVESTIGATE** — promising but contingent; resolve a stated open question before committing.
- **PROTECT** — ALH already solves this **better**; the recommendation is to *not regress* it.
- **REJECT** — a common idea ALH should deliberately **not** adopt, with the reason.

Modules: M1 Discovery · M2 OPE Engine · M3 Project Assembly · M4 Organizer Workspace · M5 Resource
Marketplace · M6 Event Execution · M7 Completion Evidence · M8 Project Closure · ✦ cross-cutting /
no clean module yet.

---

## 1. Convergent findings (raised independently by ≥2 documents — highest confidence)

| # | Idea | Raised by | Problem it solves | Owner | Verdict |
|---|---|---|---|---|---|
| C1 | **Criticality / critical-path / "load-bearing" surfacing** | P1 (CPM float, governing chain), P6 (critical-path readout), P10 (the #1 human gap: ALH can *order* work but can't say which 3 things carry the day) | The plan shows order but not *importance*; organizers must know the critical few | **M3 computes → M4 surfaces** | **ADOPT** (see open question O1) |
| C2 | **Explicit re-plan lineage / versioned baselines** | P6 ("single strongest candidate gap"), P4/P7 (lineage), and ALH's own M3 §6 deferral + unused `validateCurrentInvariant` | When intent changes, what supersedes what, why, and how the prior plan is preserved | **M2/M3 generate, M4 owns lineage**, Project gains a `supersedes` link + reason + trigger | **ADOPT** (architectural risk R1) |
| C3 | **Stage gates as machine-checkable predicates + an explicit human go/no-go at "Ready"** | P6 (stage gates), P2 (Jira transition validators), P1 (gate criteria), P3 (registration-closed freeze), P10 (final go/no-go is never delegated) | Advancement without verified readiness; and a missing *human* decision artifact at the planning→execution boundary | **M4 lifecycle**; evidence-gate **M7→M8** | **ADOPT** |
| C4 | **Append-only unified Project interaction timeline** (notes, comms, decisions, ownership transfers, mentions as one attributed ordered stream) | P4 (CRM activity timeline), P2 (Asana "Stories" audit stream) | Fragmented collaboration history; no single chronological truth of "what happened and who did it" | **M4** | **ADOPT** (ALH already has logical events — this is the idiom applied to collaboration) |
| C5 | **Named Plan-B / backup / graceful-degradation as first-class** | P10 (named Plan B; full→reduced→minimum-viable), P3 (contingency reserve), P1 (buffers) | `mitigation` today is narrative prose, not an executable alternative path | **M2 (alt need) + M5 (source backup) + M4 (hold/choose)** | **ADOPT** |
| C6 | **Aggregated uncertainty buffer** (Critical Chain: pool uncertainty at the outcome, burn it down) | P1 (CCPM, top import), P3 (contingency reserve) | Per-task padding is wasted (Parkinson/Student); estimates lie | **M2 defines, M4 monitors** | **ADOPT** |
| C7 | **Vendor re-confirmation lifecycle ("booked ≠ confirmed")** + continuous re-qualification | P10 (closed confirmation loops), P5 (re-qualification, insurance/verification expiry), P3 (COI deadlines) | The seam stops at `accepted`; real vendors silently fall through between booking and the day | **M5 confirm/re-qualify + M4 track/remind** | **ADOPT** |
| C8 | **Three-column budget** (Estimated → Committed → Actual + variance; never overwrite the baseline) | P3 (hotel/event budgeting), P6 (plan-vs-actual), P1 (flow over EVM) | Overwriting estimates destroys the learning signal and the baseline | **M2 estimate · M4/M5 committed · M6→M8 actual + variance-with-reason** | **ADOPT** (largely aligned already) |
| C9 | **Notification restraint** (subscription/follow + mentions + batching + digest/off-hours) | P2 (Basecamp/Asana), P4 (@mentions as scoped events) | Notification fatigue is a primary failure mode of collaborative tools | **M4** | **ADOPT** |
| C10 | **Many lenses over one derived Project** (Kanban for status, grid for budget, list/graph) as projections, never copies | P2 (Jira/Asana/Notion), P1 (Gantt only as projection) | Different roles need different views without forking the source of truth | **M4** | **ADOPT** (already in M4's lens intent) |
| C11 | **Idempotency keys + retry/backoff + dead-letter-to-human** on outward actions; **replay reconstructs state but never re-performs outward effects** | P8 (durable execution, Make/n8n handlers) | Double-send / double-charge / double-book; partial failures | **M4→M5 seam, M6**; replay boundary at M5/M6 | **ADOPT** |
| C12 | **"Automation assists & prepares; humans confirm consequential/irreversible/outward actions; AI/automation never decides intent or commits unattended"** | P8 (automate-vs-human model), P9 (AI advise/decide-with-confirmation/never), P10 (never-delegated decisions) | Automation bias; unattended irreversible actions; eroded auditability | **cross-cutting governance (M4/M5/M6)** | **ADOPT** |
| C13 | **Always-verify baseline checklist** (headcount, timing, access, power, weather, dietary/safety, confirmations) seeded from M2 `never_drop` | P10, P3 | Experts verify the same load-bearing facts every time; ALH has no guaranteed cross-cutting verification set | **M4 prep → M6 day-of** | **ADOPT** |
| X1 | **Cross-project relationship / identity memory** (repeat clients, repeat vendors, organizer reputation, relationship edges) | P4 (central finding — "homeless"), P3 (cross-event participant identity — "no clean module home") | ALH is per-event/immutable by design — correct for one event, blind to the second | **✦ new cross-cutting layer, referenced by stable IDs; NOT M4 (per-project) nor M5 (per-request)** | **INVESTIGATE** (architectural risk R2) |
| X2 | **Learning loop / template-memory** (closed project → proposed reusable pattern → expert gate → strengthens future Discovery/OPE) | P7 (top INVESTIGATE), P2 (templates), P1 (timeless patterns) | Each event starts cold; organizational memory is lost | **M8 → M1/M2 via the existing expert gate** | **INVESTIGATE** |

---

## 2. Module-specific ideas

### M2 — OPE Engine
| Idea | Source | Owner | Verdict |
|---|---|---|---|
| Uncertainty as **ranges** (low/likely/high), reject PERT beta-math | P1 | M2 | ADOPT-principle / REJECT-math |
| Typed dependency edges (FS/SS/FF/SF) for a faithful relative timeline | P2, P6 | **M2 (IR) → M3 (Project)** | INVESTIGATE |
| Expressive **abstract resource demand** (role + quantity + *when*), shortfalls → coverage gaps | P6, P5 | M2 → surfaced M5 | INVESTIGATE |
| RFQ-vs-RFP **determinacy fork** signalled by spec-completeness | P5 | M2 signals · M5 forks | ADOPT |
| Peak-and-ending / "the moment" as a first-class FED/IR concept | P10 | M1/M2 | INVESTIGATE |

### M3 — Project Assembly
| Idea | Source | Owner | Verdict |
|---|---|---|---|
| Critical-path / float **annotation** computed over the existing acyclic graph | P1, P6, P10 | M3 computes · M4 consumes | ADOPT (O1) |
| Backward-from-fixed-points sequencing + "immovable point" concept | P10 | M3/M4 | INVESTIGATE |

### M4 — Organizer Workspace (the module being specified now — most affected)
| Idea | Source | Owner | Verdict |
|---|---|---|---|
| Append-only attributed interaction timeline (C4) | P4, P2 | M4 | ADOPT |
| **ADR-shaped decision records** (immutable, superseding, with rationale) | P7, P4 | M4 | ADOPT |
| Overlay-by-reference: typed one-directional annotation links from notes/knowledge → work packages (append-only; never mutate the plan) | P7 | M4 | ADOPT |
| Status-as-typed-data rendered as a Kanban lens; budget grid lens with deterministic rollups | P2 | M4 lenses | ADOPT |
| Guarded lifecycle transitions / readiness-gated validators (C3) | P2, P6 | M4 | ADOPT |
| Explicit human **go/no-go** artifact at Ready | P10 | M4 | ADOPT |
| Ownership transfers logged as timeline events; @mention = scoped logical notification | P4 | M4 | ADOPT |
| Approval **primitive** (gate + immutable decision record + small ordered chain); formalize the existing experienced-organizer review queue | P4, P5 | M4 | ADOPT |
| Scoped RBAC = per-project membership + thin platform roles | P4 | M4 + platform auth | ADOPT |
| Field-history **principle** for M4's mutable state only (upstream solved better) | P4 | M4 | ADOPT (narrow) |
| Event-sourced M4 lifecycle + replay-for-state-recovery | P8 | M4 | ADOPT (state) / INVESTIGATE (mechanics) |
| Deterministic, tiny external "when X→Y" automation/reminder layer (never a rules engine in the spine) | P2, P8 | M4 | INVESTIGATE |
| Real-time collaborative editing (CRDT/OT) for shared notes/checklists | P2 | M4 | INVESTIGATE |
| Automatic check-ins + honest-progress ("Hill chart") | P2 | M4 | INVESTIGATE |
| Spend-authorization gate on `accept_marketplace_result` | P5 | M4 gate · M5 commit | ADOPT |

### M5 — Resource Marketplace
| Idea | Source | Owner | Verdict |
|---|---|---|---|
| **Bid leveling** — normalize quotes to the M2 need's *basis* (clearest M5 gap) | P5 | M5 | ADOPT |
| RFI/RFQ/RFP as three epistemic states keyed to spec determinacy | P5 | M5 | ADOPT |
| Continuous re-qualification (verification/insurance expiry) + COI compliance gating | P5, P3 | M5 | ADOPT |
| Unit-appropriate acceptance (timesheet vs deliverable sign-off) | P5 | M5 → M6 | ADOPT |
| Advisory ML/AI ranking of candidates, **human selects, never auto-contract** | P9, P5 | M5 | ADOPT |
| Catalog short-circuit for pre-priced private vendors | P5 | M5 | INVESTIGATE |
| Backup/alternate sourcing for named Plan-B (C5) | P10, P5 | M5 | ADOPT |

### M6 — Event Execution
| Idea | Source | Owner | Verdict |
|---|---|---|---|
| **Run-of-show / cue-sheet** model (time-coded, owner-tagged, versioned; internal cues + contingencies distinct from public agenda; materialized from M2 relative timeline + real M5 dates) | P3 (top-ranked), P10 | M6 | ADOPT |
| Three-way match (award ↔ receipt ↔ invoice) | P5 | M6 reconciles · M5 award input | ADOPT |
| Flow metrics (cycle time / throughput / WIP) over conformance metrics (EVM/velocity) | P1 | M6 telemetry | ADOPT |
| Leading-indicator monitoring → re-plan/re-estimate signal | P10, P1 | M6 / Monitoring | INVESTIGATE |
| Graceful-degradation ladder (full → reduced → minimum-viable) | P10 | M4 stage · M6 use | INVESTIGATE |
| BEO-style execution contract at the M5→M6 seam | P3 | M5→M6 seam | INVESTIGATE |
| Real-date binding: `absolute_schedule = relative_timeline ⊕ anchor ⊕ real_availability`, computed late, never folded upstream | P1, P3 | M6 (+ M5 availability) | ADOPT-principle |

### M7 / M8 — Completion Evidence & Closure
| Idea | Source | Owner | Verdict |
|---|---|---|---|
| Variance-with-reason capture (feeds learning) | P3, P6 | M8 (from M6 actuals) | ADOPT |
| Evidence-before-closure gate | P6, C3 | M7 → M8 | ADOPT |
| Learning loop / template-memory (X2) | P7 | M8 → M1/M2 | INVESTIGATE |
| AI summarizes evidence/learnings (advisory, human-confirmed) | P9 | M7/M8 | ADOPT |

---

## 3. PROTECT — ALH is already stronger (do not regress)

| ALH strength | Beats | Source |
|---|---|---|
| Un-conflation of decompose/order/time/control via **pure transforms (M2/M3) + immutability + first-stateful-at-M4** | CPM/PMBOK/PRINCE2/CCPM single mutable plan | P1 |
| **Relative timeline** (structure invariant; absolute dates bound late at M5/M6) | CPM binding calendar dates inside the model | P1, P3 |
| **Immutable plan vs mutable overlay** ("single strongest validated advantage") | every task system bolting execution state onto the authored object | P2 |
| **Derived-not-authored** structure (FED→IR→Project) | Notion/Monday blank-page paralysis; user-authored boards | P2 |
| **Meaning-first (FED)** — no surveyed platform models meaning or an abstract plan before real vendors/dates | Cvent/Eventbrite/etc. conflated mutable event record | P3 |
| **Provenance/traceability** as a knowledge-in-context engine (typed, directional, immutable, explanatory) | wiki backlinks | P7 |
| **Pure deterministic transforms** = Temporal's Workflow/Activity split already solved; non-determinism isolated in M5/M6 | no-code automation graphs; bolt-on durability | P8 |
| **AI behind a verified deterministic contract + human approval of intent + deterministic core + fail-safe degraded mode** | "AI copilot bolted onto mutable state" | P9 |
| **Demand-driven vendor acquisition**, **absolute qualification safety gate**, **worker(pay-band)/vendor(quote) split** | directory model; price-softened scoring; staff-aug-vs-SOW confusion | P5 |
| **One-responsibility-per-module** immune to the maximalism tax | ClickUp 3.0 reliability rewrite | P2, P6 |
| **Single source of truth + audit by construction** (immutable upstream + logical events) | CRM/ERP field-history bolted onto mutable records | P4, P6 |
| **Safety tighten-only + route hard cases to certified humans** | fully-automated risk handling | P10, P9 |

---

## 4. REJECT — deliberately out of scope (with reason)

| Idea | Why reject | Source |
|---|---|---|
| Sales-CRM superstructure (pipelines, quotas, forecasting, lead scoring) | Not universal; bloat; wrong domain | P4 |
| User-defined custom fields, multi-homing, user-authored templates, one-app maximalism | Configurability is a *liability* for a system that must produce trustworthy deterministic plans | P2 |
| Full critical-path *scheduler engine* (MS-Project-style) | Over-engineered for event scale; adopt typed edges + a float *readout*, not the engine | P2, P1 |
| Reverse auctions | Wrong domain; corrosive to ALH's relationship-ownership ethos | P5 |
| Posting the plan to a GL; IMG-scale configurability; automatic resource leveling; full EVM; configurable status networks | Enterprise bloat built to satisfy ledgers/auditors/per-customer config — none of which ALH needs | P6 |
| Universal-block model, plan backlinks, mutable transclusion, plan-level verification/versioning | ALH's meaning/structure/work separation + provenance is stronger; would re-mutabilize the plan | P7 |
| AI auto-deciding money / contracts / marketplace results / closure | Binding, irreversible, must be reproducible — permanent prohibition | P9 |
| Auto-advancing lifecycle, auto-accepting results, auto-editing FED/IR/Project, auto-send/charge/book unattended | Consequential/irreversible/outward — must require human confirmation | P8 |
| Conformance metrics (EVM, velocity) as primary signals | Gameable; measure conformance to an early guess, not the system | P1 |
| PERT beta-distribution math; resource leveling on planning-time fictional data (RCPSP) | False precision on invented data; defer contention to M5/M6 (already correct) | P1, P6 |

---

## 5. Open questions & architectural risks (resolve before building Modules 4–8)

- **O1 — Graph thinness.** With M3 v1's *one-work-package-per-requirement* rule, the dependency
  graph may be too thin for critical-path/float (C1) to carry signal. Confirm graph richness before
  committing the criticality annotation (P1).
- **R1 — Re-plan lineage (C2).** Immutability gives a perfect *baseline* but the *change* path is
  undefined (M3 §6 deferred it to M4; M2's `validateCurrentInvariant` is unused). Retrofitting
  versioned baselines after M4–M8 exist is expensive (P6).
- **R2 — Cross-project identity (X1).** If the pipeline assumes per-event forever, adding a
  cross-cutting identity/relationship layer later touches every module's references (P4, P3).
- **R3 — Seam idempotency (C11).** If M4→M5/M6 seams are built without idempotency keys and a
  "replay never re-performs outward effects" rule, later correctness fixes are invasive (P8).
- **R4 — Spend-authorization seam.** Where approval/commit lives (M4 gate vs M5 commit) must be
  fixed before the M4/M5 contracts freeze (P5).
- **R5 — Doc consistency.** Two agents flagged an `M1–M7` vs `M1–M8` numbering drift and a
  lifecycle-"Ready" inconsistency between `OPE_EVENT_LIFECYCLE` and the M4 spec — reconcile now (P10, P7).

---

*Catalog only. Research artifact; changes no code, schema, architecture, or pipeline. See
`FINAL_ENGINEERING_RECOMMENDATIONS.md` for the prioritized recommendations and the answers to the
eight benchmark questions.*

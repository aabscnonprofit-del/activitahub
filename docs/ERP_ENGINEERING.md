# Enterprise Project Systems — Engineering Knowledge Extraction (Part 6)

> **Purpose:** extract the *timeless structural ideas* of enterprise project systems (SAP PS,
> Primavera P6, Oracle Projects, Microsoft Dynamics 365 Project Operations; MS Project as origin
> reference) and judge which SCALE WELL versus which are UNNECESSARILY COMPLEX, then map the
> survivors onto the ActivLife Hub (ALH) 8-module pipeline.
> **Scope:** PROJECT ORGANIZATION ONLY — WBS, networks/scheduling, baselines & change control,
> resource loading/leveling, project/program/portfolio hierarchy, milestones/stage gates, the
> object/document model, plan↔execution↔finance seams, and configurability vs rigidity. Finance/HR/
> manufacturing appear only where they reveal a *project-structuring* principle.
> **Status:** research / knowledge-extraction only. This document is a **historian's map**. It
> does **not** propose code, schema, migrations, redesign of ALH, or renames. It maps external
> ideas onto the *existing* ALH modules (M1–M8) and issues verdicts.

---

## 0. Method & framing

I study **evolution, not products**: for each idea I reconstruct the *problem* that forced its
invention, *why* it took the shape it did, whether it is *universal* or an artifact of the
enterprise context, whether ALH already solves it (and whether ALH solves it *better*), and where
it would live in the ALH pipeline. I credit ALH where its design is superior and challenge enterprise
designs where the complexity is ceremony rather than substance. Where I am reconstructing intent
rather than citing a documented fact, I **FLAG** it.

**ALH pipeline reference (the target we map onto — not redesigned):**

```
Discovery(M1) → FED → OPE(M2) → IR → Project Assembly(M3) → Project
  → Organizer Workspace(M4) → Resource Marketplace(M5) / Event Execution(M6)
  → Completion Evidence(M7) → Project Closure(M8)
```

Load-bearing ALH invariants used as judgment criteria throughout:
- **M2/M3 deterministic & immutable**; abstract-not-real until M5/M6.
- **M4 is the first stateful module** (the first place "actuals" can exist).
- **One responsibility per module**; **verify-don't-trust at seams**; **engine replaceability behind
  typed contracts**; **logical events** (not vendor-specific record types).

---

## 1. The lineage in one breath (origin reconstruction)

The whole enterprise project canon descends from **two roots that were later force-married**:

1. **The scheduling/network root (1950s–60s):** CPM (DuPont/Remington Rand, 1957) and PERT (US Navy
   Polaris, 1958) invented the **activity-on-arrow / activity-on-node network** and the **critical
   path** — the idea that a project is a *directed graph of activities with durations and
   dependencies*, and that the longest path determines the finish date. **MS Project (1984)** and
   **Primavera P3/P6 (1983→)** are the direct descendants: they are, at heart, *graph schedulers*.

2. **The work-decomposition/cost root (1960s, US DoD/NASA):** the **Work Breakdown Structure (WBS)**
   formalized in MIL-STD-881 — decompose deliverables into a *hierarchy* so cost and responsibility
   can be assigned to every node, and roll up. This is a **tree for accountability and rollup**, a
   distinct idea from the network's graph-for-timing.

**SAP PS (Project System, 1990s)** is where the two roots were welded onto an accounting ledger:
the **WBS element became a cost-collecting account object** and the **network/activity became the
scheduling+confirmation object**, both posting to the general ledger. SAP's central, and most
imitated, move was to make the *project structure itself an accounting and integration object* —
not a planning artifact that later feeds finance, but a structure finance *is* posted against.
**Oracle Projects** made the same move from the costing side; **Primavera P6** stayed closer to the
pure scheduling root (it is a planning/controls tool, weakly coupled to ledgers). **Dynamics 365
Project Operations (2020)** is the modern re-assembly: WBS + scheduling (inherited from MS Project
engine) + resourcing + a contract/billing spine on Dataverse.

The single most important historical observation for ALH:

> The enterprise stack fused **plan structure**, **schedule**, and **financial posting** into the
> *same objects*. That fusion is the source of both its power (one structure, total traceability)
> and its bloat (you cannot touch the plan without touching finance, security, and config). ALH's
> pipeline has *already un-fused them by construction* — plan (M2/M3) is abstract and immutable;
> actuals begin only at M4; real-world fulfilment and money live in M5/M6. Much of what follows is
> the discovery that **ALH's seam discipline pre-solves the problems enterprise systems bolt on later.**

---

## 2. Scales well vs unnecessarily complex (the judgment, up front)

| ✅ Scales well — genuinely universal | ❌ Unnecessarily complex — context artifact / ceremony |
|---|---|
| **WBS as a decomposition hierarchy** (deliverables → work packages) | **Dual WBS-element + network coexistence** (SAP's two parallel structures for the same project) |
| **Network / dependency graph** between work packages (finish-to-start etc.) | **Activity-on-arrow modeling & 4 relationship types + lag/lead matrices** as a default (premature for most work) |
| **Baseline = frozen snapshot of the plan** | **Multiple named baselines + baseline-of-baselines** governance for ordinary projects |
| **Change control = explicit, logged, approved deltas to a frozen plan** | **Formal CCB / change-request workflow objects with status networks** for low-stakes change |
| **Plan vs actuals separation** (planned/baseline vs recorded reality) | **Posting the plan to the GL** (project structure *is* the accounting object) |
| **Stage gates / milestones as go/no-go control points** | **Status networks + user-status profiles** as configurable per-object state machines |
| **Program/portfolio = aggregation of independent projects** | **Portfolio as a heavyweight separate product** (PPM) with its own object model |
| **Resource demand vs capacity (loading)** as a concept | **Automatic resource leveling engines** that silently reschedule the plan |
| **Milestone-based progress / earned-value as a measure** | **Full EVM (PV/EV/AC, CPI/SPI) machinery** for small, non-contractual work |
| **A typed object/document model with stable IDs** | **The "everything is a configurable master-data object" model** + IMG configuration universe |
| **Plan↔execution↔finance seams as explicit, controlled interfaces** | **Premature, eager integration** (every object wired to every other on creation) |

The pattern is consistent: **the structural idea is universal; the enterprise *implementation* of it
is heavy because it was built to post to a ledger, satisfy auditors/regulators, and be reconfigured
per customer without code.** ALH inherits the ideas, not the machinery.

---

## 3. Idea-by-idea extraction

For each: (1) problem; (2) why invented; (3) universal?; (4) does ALH solve it?; (5) does ALH solve
it *better*?; (6) conceptual solution; (7) owning module; (8) verdict + trade-offs.

### 3.1 Work Breakdown Structure (WBS) & its hierarchy

1. **Problem.** A large undertaking is too big to estimate, assign, or track as one lump. Cost and
   responsibility have nowhere to attach.
2. **Why invented.** MIL-STD-881 decomposition: break the *deliverable* into a tree of progressively
   smaller pieces until each leaf ("work package") is estimable, assignable, and trackable; parents
   roll up children. SAP made each WBS element a cost-collecting, scheduling, and authorization node.
3. **Universal?** **Yes — the most universal idea in the canon.** Decomposition-and-rollup is how
   humans make any large effort tractable. The *tree* shape is universal.
4. **ALH solves it?** **Yes, structurally.** OPE/Project Assembly produce **work packages** — the
   decomposition of an abstract event into the units of work required to realize it. ALH's work
   packages *are* a WBS leaf set.
5. **ALH better?** **Yes, on one axis, weaker on another.** Better: ALH's work packages are
   **deterministic and immutable** (M2/M3), so the decomposition is reproducible and tamper-evident —
   SAP's WBS is hand-built, mutable master data. Weaker/open: ALH should confirm it has an explicit
   notion of *hierarchy depth* (work package → sub-items) vs a flat package list. SAP's strength is
   arbitrary-depth rollup; ALH likely needs only 1–2 levels (event → packages → tasks). **FLAG:**
   whether ALH's package model is flat or nested is an internal detail I'm not asserting.
6. **Conceptual solution.** A node tree where leaves are estimable/assignable units and parents are
   pure aggregates (no work of their own). Rollup is a fold over the tree.
7. **Owning module.** **M2 (OPE) / M3 (Project Assembly)** — decomposition is plan-shaped and belongs
   in the deterministic, immutable plan.
8. **Verdict: ALREADY SOLVED (well) — keep lightweight.** Adopt the *discipline* (parents are pure
   aggregates; leaves are the unit of estimation/assignment) but **REJECT** SAP's WBS-element-as-
   accounting-object. Trade-off: deep arbitrary hierarchies invite over-decomposition ceremony;
   cap depth.

### 3.2 Networks, activities & the scheduling engine

1. **Problem.** Work packages aren't independent; some must precede others; the finish date and the
   "what's critical" question fall out of the dependency structure, not the list.
2. **Why invented.** CPM/PERT: model activities as a graph with durations + dependencies; compute the
   **critical path** (zero-float longest path) to know the earliest finish and which slips matter.
   P6/MS Project are industrial-grade implementations (calendars, 4 relationship types FS/SS/FF/SF,
   lag/lead, constraints, resource calendars).
3. **Universal?** **The dependency graph is universal. The full scheduling engine is not.** Almost any
   coordinated effort has "X before Y." But continuous-time CPM with calendars and float is overkill
   when work packages are coarse and durations are days, not Gantt-precise hours.
4. **ALH solves it?** **Yes — ALH has a dependency graph between work packages.** That is precisely
   the *network* idea, minus the heavy time engine.
5. **ALH better?** **Yes, by restraint.** ALH models dependencies (the universal half) without
   importing the CPM calendar/float/relationship-type machinery (the context-specific half). For
   event organization — where the "schedule" is a handful of ordered milestones, not a 4,000-line
   Gantt — this is the correct altitude.
6. **Conceptual solution.** A DAG of work packages with simple precedence edges (finish-to-start by
   default). Topological order gives sequence; the longest dependency chain is the "critical path" if
   ever needed.
7. **Owning module.** **M2/M3** for the graph (plan). Any *actual* timing (did it happen on time)
   belongs to **M6 (Event Execution)**.
8. **Verdict: ADOPT the graph (already present) — INVESTIGATE FURTHER a minimal critical-path
   readout.** A read-only "longest dependency chain / which packages block completion" view is cheap
   and high-value. **REJECT** lag/lead, SS/FF/SF relationship types, and resource-aware auto-
   scheduling as default — they are CPM ceremony for ALH's grain size. Trade-off: if events ever grow
   to dozens of time-critical, calendar-bound packages, revisit.

### 3.3 Baselines

1. **Problem.** If the plan can be silently edited, you can never answer "did we deliver what we
   planned?" or "what changed and when?" Reality drifts and the original intent is lost.
2. **Why invented.** A **baseline** is a *frozen, named snapshot* of the plan (dates, scope, cost) at
   approval. Actuals and current plan are then measured *against* the baseline. P6 supports multiple
   baselines; SAP snapshots project versions; D365 baselines the schedule.
3. **Universal?** **Yes.** "Freeze the agreed plan; measure drift against the freeze" is universal to
   any accountable effort.
4. **ALH solves it?** **Yes — and arguably better than anyone.** ALH's **M2/M3 immutability** *is* a
   baseline by construction: the assembled Project is a frozen, deterministic artifact. There is no
   "edit the plan in place"; the plan *is* the baseline.
5. **ALH better?** **Yes — structurally superior.** Enterprise baselines are an *opt-in act of
   discipline* (someone must remember to set the baseline; the live plan remains editable). ALH makes
   the frozen plan the *only* plan — immutability removes the human failure mode entirely.
6. **Conceptual solution.** Approval produces an immutable, content-addressed plan artifact; "current
   reality" lives elsewhere (M4+); comparison is plan-artifact vs actuals.
7. **Owning module.** **M3 (Project)** is the baseline; **M4/M6** hold the actuals measured against it.
8. **Verdict: ALREADY SOLVED BETTER.** The one thing to verify ALH has: when a plan must *change*
   after freeze (see 3.4), it produces a **new versioned baseline with lineage**, not an in-place
   edit. Trade-off: immutability is only a complete baseline story if re-planning is versioned.

### 3.4 Change control (re-plan lineage)

1. **Problem.** Plans must change (scope grows, a vendor falls through). Without control, change is
   either *forbidden* (rigid) or *silent* (untraceable). You need change that is **explicit, logged,
   approved, and lineage-preserving.**
2. **Why invented.** Change Control Boards, change-request objects, and project *versions* — every
   delta to a frozen baseline is a recorded, approved event; the old baseline is retained for variance
   analysis. SAP/Oracle/D365 all carry change-order/versioning machinery (often heavyweight, with
   status networks and approval workflows).
3. **Universal?** **The principle is universal; the CCB ceremony is not.** "Change to a frozen plan
   must be an explicit, auditable, lineage-preserving event" is universal. Multi-step approval
   workflows with configurable status networks are enterprise overhead.
4. **ALH solves it?** **Partially — this is ALH's likely gap.** Immutability gives a clean *baseline*,
   but I cannot assert ALH has an explicit **re-plan lineage** (plan v1 → v2 with a recorded reason
   and a parent link). Immutability without versioned re-planning risks either rigidity or
   "abandon-and-recreate" (which loses lineage). **FLAG: this is the strongest candidate gap in this
   whole analysis.**
5. **ALH better?** **Potentially yes, if done with restraint** — ALH can have lineage without the CCB.
   Because plans are already immutable artifacts, "change" is naturally re-running M2/M3 to produce a
   *successor* artifact; all ALH needs is a typed link `Project.supersedes = priorProjectId` plus a
   reason and the triggering logical event. No status network, no approval workflow object.
6. **Conceptual solution.** Re-plan = produce a new immutable plan artifact carrying a pointer to its
   predecessor + the reason/trigger. Variance = diff(successor, predecessor). The chain *is* the
   change log.
7. **Owning module.** Re-plan generation: **M2/M3** (deterministic, produces the new artifact). The
   *trigger* and the decision to re-plan: **M4 (Organizer Workspace)** — the first stateful module,
   the natural owner of "current state demands a new plan." Lineage record sits with the **Project**
   object (M3 output).
8. **Verdict: ADOPT (INVESTIGATE FURTHER the exact placement).** Add **explicit re-plan lineage** to
   the Project artifact (successor/predecessor + reason + trigger event). **REJECT** change-request
   workflow objects, CCBs, and configurable approval status networks. Trade-off: even lineage has a
   cost (you must define what constitutes a "change" vs a normal M4 actual); keep the bar high — only
   changes to the *frozen plan itself* mint a new baseline.

### 3.5 Resource loading & leveling

1. **Problem.** A plan can demand more of a resource than exists (two packages need the same crew at
   once). **Loading** = sum demand against capacity; **leveling** = resolve over-allocation.
2. **Why invented.** P6/MS Project: assign resources to activities, compute time-phased demand, detect
   over-allocation, and (leveling) automatically delay activities to fit capacity. SAP/Oracle add
   work-center capacity and cost rates.
3. **Universal?** **Loading is universal; automatic leveling is dangerous and largely rejected even in
   enterprise practice.** Knowing "do we have enough" is universal. Letting an algorithm silently
   reschedule the plan to fit capacity is notoriously distrusted — planners turn it off.
4. **ALH solves it?** **Conceptually deferred — correctly.** ALH's plan is **abstract (not-real) until
   M5/M6.** There are no real resources to load until the **Resource Marketplace (M5)** binds real
   supply. So "loading" in ALH is a *Marketplace matching* problem (does real available supply meet the
   abstract demand?), not a plan-time scheduling problem.
5. **ALH better?** **Yes — by deferring resource reality to M5/M6.** Enterprise tools conflate
   *abstract demand* with *named-resource assignment* inside the plan, which is why leveling exists and
   why their plans break the moment a named resource changes. ALH keeps the plan abstract; binding to
   real supply is a separate, later, replaceable step.
6. **Conceptual solution.** Plan expresses **abstract resource demand** (roles/quantities/timing).
   Marketplace (M5) matches demand to **real available supply**, surfacing shortfalls as a coverage
   problem — not by silently rewriting the plan.
7. **Owning module.** Abstract demand: **M2/M3**. Demand-vs-supply matching & shortfall surfacing:
   **M5 (Resource Marketplace)**. Actual consumption: **M6**.
8. **Verdict: ALREADY SOLVED BETTER (abstract demand) + REJECT auto-leveling.** Keep demand abstract
   in the plan; let M5 surface shortfalls as honest coverage gaps (cf. ALH's existing coverage-gate
   philosophy — refuse/handoff over silent wrong output). **REJECT** automatic leveling outright.
   Trade-off: ALH must ensure abstract demand is *expressive enough* (role + quantity + when) for M5 to
   match against; thin demand specs make matching weak.

### 3.6 Project / program / portfolio hierarchy

1. **Problem.** Organizations run *many* projects; they need to aggregate (portfolio reporting) and to
   coordinate interdependent projects toward a shared outcome (program).
2. **Why invented.** **Program** = a set of related projects managed together for a benefit no single
   project delivers. **Portfolio** = the whole collection, selected/prioritized against strategy.
   Vendors built separate PPM products (SAP PPM, Oracle/Primavera portfolio, Project for the web
   roadmaps) with their own object models.
3. **Universal?** **The *relationship* is universal; the separate heavyweight product is not.**
   Aggregation and cross-project coordination are real needs. A distinct portfolio object model with
   its own lifecycle is enterprise scale.
4. **ALH solves it?** **Mostly not needed at ALH's grain — and that's fine.** A single ALH "project" is
   one event's realization. A *program* analog would be a recurring series or a multi-event campaign; a
   *portfolio* analog is an organizer's whole book of work. These are **M4 (Organizer Workspace)**
   concerns — the organizer's view across their projects.
5. **ALH better?** **Yes by scoping it correctly.** ALH should resist building a portfolio *module*.
   The portfolio/program view is an **aggregation over M4**, not a new object in the M1–M8 pipeline.
6. **Conceptual solution.** Program/portfolio = *views and links over independent project artifacts*,
   not a containing super-object that owns them. Coordination is expressed as links between projects,
   computed in the workspace.
7. **Owning module.** **M4 (Organizer Workspace)** — the first stateful module, the natural home for
   "all my projects" and any series/campaign grouping.
8. **Verdict: REJECT the heavyweight PPM object model; ADOPT (lightly) a workspace-level grouping/
   aggregation view if/when needed.** Trade-off: cross-event dependencies (event B depends on event A's
   outcome) are a real future case; model them as *links between project artifacts*, never as a
   portfolio super-object that mutates its children.

### 3.7 Milestones & stage gates

1. **Problem.** Long efforts need **go/no-go control points** so you don't pour resources into work
   that should have been stopped, and so progress is measured at meaningful boundaries — not by
   counting tasks.
2. **Why invented.** **Milestones** = zero-duration markers of significant achievement (often
   payment/billing triggers in SAP/Oracle — "milestone billing"). **Stage gates** (Cooper's Stage-Gate,
   1980s, product development) = phase boundaries with explicit entry/exit criteria and a kill/continue
   decision. Enterprise tools encode these as milestone objects and as **status networks** controlling
   what's allowed in each phase.
3. **Universal?** **Yes — strongly universal, and arguably under-used in lightweight tools.** "Don't
   advance until criteria are met" is a deep, general control idea (it's the same idea as a coverage
   gate or a CI gate).
4. **ALH solves it?** **Partially — and ALH already has the right instinct.** ALH's **coverage gates**
   (refuse/handoff unless the plan is supportable) and the **M4 lifecycle** are stage-gate machinery in
   spirit. The pipeline seams themselves (FED approved before OPE; IR before Assembly) are *gates*.
5. **ALH better?** **Yes in philosophy** — ALH's "verify-don't-trust at seams" and existing coverage
   gate are exactly stage-gate thinking applied at module boundaries, and its gates *refuse* rather
   than warn (stronger than enterprise "advisory" gates planners ignore).
6. **Conceptual solution.** A gate = an entry/exit predicate at a boundary that *blocks* advancement
   until satisfied; a milestone = a named checkpoint that may trigger a logical event (e.g., release
   payment, mark phase complete). Both are predicates/events, not configurable state machines.
7. **Owning module.** Pipeline-seam gates: the seams (FED, IR, coverage). Lifecycle gates within
   execution: **M4 (Organizer Workspace)** lifecycle + **M7 (Completion Evidence)** as the *closure*
   gate (evidence must exist before M8 closure). Milestone billing analog: **M5/M6** events.
8. **Verdict: ADOPT explicitly (mostly ALREADY SOLVED in spirit) — formalize M4 lifecycle gates &
   M7-evidence-before-M8-closure.** Make gates first-class **predicates at seams** with logical events,
   not per-object configurable status profiles. **REJECT** SAP user-status/status-network
   configurability. Trade-off: gates add friction by design — that's the point; keep their criteria
   few and machine-checkable.

### 3.8 The object / document model

1. **Problem.** Everything in a project (the structure, the schedule, the resources, the documents, the
   actuals) needs stable identity, relationships, and traceability.
2. **Why invented.** SAP's model: WBS elements, network headers/activities, milestones, PR/PO links,
   documents, status objects — all master/transactional data with stable IDs, wired together, and
   configured via the IMG. Oracle/D365 (Dataverse) similar. The strength: **total traceability** — any
   number ties back to a structure node. The cost: a vast, configurable object universe.
3. **Universal?** **Stable typed IDs + explicit relationships are universal; the configurable-everything
   universe is not.**
4. **ALH solves it?** **Yes — with a cleaner model.** ALH's **typed contracts between modules** and
   **logical events** are a disciplined object/event model. FED, IR, Project are typed artifacts with
   identity; events are logical, not vendor record types.
5. **ALH better?** **Yes — dramatically.** ALH replaces "configurable master-data universe + IMG" with
   **typed contracts at seams + immutable plan artifacts + logical events.** This is the single biggest
   bloat ALH avoids: there is no parallel configuration language, no per-customer object reconfiguration.
6. **Conceptual solution.** A small set of typed artifacts (FED, IR, Project, work package, actuals,
   evidence) with stable IDs and explicit, typed seam contracts; behavior is in code behind contracts,
   not in configuration tables.
7. **Owning module.** Cross-cutting; each artifact owned by its producing module; contracts owned by
   the seams.
8. **Verdict: ALREADY SOLVED BETTER.** Adopt *traceability* (every actual links to a plan node; cf.
   3.10). **REJECT** the configurable object/IMG universe. Trade-off: typed contracts must be
   *versioned* so engine replaceability doesn't break consumers — ALH's "engine replaceability behind
   typed contracts" already implies this; keep contract versioning honest.

### 3.9 Integration seams: project ↔ execution ↔ finance

1. **Problem.** A plan is worthless if it doesn't connect to real procurement, real execution, and real
   cost. But coupling them too early/tightly makes the plan brittle and the system unchangeable.
2. **Why invented.** SAP wired the WBS/network directly to purchasing (PR/PO), goods/time confirmation,
   and the GL — *eager, deep integration*. Power: one structure, end-to-end actuals. Cost: you cannot
   change the plan without touching procurement, finance, security, and config; "premature integration"
   is baked in.
3. **Universal?** **The *need* for plan→execution→finance flow is universal; eager integration is an
   anti-pattern.**
4. **ALH solves it?** **Yes — this is ALH's structural masterstroke.** The pipeline keeps the plan
   **abstract until M5/M6**; real supply (M5) and real execution (M6) are *downstream, separate,
   replaceable* modules connected by typed seams. Finance/money lives at M5/M6, not in the plan.
5. **ALH better?** **Yes — decisively.** ALH's **late binding to reality** (abstract-not-real until
   M5/M6) and **verify-don't-trust seams** are the precise antidote to SAP's premature, deep coupling.
   The plan can be re-derived without disturbing execution/finance because they meet only at typed
   seams.
6. **Conceptual solution.** Plan (abstract) → typed seam → real fulfilment (M5) → typed seam → execution
   (M6) → evidence (M7). Money enters only where reality enters (M5/M6). Each seam is a verify boundary.
7. **Owning module.** The **seams** (FED, IR, and the M3→M4, M4→M5/M6, M6→M7 boundaries).
8. **Verdict: ALREADY SOLVED BETTER — guard it.** The lesson to *retain* from SAP is **traceability**
   (actuals must reference plan nodes) without **eager coupling**. **REJECT** posting the plan to a
   ledger / wiring procurement into the plan object. Trade-off: late binding means the plan can be
   *infeasible* against real supply; that infeasibility must surface as an honest coverage gap at M5
   (consistent with ALH's refuse-don't-fake stance), not as a silent plan rewrite.

### 3.10 Plan vs actuals (the costing/EVM root)

1. **Problem.** "What we planned" and "what actually happened" must be *separate and comparable*, or you
   can neither learn nor account. Conflating them destroys both the plan and the truth.
2. **Why invented.** Planned vs actual cost/dates/effort; earned value (PV/EV/AC → CPI/SPI) to quantify
   schedule/cost performance. Oracle Projects and SAP PS are built around plan-vs-actual cost
   collection.
3. **Universal?** **Plan-vs-actual separation is universal and essential. Full EVM is not.** Comparing
   intent to reality is universal; the EVM index machinery is contractual-program overhead.
4. **ALH solves it?** **Yes, by architecture.** **M2/M3 = plan (abstract, immutable). M4 = first
   stateful module. M6 = actual execution.** The separation isn't a feature you configure; it's the
   pipeline's spine. Plan lives upstream and frozen; actuals begin at M4 and become real at M6.
5. **ALH better?** **Yes — separation is structural, not optional.** In enterprise tools, "actuals"
   accumulate against a mutable plan, so the comparison is fragile. ALH's frozen plan + downstream
   actuals makes variance a clean diff (plan artifact vs M6 record).
6. **Conceptual solution.** Planned values live in the immutable Project (M3). Actuals (timing,
   resources used, outcomes) accrue M4→M6. Variance/progress = compare actuals to the frozen plan and
   to milestone/gate predicates.
7. **Owning module.** Plan side: **M3**. Actual side: **M4 (stateful) → M6 (real execution)**.
   Evidence of completion: **M7**. Variance/progress *readouts*: **M4** (organizer's view).
8. **Verdict: ADOPT lightweight progress (mostly ALREADY SOLVED) — REJECT full EVM.** A
   **milestone-/gate-based progress measure** (which gates passed, which packages done) is the right
   altitude. **REJECT** PV/EV/AC/CPI/SPI machinery. Trade-off: simple progress can hide cost overrun;
   if ALH ever needs cost-variance, add it at M6 against M3 planned cost — still not full EVM.

### 3.11 Configurability vs rigidity (the meta-lesson)

1. **Problem.** One product must serve aerospace, construction, IT, and events. The vendor's answer was
   **infinite configurability** (SAP IMG, status profiles, custom fields, validation/substitution
   rules) so each customer reshapes the system without code.
2. **Why invented.** A single packaged product sold to wildly different industries needs per-customer
   reshaping. Configuration *is* the business model.
3. **Universal?** **No — this is the central enterprise artifact.** Configurability at this scale exists
   because of the *packaged-product-for-all-industries* economics, not because projects need it. It is
   the dominant source of enterprise bloat, cost, and implementation failure.
4. **ALH solves it?** **Yes — by being domain-specific and code-behind-contracts.** ALH targets one
   domain (life/event organization) and puts behavior in **replaceable engines behind typed contracts**,
   not in a configuration universe.
5. **ALH better?** **Yes — fundamentally.** ALH trades universal configurability for **domain fit +
   engine replaceability**. You change behavior by replacing an engine behind a contract, not by
   reconfiguring master data. This is the right trade for a focused product.
6. **Conceptual solution.** Domain-specific typed contracts + replaceable engines; deterministic
   modules; no per-customer configuration language.
7. **Owning module.** Architecture-wide.
8. **Verdict: REJECT enterprise configurability wholesale; ALH's stance is correct.** Trade-off: ALH
   must absorb genuine domain variety *in engine logic and the plan model* rather than punting it to
   config — i.e., the OPE engines must be expressive, since there's no config escape hatch.

---

## 4. Extraction matrix

| # | Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict |
|---|------|-------------------|--------|-----------|-----------|---------------|---------|
| 1 | **WBS / decomposition hierarchy** | Big effort untrackable as a lump | MIL-STD-881; SAP WBS element | **Yes** | Work packages (decomposition) | M2/M3 | **ALREADY SOLVED** — keep lightweight; cap depth; reject WBS-as-account |
| 2 | **Network / dependency graph** | Sequence & critical path | CPM/PERT 1957–58; P6/MS Project | Graph **yes**; CPM engine no | Dependency graph between packages | M2/M3 (plan); M6 (actual timing) | **ADOPT graph (present)** + **INVESTIGATE** minimal critical-path readout; reject lag/lead & auto-schedule |
| 3 | **Baseline (frozen plan)** | Measure drift vs agreed plan | P6 baselines; SAP versions | **Yes** | M2/M3 immutability = baseline | M3 = baseline; M4/M6 actuals | **ALREADY SOLVED BETTER** |
| 4 | **Change control / re-plan lineage** | Change must be explicit, logged, traceable | CCB; project versions | Principle **yes**; CCB no | Immutable, but lineage **unclear (FLAG)** | M2/M3 generate; M4 triggers; Project holds link | **ADOPT** explicit `supersedes` lineage; **reject** CCB/workflow |
| 5 | **Resource loading** | Demand may exceed capacity | P6/MS Project | **Yes** | Abstract demand; real supply at M5 | M2/M3 demand; M5 match | **ALREADY SOLVED BETTER** (defer to M5) |
| 5b | **Resource leveling (auto)** | Auto-resolve over-allocation | P6/MS Project | **No** (distrusted) | Not done | — | **REJECT** |
| 6 | **Program/portfolio hierarchy** | Aggregate & coordinate many projects | SAP PPM; Oracle/Primavera PPM | Relationship **yes**; product no | Single-event projects | M4 (aggregation view) | **REJECT** PPM object model; **ADOPT light** workspace grouping if needed |
| 7 | **Milestones & stage gates** | Go/no-go control; meaningful progress | Cooper Stage-Gate; SAP milestones | **Yes (strong)** | Coverage gates + seams in spirit | Seams; M4 lifecycle; M7→M8 gate | **ADOPT explicitly** (formalize); reject status-network config |
| 8 | **Object/document model** | Identity, relationships, traceability | SAP master data + IMG; Dataverse | IDs/relations **yes**; config universe no | Typed contracts + logical events | Cross-cutting | **ALREADY SOLVED BETTER**; keep contract versioning |
| 9 | **Plan↔execution↔finance seams** | Connect plan to reality without brittleness | SAP eager GL/PR-PO wiring | Need **yes**; eager integration no | Abstract until M5/M6; typed seams | Seams (FED/IR/M3→M4→M5/M6→M7) | **ALREADY SOLVED BETTER** — retain traceability only |
| 10 | **Plan vs actuals separation** | Compare intent to reality; account/learn | Oracle Projects; SAP PS costing | Separation **yes**; full EVM no | M3 plan vs M4→M6 actuals | M3 plan; M4/M6 actual; M4 readout | **ADOPT** milestone-based progress; **reject** full EVM |
| 11 | **Configurability (IMG/status profiles)** | One product for all industries | SAP IMG; status networks | **No** (context artifact) | Domain-specific; engines behind contracts | Architecture-wide | **REJECT**; ALH stance correct |

---

## 5. Challenges to conventional wisdom

- **"A serious project tool needs a real CPM scheduling engine."** Wrong for most work. CPM solved
  *DuPont plant shutdowns and Polaris* — thousands of calendar-bound, resource-contended activities.
  The *dependency graph* is the universal kernel; the calendar/float/relationship-type engine is a
  context-specific accretion. ALH having a graph **without** the engine is a feature, not a gap.

- **"Baselines are a discipline you apply to a project."** This framing is the bug. Treating the
  baseline as an *optional act* (set it, remember to re-set it) is why baselines rot. ALH's
  **immutability makes the frozen plan the only plan** — the baseline is structural, not behavioral.
  Enterprise systems got this backwards.

- **"Resource leveling automates scheduling."** In practice, planners disable it because a black box
  silently rewriting the plan destroys trust. ALH's instinct — surface a **shortfall as an honest
  coverage gap** rather than auto-rewrite — is more correct than the enterprise default.

- **"Integration is good; integrate the plan with finance and procurement."** SAP's deep, eager
  coupling is precisely what makes it unchangeable. **Late binding to reality (M5/M6) + typed verify
  seams** is the superior pattern. The plan should be *re-derivable* without disturbing execution or
  money. ALH is right; the enterprise canon is the cautionary tale.

- **"Configurability = flexibility."** At enterprise scale, configurability is the *primary* driver of
  cost, failed implementations, and ossification. A **domain-specific product with replaceable engines
  behind typed contracts** is more flexible *where it matters* (you can replace an engine) and rigid
  *where it should be* (the pipeline shape).

- **"Portfolio/program management needs its own system."** No — program/portfolio are **views and links
  over independent project artifacts**, not super-objects that own and mutate children. Building a PPM
  module would import the exact coupling ALH's pipeline avoids.

- **The non-obvious one:** the single richest enterprise idea ALH might *under*-use is the **stage
  gate**. ALH already has coverage gates and seam verification; the conventional wisdom treats gates as
  bureaucratic ceremony, but a *machine-checkable predicate that blocks advancement* is one of the most
  powerful and underrated control structures in all of project engineering — the same family as a CI
  gate or a type check. ALH should lean *into* gates (M4 lifecycle, M7-evidence-before-M8), not away.

---

## 6. Top ideas for ALH (ranked — module + verdict)

1. **Explicit re-plan lineage (versioned baselines).** *(M2/M3 generate; M4 triggers; Project holds
   `supersedes` link.)* **ADOPT.** ALH's immutability already gives a perfect baseline; the missing
   half is a typed predecessor/successor link + reason + trigger event so change is lineage-preserving,
   not abandon-and-recreate. Strongest, highest-leverage gap. **No CCB, no workflow.** *(FLAG: confirm
   whether ALH already has this; if so, downgrade to ALREADY SOLVED.)*

2. **Formalize stage gates as machine-checkable seam predicates.** *(Seams; M4 lifecycle;
   M7-evidence-before-M8-closure.)* **ADOPT.** Make "advancement blocked until predicate satisfied"
   first-class at module boundaries, emitting logical events. Already present in spirit (coverage gate);
   make it explicit and consistent. **No configurable status networks.**

3. **Minimal critical-path / blocking-chain readout over the dependency graph.** *(M2/M3 compute;
   M4 displays.)* **INVESTIGATE FURTHER.** Cheap read-only "longest dependency chain / what blocks
   completion" from the graph ALH already has. **No CPM calendar/float engine.**

4. **Milestone-based progress measure (plan-vs-actual readout).** *(M3 plan vs M4→M6 actual;
   M4 readout.)* **ADOPT (light).** Progress = gates passed + packages done, compared to the frozen
   plan. **Reject full EVM (PV/EV/AC/CPI/SPI).**

5. **Traceability without eager coupling at execution/finance seams.** *(Seams M3→M4→M5/M6→M7.)*
   **ADOPT / GUARD.** Ensure every M6 actual references its M3 plan node — keep the SAP *traceability*
   benefit while keeping ALH's late binding. **Reject** posting plan to a ledger / wiring procurement
   into the plan.

6. **Expressive abstract resource demand for M5 matching.** *(M2/M3 demand; M5 match.)*
   **INVESTIGATE FURTHER.** Ensure abstract demand (role + quantity + when) is rich enough for M5 to
   match real supply and surface shortfalls as coverage gaps. **Reject auto-leveling.**

7. **Workspace-level program/portfolio *view* (only if/when needed).** *(M4 aggregation.)*
   **REJECT-as-module / ADOPT-as-view.** Cross-event coordination = links between project artifacts in
   M4, never a portfolio super-object.

**Net assessment.** ALH's pipeline has *already adopted the enterprise canon's timeless ideas by
construction* — WBS (work packages), network (dependency graph), baseline (immutability), plan-vs-
actual separation (M2/M3 vs M4/M6), and controlled seams — while *structurally rejecting* its bloat
(configurability, eager finance coupling, auto-leveling, PPM super-objects, status networks). The only
genuine forward work is **(1) re-plan lineage** and **(2) explicit stage-gate predicates**; everything
else is "already solved, often better." The enterprise systems' lasting gift to ALH is mostly a
**cautionary tale about premature integration and configurability**, plus two structural ideas worth
making explicit.
```
ENTERPRISE FUSION (SAP/Oracle):  [ plan = schedule = cost account = config ]  ← brittle, heavy
ALH UN-FUSION (by construction): plan(M2/M3, frozen) → actuals(M4) → real(M5/M6) → evidence(M7)
                                  baseline=immutability   gates=predicates   traceability w/o coupling
```
```

---

*End of Part 6 — Enterprise Project Systems. Research/knowledge-extraction only; no code, schema, or
ALH redesign proposed.*

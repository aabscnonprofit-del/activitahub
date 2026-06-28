# Project Management Evolution — ActivLife Hub Global Engineering Benchmark (Part 1)

> **Purpose:** Reconstruct the *evolution* of project-management thinking (PERT, CPM, PMBOK, PRINCE2, Agile/Scrum/Kanban, Lean, Critical Chain/TOC) as an engineering knowledge-extraction exercise, and map the surviving ideas onto ActivLife Hub's (ALH) module pipeline.
> **Scope:** PM scheduling, dependency modeling, estimation/buffering, risk handling, WIP/pull, and the planning-vs-execution split. Focus on ideas relevant to ALH's deterministic acyclic dependency graph + relative timeline (M3), risk (M2/M4), and where *real dates* belong.
> **Status:** RESEARCH ONLY. This document changes **no code and no architecture**. It does not redesign ALH's pipeline; it studies prior art and renders verdicts (ADOPT / REJECT / INVESTIGATE / ALREADY SOLVED BETTER) for cross-document synthesis. Dates/attributions are flagged where uncertain.

---

## 0. Frame: what a "project management system" actually is

Strip the vocabulary away and every PM method is an answer to four engineering questions:

1. **Decomposition** — how do you break a desired outcome into units of work? (WBS, work packages, user stories, tasks)
2. **Ordering** — how do you express that some work must precede other work? (dependency graphs, precedence networks)
3. **Time/resource projection** — how do you turn ordered work into a schedule and a cost, under uncertainty? (CPM float, PERT distributions, CCPM buffers, velocity)
4. **Control** — how do you steer the work as reality diverges from the plan? (earned value, stand-ups, Kanban pull, stage gates)

ALH has deliberately *split* these across modules: M2 (OPE) does decomposition + abstract ordering + uncertainty projection as a **deterministic pure transform**; M3 does graph validation + relative sequencing as a **pure transform**; M4+ does control as the **first stateful** layer. The central thesis of this document: **classical PM conflated all four questions into one mutable plan, and most of the field's history is a slow, painful un-conflation of them.** ALH's module boundaries are, by and large, the modern correct answer — but Critical Chain and Kanban contribute specific ideas ALH has not yet internalized.

---

## 1. Evolution timeline (narrative)

**Pre-1900 — implicit scheduling.** Large works (cathedrals, canals, railways) were scheduled in foremen's heads and ledgers. No reusable model of *dependency*. The engineering gap: ordering knowledge died with the individual.

**1910s — Gantt charts (Henry Gantt, ~1910–1915).** First durable abstraction: work as horizontal bars against a time axis. **Problem solved:** make *planned vs actual* and *concurrency* visible to many people at once. **What it got right (timeless):** a shared visual artifact of work-over-time. **What it got wrong:** bars encode *dates* but not *why* one bar follows another — dependencies are implicit/decorative. A Gantt chart is a *rendering*, not a model. (This distinction — model vs rendering — is exactly ALH's M3-vs-UI split: M3 produces the dependency graph + relative sequence; any Gantt-like view is a downstream *projection*, never the source of truth.)

**1956–1959 — CPM and PERT (the precedence-network revolution).**
- **CPM (Critical Path Method)** — DuPont/Remington-Rand, ~1957, Kelley & Walker. Deterministic durations. Computes the **critical path** (longest dependency chain) and **float/slack** for every other activity. **Problem solved:** *which delays actually matter?* Before CPM you couldn't tell a schedule-killing task from a harmless one.
- **PERT (Program Evaluation and Review Technique)** — US Navy Polaris program, ~1958. Three-point estimates (optimistic/most-likely/pessimistic) → a probability distribution over completion. **Problem solved:** scheduling *under uncertainty* and producing a confidence statement, not a single fragile number.
- These two are the genetic origin of essentially every modern scheduler. **What they got right (timeless):** the **activity-on-node / precedence DAG** and the idea that the schedule is a *derived property of the dependency structure*, not an input. **What they got wrong:** (a) treated estimates as honest and the network as static; (b) CPM's determinism ignores variance; (c) PERT's beta-distribution math was always shakier than its marketing; (d) both schedule to *calendar dates* immediately, baking real time into the model far too early.

**1960s–1970s — resource-constrained scheduling & EVM.** CPM/PERT assume infinite resources. Real projects share scarce people/equipment, so **Resource-Constrained Project Scheduling (RCPSP)** emerged (NP-hard in general). **Earned Value Management (EVM)** (US DoD C/SCSC, ~1967) added a control language: planned value, earned value, cost/schedule variance. **Right:** unified cost+schedule+scope into one progress signal. **Wrong:** EVM rewards *looking* on-plan and is gameable; it measures conformance to a baseline that may itself be wrong.

**1980s — institutionalization: PMBOK and PRINCE2.**
- **PMBOK** (PMI, *A Guide to the Project Management Body of Knowledge*, first formalized ~1987, formal editions from 1996). Not a method — a **taxonomy** of knowledge areas (scope, time, cost, quality, risk, procurement, stakeholder…) and process groups (initiate/plan/execute/monitor/close). **Problem solved:** a shared vocabulary and a checklist against forgetting whole dimensions (e.g., "you never planned procurement"). **Right:** the *risk register* and *stakeholder* concepts; separation of process groups. **Wrong:** descriptive sprawl, heavy documentation, an implicit waterfall bias, and the dangerous illusion that completeness of process equals project success.
- **PRINCE2** (UK, PROMPT → PRINCE 1989 → PRINCE2 1996). **Problem solved:** *governance* — who decides, when to continue/kill, business-case justification at every stage. Its strongest contribution is **stage gates / "continued business justification"**: a project must re-earn the right to proceed. **Right (timeless):** explicit go/no-go boundaries and a defined product-based decomposition. **Wrong:** ceremony-heavy, role-heavy, easy to cargo-cult.

**1980s — Lean (Toyota Production System, codified to the West ~1988–1990).** Origins in manufacturing flow (Ohno, Toyoda), not projects. **Problem solved:** eliminate *waste* (muda), expose problems via flow, reduce batch size, build quality in. **Pull** (produce only on downstream demand) and **just-in-time** are the load-bearing ideas. **Right (timeless):** waste-elimination, small batches, pull over push, defer commitment. Lean's intellectual descendants (Kanban, Lean Software Development) carry the genes.

**1984 — Theory of Constraints / Critical Chain (Goldratt).** *The Goal* (1984) introduced TOC: a system's throughput is governed by its single binding **constraint**; optimize the constraint, subordinate everything else. **Critical Chain Project Management (CCPM)**, *Critical Chain* (1997), applied TOC to scheduling. Two genuinely original contributions:
  1. **The critical chain** = the longest path considering *both* dependencies *and resource contention* (CPM's critical path ignores resource conflicts; CCPM fixes that).
  2. **Aggregated buffers.** Goldratt's insight: per-task padding is wasteful and gets consumed by Parkinson's Law (work expands to fill time) and Student Syndrome (start late). So **strip safety from every task estimate and pool it into a shared project buffer** at the end of the chain (plus *feeding buffers* where side-chains join the critical chain). You then manage the project by watching *buffer burn-down*, not individual task dates. **Right (deeply timeless and under-adopted):** estimates lie, padding is local and wasteful, uncertainty should be *aggregated* and *monitored as a single signal*. **Wrong/limited:** the prescribed "cut estimates by 50%, buffer by 50%" heuristics are folklore-grade; CCPM tooling never matured; it assumes a single dominant constraint.

**1990s–2000s — Agile reaction.** Waterfall + heavy PMBOK/PRINCE2 produced large, late, wrong deliveries. The reaction:
- **Scrum** (Sutherland & Schwaber, ~1993–1995; *The New New Product Development Game*, Takeuchi & Nonaka 1986, is the conceptual seed). **Problem solved:** requirements are unknowable up front; replace one big plan with **short timeboxed iterations** + frequent feedback + an empirical inspect-and-adapt loop. **Right:** empiricism over prediction; a single prioritized backlog; working increments as the truth signal. **Wrong/abused:** velocity-as-target, ceremony theater, "Scrum but" cargo-culting, weak at hard dependency/resource constraints and at fixed-scope/fixed-date contractual work.
- **Kanban (for knowledge work)** (David Anderson, ~2007, from Lean/TPS). **Problem solved:** flow without prescribed iterations; make work visible; **limit WIP** to expose bottlenecks; pull instead of push. **Right (timeless):** **WIP limits**, explicit policies, flow metrics (cycle time, throughput), evolutionary change. Arguably the most durable operational idea of the 2000s.
- **Agile Manifesto (2001)** — values layer over the above. **Right:** working software, responding to change, individuals over process. **Wrong:** became a brand; "agile" now means almost nothing without specifics.

**2010s–2020s — scaling and convergence.** SAFe/LeSS/Scrum-of-Scrums tried to scale Agile (mixed results, much ceremony). The honest convergence point: **flow + WIP limits + small batches + explicit dependencies + continuous delivery** — i.e., Kanban-flavored Lean won the operational argument, while *the network model from CPM* quietly survived underneath every roadmap and dependency view.

---

## 2. Per-method extraction (problem / origin / right / wrong / evolution)

| Method | Core idea | Got RIGHT | Got WRONG | Fate |
|---|---|---|---|---|
| **Gantt** | Work-over-time bars | Shared visual of concurrency & progress | Dependencies implicit; a rendering not a model | **Survived as a *view*, died as a *model*** |
| **CPM** | Deterministic precedence DAG → critical path + float | Schedule is *derived* from dependency structure; float identifies what matters | Determinism ignores variance; schedules to dates too early | **Timeless core (DAG+float); date-binding obsolete-early** |
| **PERT** | 3-point estimates → completion distribution | Uncertainty as first-class; confidence not a point | Beta-math dubious; still date-anchored; estimates assumed honest | **Idea survives (express uncertainty); math obsolete** |
| **EVM** | Cost+schedule+scope variance vs baseline | One progress signal across dimensions | Gameable; assumes baseline correct | **Survives in capital projects; weak for discovery work** |
| **PMBOK** | Knowledge-area taxonomy + process groups | Risk register, stakeholder mgmt, anti-omission checklist | Doc sprawl, waterfall bias, process≠success | **Survives as vocabulary, not as method** |
| **PRINCE2** | Governance + **stage gates** + continued business justification | Explicit go/no-go; re-earn right to proceed | Ceremony/role heavy | **Stage-gate idea timeless; apparatus obsolete** |
| **Lean** | Eliminate waste; **pull**; small batches; defer commitment | Flow, JIT, build-quality-in | Born for manufacturing; literal transfer misleads | **Timeless principles; direct copy rejected** |
| **TOC / CCPM** | Constraint focus; **aggregated buffers**; resource-aware critical chain | Estimates lie → pool & monitor uncertainty; resource contention in the path | "50% cut" folklore; weak tooling; single-constraint assumption | **Buffer idea deeply timeless & under-adopted** |
| **Scrum** | Timeboxed empirical iteration; one prioritized backlog | Empiricism over prediction; feedback loops | Velocity gaming; weak on hard dependencies/fixed scope | **Empirical loop timeless; ceremony optional** |
| **Kanban** | Visualize flow; **limit WIP**; pull; flow metrics | WIP limits expose bottlenecks; evolutionary change | Weak at long-horizon dependency planning | **Among the most timeless operational ideas** |

---

## 3. The decisive split: planning vs execution (and where ALH lands)

The single most important pattern across 70 years: **the field kept discovering that the plan and the execution must be different artifacts with different mutability and different truth sources.**

- CPM/PERT created a plan but let *execution actuals* mutate the same network → schedule churn, lost baselines.
- EVM tried to bolt a frozen baseline onto a mutable plan → gaming.
- Agile's real contribution was admitting the up-front plan is *low-confidence* and pushing decision-making into execution.
- Lean/Kanban went further: **stop planning the middle in detail; control flow at execution time via pull and WIP limits.**

**ALH already encodes the mature answer structurally**, and more cleanly than any classical method:

- **M2 (OPE)** and **M3 (Assembly)** are **deterministic pure transforms** producing **immutable** artifacts (IR, Project). This is the *plan* — and crucially it is **engine-agnostic, abstract (no real vendors/dates/payments), and re-derivable**. Classical PM never achieved immutability of the plan; it let actuals corrupt it.
- **M4 (Organizer Workspace)** is the **first stateful module** — the *execution/control* layer — and it explicitly **does not modify the Project**. This is the planning/execution split done *architecturally* rather than by discipline. It is structurally stronger than PMBOK's "baseline" (a convention people violate) because immutability is enforced by the transform boundary, not by governance.
- **M5/M6** is where **real vendors, real prices, real dates, real payments** finally enter. This is the correct home for calendar time — see §5.

**Verdict on the split:** ALH's planning/execution separation is **ALREADY SOLVED BETTER** than CPM/PMBOK/PRINCE2, because it is enforced by pure-transform + immutability rather than by process discipline.

---

## 4. ALH's deterministic acyclic graph + relative timeline vs CPM / Critical Chain

This is the crux the benchmark asks for. Compare three scheduling philosophies on the same axes.

| Property | CPM / PERT | Critical Chain (CCPM) | **ALH M3** |
|---|---|---|---|
| Work model | Activity-on-node DAG | DAG + resource contention | **Deterministic acyclic dependency graph (work packages)** |
| Time model | Absolute calendar dates, early | Absolute, with buffers | **RELATIVE timeline (offsets/ordering), no real dates** |
| Resource model | Infinite (CPM) / added later | Resource-aware (the key advance) | **Abstract resource & role *needs* carried at root (M2), not bound** |
| Uncertainty | PERT distribution per task | Aggregated project + feeding buffers | **Cost *estimate* + risks carried at root; no buffer concept yet** |
| Mutability | Mutable plan corrupted by actuals | Mutable, buffer-managed | **Immutable; re-derive, don't mutate** |
| Determinism | Deterministic given inputs | Heuristic | **Pure deterministic transform (auditable, reproducible)** |

**Where ALH is clearly stronger:**
1. **Relative timeline over early date-binding.** CPM's original sin is committing to calendar dates inside the model. The moment real dates enter, the model becomes brittle (every slip ripples; weekends/holidays/vendor availability pollute the structure). ALH keeps M2/M3 in **relative time** (orderings and offsets), deferring real dates to M5/M6 where vendor/venue availability actually lives. **This is the correct generalization of CPM:** the *dependency structure and relative sequence* is the timeless invariant; absolute dates are a late binding against real-world supply. ALH made the un-conflation that CPM never did.
2. **Immutability + pure determinism.** A re-derivable, auditable plan is strictly superior to a mutable network for reproducibility, testing, and "verify-don't-trust." CPM/CCPM tooling cannot reproduce *why* a schedule looks the way it does; ALH's transform can.
3. **Abstract resources upstream.** By keeping resource needs *abstract* until M5, ALH avoids RCPSP's NP-hard contention problem *at planning time* and pushes it to where real availability/price exist. This is a legitimate dodge of a genuinely hard problem — correct for a marketplace-backed system.

**Where ALH is currently weaker / where the classics still have something:**
1. **No notion of "the path that matters."** CPM's enduring gift is **float / critical path**: among many ordered tasks, *which chain governs the outcome* and which have slack. ALH's M3 produces a validated acyclic ordered graph and a relative timeline — but (per the v1 spec: one work package per requirement, dependencies validated acyclic) it does **not appear to surface a critical-path / float annotation**. Knowing the governing chain is valuable downstream (M4 prioritization, M6 day-of focus). This is a **derivable property of the existing graph** — purely a computed annotation over the relative timeline, requiring no new mutable state. See §6, INVESTIGATE.
2. **No buffering / aggregated-uncertainty concept.** ALH carries a **cost estimate and risks at root**, but has no analogue to CCPM's **project buffer** — i.e., uncertainty pooled at the *outcome* level rather than smeared into each work package. Right now uncertainty lives as per-requirement risk + a single cost estimate. CCPM's insight (don't pad every task; pool the safety; monitor *one* burn-down) is exactly the kind of abstract, deterministic property that could live in M2's output without introducing real dates. See §6, INVESTIGATE/ADOPT.
3. **Resource contention is deferred, not modeled.** Correct for now (abstract upstream), but note the *consequence*: the first time two work packages need the same real resource is in M5/M6, and *that* is where a CCPM-style resource-aware re-sequencing would matter. ALH should be aware that resource contention is a *real-dates-era* problem owned by M5/M6, not a planning defect.

**Net verdict:** ALH's deterministic-acyclic-graph + relative-timeline + immutability approach is **stronger than CPM and CCPM scheduling as a *planning model***, primarily because it solves the date-binding and mutability mistakes those methods made. It is **weaker only in two derivable, non-architectural respects**: it does not yet expose the *critical/governing chain* (CPM's float) or an *aggregated-uncertainty buffer* (CCPM's project buffer). Both can be added as **computed annotations over existing immutable artifacts** without violating any cross-cutting principle.

---

## 5. Where real dates belong (direct answer)

Calendar dates are a **binding against real-world supply** (vendor availability, venue calendars, staff schedules, payment deadlines). Therefore:

- **M1 (Discovery):** desired *result*, possibly an aspirational target ("a summer party"), but as **meaning**, not a schedule. No real dates as constraints.
- **M2 (OPE):** **relative** timeline only — orderings, offsets, "T-14 days," durations. Real dates would violate "abstract-not-real upstream" and make the engine non-deterministic against a moving calendar. Correct as-is.
- **M3 (Assembly):** **relative sequenced** timeline; immutable. Correct as-is.
- **M4 (Workspace):** the first place a *candidate* real anchor date can appear as **working state** (the organizer says "let's aim for Aug 15"), but M4 must **not** write it back into the Project. It is workspace state layered *over* the immutable relative timeline. This is the correct seam: relative timeline + a chosen anchor = a concrete schedule, computed, not baked in.
- **M5/M6:** **authoritative** real dates — because only here do real vendor/venue availability and payments exist. Contention and re-sequencing under real availability is an M5/M6 concern (this is the CCPM "resource-aware path" moment).

**Engineering principle extracted:** *the relative timeline is the invariant; an absolute schedule is `relative_timeline ⊕ anchor_date ⊕ real_availability`, computed late and never folded back upstream.* This is the disciplined version of what CPM should have been and never was.

---

## 6. Extraction matrix (idea | problem | origin | universal? | ALH today | owning module | verdict)

| Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict |
|---|---|---|---|---|---|---|
| **Precedence DAG / activity-on-node** | Express that work has order; derive schedule from structure | CPM/PERT, ~1957–58 | Yes | M3 builds validated acyclic ordered dependency graph | M3 | **ALREADY SOLVED (BETTER — immutable, deterministic)** |
| **Critical path / float** | Which chain governs the outcome; what has slack | CPM, ~1957 | Yes | Graph + relative timeline present; governing-chain/float **not surfaced** | M3 (compute) → M4 (use) | **INVESTIGATE FURTHER — add as computed annotation** |
| **Uncertainty as a distribution / confidence** | A single date lies; express confidence | PERT, ~1958 | Yes | Cost *estimate* + risks at root; no confidence band | M2 | **INVESTIGATE — express estimate ranges, reject beta-math** |
| **Aggregated buffer (project/feeding)** | Per-task padding wasted by Parkinson/Student syndrome; pool & monitor uncertainty | Goldratt CCPM, 1997 | Yes | No buffer concept; uncertainty smeared per-requirement | M2 (define) → M4 (monitor burn-down) | **ADOPT (conceptually) — aggregate uncertainty at outcome level** |
| **Resource-aware critical chain** | Real schedules collide on shared resources | CCPM, 1997 | Yes (only once real) | Deferred: abstract resources upstream, real in M5 | M5/M6 | **ALREADY SOLVED BETTER (deferral is correct)** |
| **Relative-not-absolute time** | Date-binding makes plans brittle; dates belong to real supply | (ALH advance over CPM) | Yes | Relative timeline in M2/M3 | M2/M3 | **ALREADY SOLVED BETTER** |
| **Planning/execution separation** | Actuals corrupt the plan; baseline gaming | EVM/Agile lineage | Yes | Pure transforms (M2/M3) vs first stateful (M4) | M2/M3 vs M4 | **ALREADY SOLVED BETTER (enforced, not disciplined)** |
| **Stage gates / continued justification** | Re-earn the right to proceed; kill bad projects | PRINCE2, 1989/96 | Yes | M4 lifecycle Planning→Preparation→Ready; M8 closure | M4 (gates), M8 (closure) | **PARTIALLY SOLVED — make gate *criteria* explicit** |
| **Risk register** | Forgetting whole risk dimensions | PMBOK, ~1987 | Yes | Risks carried at root from M2 | M2 (identify) → M4 (track) | **ALREADY SOLVED** |
| **WIP limits / pull** | Too much in-flight work hides bottlenecks; push overloads | Kanban/Lean, ~2007 | Yes (execution) | M4 has statuses/checklists; no explicit WIP limit/pull | M4 | **INVESTIGATE — WIP limits as workspace policy** |
| **Flow metrics (cycle time/throughput)** | Conformance metrics (EVM) are gameable; flow is honest | Kanban, ~2007 | Yes | Not present | M4/M6 (execution telemetry) | **INVESTIGATE** |
| **Empirical iteration / feedback loop** | Up-front plans are low-confidence | Scrum, ~1995 | Partly (discovery work) | M4 collaboration/decisions; not iteration-structured | M4 | **REJECT as ceremony; ADOPT as inspect-adapt principle** |
| **Earned Value** | One number for cost+schedule+scope | DoD, 1967 | Capital-project-specific | Cost estimate at root; actuals in M6 | M6 | **REJECT as primary control (gameable); flow metrics preferred** |
| **WBS / work packages** | Decompose outcome into deliverable units | PMBOK/PERT lineage | Yes | M3: one work package per requirement (v1) | M3 | **ALREADY SOLVED** |
| **Gantt as a *view*** | Shared visual of concurrency | Gantt, ~1910 | Yes | (rendering concern, downstream) | UI over M3/M4 | **ADOPT only as projection, never as model** |
| **Defer commitment (Lean)** | Don't bind decisions before you must | Lean, ~1988 | Yes | Abstract upstream; real binding late (M5/M6) | M2→M5 seam | **ALREADY SOLVED BETTER** |

---

## 7. Challenges to conventional wisdom

1. **"Schedule to dates as early as possible" is wrong.** 70 years of CPM-derived tooling trains people to assign calendar dates in the plan. ALH's relative-timeline stance is the *correct* heresy: dates are a late binding against supply, not a planning primitive. Early date-binding is the field's most expensive habit.

2. **Per-task estimates are a category error.** PERT/CPM ask each task for a duration; CCPM proved the safety in those estimates is wasted and gamed. The honest unit of uncertainty is the **outcome**, not the task. ALH carrying a single root-level cost estimate is *closer to correct* than per-task padding — but it should go the rest of the way and represent uncertainty as an **aggregated band at the outcome**, monitored as one signal (CCPM's real lesson, minus the folklore math).

3. **EVM/velocity are conformance metrics, and conformance is gameable.** Both measure "are we matching the baseline/plan we made when we knew least?" Flow metrics (cycle time, throughput, WIP) measure the *system*, not conformance to a guess. Prefer flow telemetry in execution (M6) over earned-value-style conformance.

4. **Process completeness ≠ success.** PMBOK/PRINCE2/SAFe optimize for *not forgetting steps* and for *audit defensibility*, which correlates weakly with outcomes. ALH's one-responsibility-per-module + verify-don't-trust gets the *anti-omission* benefit (you can't skip a seam) without the ceremony tax. Don't import process for its own sake.

5. **Resource leveling at planning time is a trap.** RCPSP is NP-hard and depends on data that doesn't exist until real vendors do. ALH's deferral of resource contention to M5/M6 is not a gap — it is the correct refusal to solve a problem with imaginary data. Most PM tools that "resource-level" the plan are leveling fiction.

6. **The dependency graph, not the iteration, is the durable artifact.** Agile's brand told a generation that plans are bad. The truth the field re-learned: the *up-front detailed schedule* is bad, but the *dependency structure* is the most reusable, most timeless artifact in all of PM. ALH treating the immutable acyclic graph as the spine — and iteration/feedback as a *workspace behavior* (M4), not the planning model — is the correct synthesis.

7. **"The plan should adapt to reality" is half-right.** Reality should adapt the *workspace state and the chosen anchor* (M4) and the *real schedule* (M5/M6) — but it should **re-derive**, not **mutate**, the upstream Project. Mutating the plan with actuals is precisely the corruption that EVM baselines and CPM networks both suffered. ALH's immutability is the fix.

---

## 8. Top engineering ideas for ALH (ranked, with module + verdict)

Ranked by value-to-ALH given that ALH already solves the structural problems well.

1. **Aggregated outcome-level uncertainty buffer (from CCPM).** *The single highest-value import.* Replace/augment the smeared per-requirement uncertainty with a **pooled uncertainty band carried at the Project root**, defined deterministically in **M2**, *monitored* (burn-down) in **M4**. No real dates required; fully compatible with immutability (it's a property of the immutable artifact, watched by the stateful layer). **Verdict: ADOPT (conceptually).** Trade-off: requires M2 to express ranges, not just point estimates — must stay deterministic and engine-agnostic.

2. **Critical / governing chain annotation (from CPM float).** Compute, over M3's existing immutable acyclic graph + relative timeline, **which chain governs the outcome and which work packages have slack**. Pure derived annotation; **owner: M3 computes, M4 consumes** for prioritization. **Verdict: INVESTIGATE FURTHER → likely ADOPT.** Trade-off: with v1's "one work package per requirement," the graph may be thin enough that float is trivial — confirm value before adding.

3. **WIP limits / pull as workspace policy (from Kanban).** In **M4**, cap concurrent in-flight work packages and pull next work as capacity frees, exposing organizer-level bottlenecks. Lives entirely in the stateful layer; touches nothing upstream. **Verdict: INVESTIGATE FURTHER.** Trade-off: only valuable once M4 supports multi-user concurrent execution at scale; premature for tiny projects.

4. **Explicit stage-gate criteria (from PRINCE2).** M4's Planning→Preparation→Ready lifecycle already *is* a gate structure; make the **transition criteria explicit and checkable** ("Ready requires: all critical-chain work packages resourced in M5"). **Owner: M4** (gates), **M8** (closure justification). **Verdict: ADOPT the *principle*, REJECT the ceremony.** Trade-off: keep criteria minimal or it becomes PRINCE2 bureaucracy.

5. **Flow metrics over earned value (from Kanban vs EVM).** When **M6** execution telemetry is designed, prefer **cycle time / throughput / WIP** over earned-value conformance. **Owner: M6.** **Verdict: INVESTIGATE FURTHER (forward-looking).** Trade-off: needs enough execution volume for metrics to be meaningful.

6. **Uncertainty *expressed as ranges*, beta-math rejected (from PERT).** In **M2**, express the cost/timeline estimate as a band/confidence, not a false-precision point — but **reject** PERT's specific beta-distribution apparatus. **Verdict: INVESTIGATE.** Trade-off: must not leak false precision; ranges only where the engine can justify them.

7. **Gantt strictly as a downstream projection.** Any time-bar visualization must be a **rendering of M3/M4**, never a source of truth or an editable model. **Verdict: ADOPT-with-constraint.** Trade-off: UI temptation to let users drag bars and mutate the plan — must be forbidden by the M3 immutability boundary.

**Already-solved-better (no action — record as ALH strengths):** relative-not-absolute time; planning/execution separation via pure transforms + immutability; abstract-resource deferral of RCPSP; precedence DAG as immutable spine; defer-commitment binding at M5/M6.

**Rejected outright:** EVM as primary control (gameable conformance); heavyweight PMBOK/PRINCE2/SAFe process apparatus (ceremony tax without outcome correlation); planning-time resource leveling (NP-hard on fictional data); literal Scrum ceremony as a planning model.

---

## 9. One-line synthesis for cross-document use

> The 70-year arc of project management is the slow un-conflation of *decomposition, ordering, time-projection, and control* into separate artifacts with separate mutability. ALH has already performed that un-conflation **architecturally** (pure transforms + immutability + late date-binding), making it stronger than CPM/PMBOK/PRINCE2/CCPM as a *planning model*. Its only genuine debts to the classics are two **derivable, non-architectural annotations**: CCPM's **aggregated outcome-level buffer** (top adopt, M2→M4) and CPM's **governing-chain/float** (investigate, M3→M4) — both addable over existing immutable artifacts without binding a single real date before M5/M6.

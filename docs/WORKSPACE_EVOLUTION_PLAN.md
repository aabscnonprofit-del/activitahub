> **STATUS: SUPERSEDED** — the current implementation roadmap is `ROADMAP_V2.md`. Kept for record.

# OPE V2 — Workspace Evolution Plan (Research → Implementation Bridge)

> **Purpose:** convert the Global Engineering Benchmark into an implementation roadmap for Modules
> 4–8. This is the **bridge** between research and implementation: after reading it, an engineer can
> begin Modules 4–8 **without returning to the benchmark documents**. The benchmark becomes
> historical research; this is the working integration plan.
> **Status:** integration plan. **NOT** an architecture redesign, **NOT** a new specification,
> **NOT** implementation. The existing 8-module architecture and the approved module specs remain the
> source of truth (`OPE_V2_MODULE_STATUS.md`, `OPE_V2_MODULE2/3/4_IMPLEMENTATION_SPEC.md`,
> `OPE_MODULAR_PIPELINE_PRINCIPLE.md`). No code, no schema, no architecture change.
> **Source research (now historical):** `ARCHITECTURAL_IDEA_CATALOG.md`,
> `FINAL_ENGINEERING_RECOMMENDATIONS.md`, `COGNITIVE_MODEL_OF_A_WORLD_CLASS_EVENT_ORGANIZER.md`, and
> the ten domain documents.

---

## 0. How to read this document (+ a naming reconciliation)

- §1–§5 cover **each module** (M4–M8) and answer the seven required questions (solved / mandatory /
  optional / rejected / dangerous-to-postpone / human-only / AI-assist).
- §6 is the **New Engineering Concept Registry** — every benchmark concept defined once, with owner,
  lifecycle, dependencies, and priority. Per-module sections reference these by name.
- §7 is **what must NOT be added** (anti-drift guardrails).
- §8 is the **Implementation Readiness Matrix**.
- §9 is the **Implementation Order**.

**Module-naming reconciliation (important).** The canonical map (`OPE_V2_MODULE_STATUS.md`) names
**M7 = Completion Evidence** and **M8 = Project Closure**. This plan uses the requested functional
framings — **M7 = Learning** and **M8 = Intelligence** — as *descriptions of the same two modules*,
not new modules and not a renaming of the architecture:
- **M7 (Completion Evidence → "Learning"):** capture what actually happened + the *learning signal*
  (variance-with-reason, what worked/failed). Evidence is the substrate; the learning signal is the
  output.
- **M8 (Project Closure → "Intelligence"):** close the project and run the *learning loop* — turn
  closed projects into reusable patterns that strengthen future Discovery/OPE (through the expert
  gate). Closure is the act; intelligence is what closure produces.

No architecture changes; these are integration framings. Where this plan says "M7/M8," it means the
canonical Completion-Evidence / Closure modules carrying these responsibilities.

---

## 1. Module 4 — Organizer Workspace

### 1.1 Already fully solved (no modification)
The approved M4 spec already nails the hard parts; protect, don't rebuild:
- Immutable **Project snapshot + mutable overlay** (the field's single strongest validated idea —
  no task system separates authored-plan from execution-state cleanly).
- **Verify-don't-trust at open** (`validateProject`, assembled-only); closed, total operation set;
  rejected ops leave state byte-for-byte unchanged.
- **Lifecycle** Planning → Preparation → Ready (monotonic, freeze at Ready).
- **Marketplace seam (workspace side):** launch requests, receive + route accepted results *by
  reference*; never sources.
- **Collaboration primitives:** members, notes, attachments, decisions; per-work-package state.
- **Logical events / append-only history**; single source of truth + audit **by construction**.

### 1.2 Mandatory benchmark findings (must become part of M4)
| Finding | Why mandatory |
|---|---|
| **Critical Core surfacing** (consume the M3 criticality annotation — §6) | An organizer protects the *few* things that cannot fail; a workspace that shows a flat list of equal items actively fights expert cognition. M4's lenses and attention model are meaningless without it. |
| **Attention Model** (what-matters-now / can-wait / can-fail-safely) | The cognitive core: attention is the scarce resource. Drives lens emphasis and lets closed/delegated items *leave* the live view. |
| **Append-only attributed Interaction Timeline** | One ordered, attributed truth for notes/comms/decisions/ownership-transfers/mentions — ALH's existing event idiom applied to collaboration. Prevents fragmented history. |
| **ADR-shaped Decision Records** | Organizer decisions need *rationale* preserved immutably (supersede, don't overwrite). Without it, the "why" is lost and re-plans repeat mistakes. |
| **Stage-Gate predicates + explicit human Go/No-Go at Ready** | The planning→execution boundary is a real cognitive mode-change and the one decision experts never delegate. Make it a machine-checkable, recorded human gate. |
| **Re-plan Lineage ownership** (M4 owns lineage; §6) | M3 deferred lineage to M4. When intent changes upstream, M4 must decide supersede/migrate-overlay. Undefined = the most expensive future retrofit. |
| **Spend-Authorization Gate on `accept_marketplace_result`** | Accepting a sourced result is a spend commitment; authority is an actor+budget property M4 owns. The gate must exist before money can be committed. |
| **Always-Verify baseline Checklist** (prep), seeded from M2 `never_drop` | Experts re-confirm the same load-bearing facts every time; externalizing them is Gawande's checklist discipline. Bridges to M6 day-of. |
| **Confirmation-Loop tracking** ("booked ≠ confirmed", track/remind side) | Most "logistics" failures are unclosed confirmation loops; M4 must track confirmation state and prompt re-confirmation. |
| **Notification Restraint** (subscribe/follow + mention + batch/digest) | Notification fatigue is the dominant failure mode of collaborative tools; restraint must be designed in, not bolted on. |
| **Lenses as projections** (status/Kanban lens; budget grid lens) over the one derived Project | Different roles need different views without forking the source of truth. Projections, never copies. |

### 1.3 Optional (later)
- Real-time collaborative editing (CRDT/OT) for shared notes/checklists.
- Automatic check-ins + honest-progress ("Hill-chart") readout.
- A *tiny* deterministic "when X→Y" reminder layer (never a rules engine).
- Field-history *principle* for the mutable overlay only (upstream is already immutable).
- Graceful-Degradation ladder *authoring* (M4 stages it; M6 uses it).

### 1.4 Rejected (do not add to M4)
- User-defined **custom fields**, **multi-homing**, user-authored **templates**, **one-app
  maximalism** — configurability is a *liability* for a system whose value is a trustworthy derived
  plan (ClickUp's reliability rewrite is the cautionary tale).
- A **business-rules engine / no-code automation graph** inside the workspace.
- **Chatter-style social-feed** sprawl; a heavyweight **RBAC/sharing-rule** engine (use scoped
  per-project membership + thin platform roles).

### 1.5 Dangerous to postpone (decide before M4 contracts freeze)
- **Re-plan Lineage** contract (supersedes-link + reason + trigger; overlay-migration policy) — R1.
- **Criticality annotation** consumed from M3 — shapes the lens/attention model; deciding it after
  M4's read model exists forces rework.
- **Seam idempotency + replay boundary** for M4→M5/M6 outward actions (R3).
- **Spend-Authorization seam** ownership (M4 gate vs M5 commit) — R4.
- **Identity indirection:** member/owner/client/vendor references via **stable IDs** so a future
  cross-project identity layer can attach without reworking M4 (R2).

### 1.6 Must remain human (event-specific)
- The **Go/No-Go at Ready** (final approval to leave planning).
- **Accepting a marketplace result** (an irreversible spend commitment).
- **Approval of organizer work** / consequential decisions (the decision record is human-authored).
- **Definition of success** (owned at M1, surfaced and defended in M4 — never machine-redefined).
- **Relationship decisions** (who to trust, who to keep, who to escalate to the client).

### 1.7 Where AI assists (assistance only)
- **Monitoring/summarization:** summarize the timeline, status roll-ups, "what changed since you
  looked."
- **Surface criticality + anomalies** (advise where attention is needed) — never auto-act.
- **Recommendation:** propose missing checklist items, likely-needed decisions, next steps.
- **Drafting:** comms/notes drafts — always human-confirmed before they bind.
- **Verification (advisory):** flag incomplete preparation / unconfirmed load-bearing items.
- **Never:** auto-advance the lifecycle, auto-accept results, auto-edit the plan.

---

## 2. Module 5 — Resource Marketplace / Sourcing

### 2.1 Already fully solved
- The **abstract-need → request → sourced-result-by-reference** seam (stronger than monolithic
  procurement suites — it separates *plan the need / source it / receive it*).
- **Demand-driven vendor acquisition** (beats the directory model).
- **Absolute qualification safety gate** (qualification is a hard gate, not a price-softened score).
- **Worker (pay-band) / Vendor (quote) split** (convergent with VMS staff-aug vs SOW).

### 2.2 Mandatory findings
| Finding | Why mandatory |
|---|---|
| **Bid Leveling** (normalize quotes to the M2 need's *basis*) | The clearest M5 gap: "side-by-side display" ≠ comparison. M5 already has the need's basis to normalize against; without leveling, quotes are not actually comparable. |
| **RFQ/RFP/RFI determinacy fork** (keyed to spec completeness signalled by M2) | Different epistemic states (who exists / fixed-spec price / under-determined approach) need different sourcing flows; conflating them is the suites' classic error. |
| **Continuous Re-qualification** (verification/insurance/COI expiry gating) | Qualification decays; a vendor qualified at award may lapse by event day. Safety + compliance require ongoing checks, not one-time. |
| **Confirmation-Loop (re-confirmation lifecycle, M5 confirm side)** | "Accepted" is not "confirmed for the day"; the seam must extend past accept to a confirm/re-confirm state M4 can track. |
| **Plan B / Backup Sourcing** | Expert recovery is fast only because a backup was pre-positioned; M5 must support sourcing an alternate for a critical need (paired with M2's alternate-need + M4's hold/choose). |
| **Unit-appropriate acceptance handoff** (timesheet vs deliverable sign-off) → M6 | Staff hours and deliverables are received differently; the acceptance contract M5 hands to M6 must carry the unit. |
| **Advisory ranking** (AI ranks/matches; **human selects**) | Matching at scale benefits from ranking, but selection/award is a human, irreversible act. |

### 2.3 Optional
- Catalog short-circuit for pre-priced private vendors (skip RFQ when a rate is already agreed).
- BEO-style consolidated execution contract at the M5→M6 seam (could also live as M6 optional).

### 2.4 Rejected
- **Reverse auctions** — wrong domain; corrosive to ALH's relationship-ownership ethos.
- **Enterprise procurement-suite bloat** — IMG-scale config, GL coupling, posting commitments to a
  ledger.
- **Centralized procurement across projects** — that is an **Enterprise-edition** capability
  (organizational complexity), per `ENTERPRISE_POSITIONING_PRINCIPLE.md`; not the One-Event M5.

### 2.5 Dangerous to postpone
- The **`MarketplaceResultRef` contract shape** (what an accepted result carries) — M6 three-way
  match and any future cross-project vendor identity depend on it (R2/R3).
- **Confirmation lifecycle states** (accepted → confirmed → re-confirmed → fulfilled).
- **Spend-Authorization seam** ownership shared with M4 (R4).
- **Vendor identity by stable ID** (so repeat-vendor memory can attach later) (R2).

### 2.6 Must remain human (event-specific)
- **Final vendor selection / award.**
- **Commitment of contracts** (irreversible, outward-facing).
- **Qualification overrides** (safety — tighten-only, human-owned).
- **Vendor relationship decisions** (who to keep, who to drop).

### 2.7 Where AI assists
- **Recommendation:** rank/match candidates against the need (advisory).
- **Summarization/normalization:** assist bid leveling (normalize and explain quotes).
- **Verification/monitoring:** flag qualification/insurance/COI expiry; predict no-show risk.
- **Never:** auto-contract, auto-accept, auto-award.

---

## 3. Module 6 — Event Execution

### 3.1 Already fully solved (by construction; M6 not yet built)
- **Plan-vs-actual separation** is structural (immutable M3 plan vs M6 actuals) — no opt-in baseline
  discipline required.
- The **relative timeline + late real-date binding** principle is already the correct stance.

### 3.2 Mandatory findings
| Finding | Why mandatory |
|---|---|
| **Run of Show / Cue Sheet** (time-coded, owner-tagged, versioned; internal cues + contingencies distinct from any public agenda) | The event industry's hard-won day-of production artifact; spreadsheets beat rigid tools, so build it as a *materialized projection* of M2's relative timeline + M5's real dates, editable/exportable/offline-robust. |
| **Late Date-Binding** (`absolute = relative ⊕ anchor ⊕ availability`, computed late, never folded upstream) | Real dates exist only where real availability/commitments do (M5/M6); binding earlier re-introduces the conflation ALH avoids. |
| **Situation Awareness monitoring** (predictors of cascade / leading indicators, not just status) | Experts live at projection (SA L3); M6 must surface *predictors* (on-time? core secured?), the few signals that forecast cascade. |
| **Three-Way Match** (award ↔ receipt ↔ invoice) reconciliation | The universal procurement control; falls out naturally from the seam (M5 award + M6 receipt + invoice). |
| **Idempotency + Replay Boundary** on outward execution actions | Retries/replay must reconstruct *state* but never **re-perform** outward effects (re-send/re-charge/re-book). Non-negotiable correctness rule. |
| **Graceful-Degradation ladder** (use: full → reduced → minimum-viable) | Pre-declared sacrifice order so the can-fail-safely items are known in advance under pressure. |
| **Success-Recognition signal** ("it's safe now" / risks cleared) → emits toward M7 | The cognitive "all-clear" that releases attention; a real execution state, not just "ended." |

### 3.3 Optional
- BEO-style execution contract at the M5→M6 seam.
- AI leading-indicator auto-monitoring (advisory).
- Explicit **offline robustness** requirement for day-of (event venues fail networks).

### 3.4 Rejected
- **Auto-execution** of irreversible/outward actions.
- **Conformance metrics (EVM/velocity)** as primary signals — prefer **flow metrics** (cycle time /
  throughput / WIP).
- A **full durable-execution platform** (Temporal/Step Functions) as the spine — adopt the
  *discipline* (idempotency, replay-for-state), not the platform.

### 3.5 Dangerous to postpone
- The **idempotency + "replay never re-performs outward effects"** boundary (R3).
- The **actual ↔ plan reference** (every M6 actual references its M3 plan node) — needed for
  plan-vs-actual, three-way match, *and* the learning loop.
- The **M4→M6 Ready hand-off contract** (what crosses the planning→execution seam).

### 3.6 Must remain human (event-specific)
- The **go-live decision** and **in-the-moment recovery / improvisation**.
- **Safety calls** during the run.
- **Final acceptance / sign-off** of deliverables.
- The **"show must go on"** judgment (which degradation step, when).

### 3.7 Where AI assists
- **Monitoring:** watch the many sampled items; surface anomalies/predictors to preserve the
  organizer's attention for the critical core.
- **Prediction:** forecast cascade from a slip; recommend a degradation step (advisory).
- **Summarization/verification:** status summaries; verify receipts against awards.
- **Never:** auto-execute, auto-charge, auto-commit.

---

## 4. Module 7 — Completion Evidence ("Learning")

### 4.1 Already fully solved
- Evidence **references plan nodes** (traceability by construction).
- Immutable artifacts **can't rot** — no freshness/verification machinery needed for the plan itself.

### 4.2 Mandatory findings
| Finding | Why mandatory |
|---|---|
| **Variance-with-reason capture** (estimated vs actual + *why*) | Overwriting estimates destroys the learning signal; the variance + reason is the raw material the learning loop consumes. |
| **Evidence-before-Closure gate** | Closure (M8) must not proceed without the evidence it depends on — a stage-gate predicate. |
| **Completion evidence referencing the plan** | Every actual/evidence item points back to its M3 plan node; enables plan-vs-actual and feeds intelligence. |
| **Learning-signal extraction** (what worked / failed / surprised) | The structured output M7 hands to M8 — the bridge from one event's facts to organizational memory. |

### 4.3 Optional
- AI summarization of evidence into a draft retrospective.
- Lightweight staleness signal on any *harvested templates* (not on the plan).

### 4.4 Rejected
- A heavyweight **BI/analytics suite** inside the pipeline.
- **Cross-project reporting** — an **Enterprise-edition** capability (organizational complexity).

### 4.5 Dangerous to postpone
- The **evidence ↔ plan reference** contract.
- The **learning-signal schema** (what M7 emits) — if undesigned, the learning loop cannot be added
  cheaply later.

### 4.6 Must remain human
- The judgment of **whether the event succeeded** (the human success definition).
- **Sign-off on evidence** and what counts as a genuine "learning."

### 4.7 Where AI assists
- **Summarization:** draft the retrospective from evidence.
- **Recommendation:** propose candidate learnings (advisory, expert-gated).
- **Verification:** detect variance patterns / missing evidence.

---

## 5. Module 8 — Project Closure ("Intelligence")

### 5.1 Already fully solved
- Closure as a **terminal stage**; the provenance chain stays intact for retrospection.

### 5.2 Mandatory findings
| Finding | Why mandatory |
|---|---|
| **Learning Loop / Template-Memory** (closed project → proposed pattern → **expert gate** → strengthens M1/M2) | The mechanism that makes the platform get smarter per event; without it every event starts cold. Must pass the existing expert gate (never auto-promote). |
| **Closure gate** (evidence complete, obligations settled) | A machine-checkable predicate that prevents premature closure. |
| **After-action / retrospective capture** | The disciplined "what we learned" record (US-Army AAR lineage) that feeds the loop. |

### 5.3 Optional
- AI cross-project pattern mining (advisory; expert-gated).
- A **recognition-support library** for novices (surface "events like this usually need X / fail at
  Y") — derived from accumulated closures, advisory only.

### 5.4 Rejected
- **Auto-feedback** without the expert gate; **AI auto-deciding closure**.
- **Portfolio / cross-project reporting / program management** — **Enterprise edition**, per
  `ENTERPRISE_POSITIONING_PRINCIPLE.md`.

### 5.5 Dangerous to postpone
- The **learning-loop edge** (M8 → M1/M2 via expert gate) contract.
- The **Cross-Project Identity / Relationship layer** decision (R2) — repeat clients/vendors/
  organizer reputation. It is a **cross-cutting layer referenced by stable IDs**, owned by no
  pipeline module; if seams don't indirect through stable IDs *now*, adding it later rewrites every
  reference. (This is the single most expensive deferral across the whole pipeline.)

### 5.6 Must remain human
- What becomes **organizational doctrine** (the expert gate).
- **Reputation / relationship** judgments.
- **Final closure approval.**

### 5.7 Where AI assists
- **Pattern extraction / clustering** across closures (advisory).
- **Summarization:** draft templates/playbooks from closed projects.
- **Recommendation:** propose what to standardize — **never** auto-promote to doctrine.

---

## 6. New Engineering Concept Registry

Each concept: **definition · owning module · lifecycle · dependencies · priority.** (Priority:
**P1** mandatory-early · **P2** mandatory-later · **Opt** optional · **X-cut** cross-cutting decision.)

| Concept | Definition | Owner | Lifecycle | Dependencies | Priority |
|---|---|---|---|---|---|
| **Critical Core** | The small set (≈3–7) of elements whose failure ends/ruins the event (the moment, access, power, principals, headcount, timing spine, safety). | M3 computes · M4 surfaces | Derived at assembly; surfaced through prep + execution; cleared at success-recognition | Criticality annotation; the "Moment" (M1/M2) | **P1** |
| **Criticality / Critical Chain** | A computed annotation over the dependency graph marking the governing chain + float; ranks work by *consequence*, not just order. | M3 (compute) · M4/M6 (consume) | Computed deterministically per Project; read-only | Rich-enough graph (confirm vs M3 v1 one-WP-per-requirement, **open Q O1**) | **P1** |
| **Aggregated Buffer (Critical Chain)** | Outcome-level uncertainty reserve (not per-task padding), monitored as one burn-down. | M2 defines · M4 monitors | Set at IR; burned down through prep/execution | Estimates-as-ranges | **P2** |
| **Go / No-Go Gates** | Machine-checkable readiness predicates + an explicit, recorded **human** decision to cross a stage boundary (esp. planning→execution at Ready). | M4 (lifecycle); M7→M8 (evidence gate) | Evaluated at each lifecycle transition; human-confirmed; immutable record | Stage-gate predicates; Critical Core; Always-Verify checklist | **P1** |
| **Plan B / Backup** | A first-class *alternate path* for a critical need (not narrative mitigation): an alternate need (M2), a sourced backup (M5), held and chosen in (M4). | M2 + M5 + M4 | Anticipated at IR (pre-mortem); sourced in prep; deployed on failure | Pre-mortem risk gen; Marketplace backup sourcing | **P1** |
| **Re-plan Lineage** | When intent changes upstream, a new IR→Project supersedes a prior one via a `supersedes` link + reason + trigger; M4 decides overlay migration. | M2/M3 generate · **M4 owns lineage** | New version on re-plan; prior marked superseded; ≤1 current per (Project, FED) | M3 §6 deferral; overlay-migration policy | **P1 / X-cut** |
| **Attention Model** | Four-bucket triage — cannot-fail / matters-now / can-wait / can-fail-safely — driving lens emphasis and letting closed/delegated items leave the live view. | M4 | Continuously re-sorted through prep/execution | Critical Core / criticality | **P1** |
| **Situation Awareness** | Perceive→comprehend→**project** monitoring of leading indicators that predict cascade; share one live picture. | M6 (run) · M4 (prep) | Continuous during execution; sampled for stable items | Run of Show; criticality; single source of truth | **P1** |
| **Run of Show / Cue Sheet** | Time-coded, owner-tagged, versioned day-of operational script; internal cues + contingencies distinct from any public agenda; a *materialized projection* (editable, exportable, offline). | M6 | Materialized at planning→execution handoff from relative timeline + real dates; live-edited day-of; archived to M7 | Late date-binding; M5 confirmed resources; relative timeline | **P1** |
| **Graceful Degradation** | A pre-declared sacrifice ladder (full → reduced → minimum-viable) so can-fail-safely items are known in advance. | M4 authors · M6 uses | Declared in prep; invoked under live failure | Attention Model; Critical Core | **P2** |
| **Confirmation Loops** | Explicit "booked ≠ confirmed" state machine with re-confirmation cadence (accepted → confirmed → re-confirmed → fulfilled). | M5 (confirm) · M4 (track/remind) | Opens at accept; cycles through prep; closes at fulfillment | MarketplaceResultRef contract; reminders | **P1** |
| **Bid Leveling** | Normalize competing quotes to the M2 need's *basis* so they are actually comparable. | M5 | At sourcing, before human selection | Need basis (M2); quote intake | **P1** |
| **Three-Way Match** | Reconcile award ↔ receipt ↔ invoice. | M6 reconciles · M5 award input | At/after receipt | Actual↔plan reference; MarketplaceResultRef | **P2** |
| **ADR Decision Records** | Immutable, attributed, superseding records of organizer decisions + rationale. | M4 | Created on decision; superseded never overwritten | Interaction Timeline | **P1** |
| **Interaction Timeline** | One append-only, attributed, ordered stream of notes/comms/decisions/ownership-transfers/mentions. | M4 | Append-only across the project life | Logical events (already exist) | **P1** |
| **Spend-Authorization Gate** | A gate on accepting a sourced result, enforcing actor+budget authority before commitment. | M4 (gate) · M5 (commit) | At `accept_marketplace_result` | Membership/roles; budget; MarketplaceResultRef | **P1 / X-cut** |
| **Always-Verify Checklist** | The guaranteed load-bearing verification set (headcount, timing, access, power, weather, dietary/safety, confirmations), seeded from M2 `never_drop`. | M4 (prep) → M6 (day-of) | Seeded at assembly; completed through prep; re-checked day-of | `never_drop` (M2); checklist model | **P1** |
| **Late Date-Binding** | Absolute schedule = relative timeline ⊕ anchor ⊕ real availability, computed late, never folded upstream. | M6 (+ M5 availability) | Bound at planning→execution; never written to the plan | Relative timeline; M5 availability | **P1** |
| **Idempotency / Replay Boundary** | Outward actions carry idempotency keys; replay reconstructs *state* but never re-performs outward effects. | M4→M5/M6 seams; M6 | Enforced at every outward action | Seam contracts | **P1 / X-cut** |
| **Learning Loop / Template-Memory** | Closed project → proposed reusable pattern → **expert gate** → strengthens future Discovery/OPE. | M8 → M1/M2 | Triggered at closure; gated; feeds future events | Learning-signal schema (M7); expert gate | **P2** |
| **Cross-Project Identity Layer** | A future cross-cutting layer (repeat clients/vendors, organizer reputation, relationships) referenced by **stable IDs**, owned by no pipeline module. | ✦ cross-cutting (vendor facet near M5) | Persists across events; referenced, never embedded | Stable-ID indirection at every seam | **X-cut (decide now, build later)** |

---

## 7. What must NOT be added (anti-drift guardrails)

ActivLife Hub sells **successful delivery of one event**, derived deterministically from approved
meaning. The following would erode that and pull it toward a generic tool:

- **Toward Asana / Monday / ClickUp:** user-authored mutable boards, **user-defined custom fields**,
  **user-authored templates**, **multi-homing**, **one-app maximalism**. *Why it conflicts:* ALH
  **derives** structure from an approved FED and freezes it; user-authoring re-introduces the
  blank-page paralysis and the un-auditable mutable-plan these tools suffer, and configurability is a
  liability for a system that must produce *trustworthy deterministic* plans (ClickUp's reliability
  rewrite is the evidence).
- **Toward Jira:** a configurable **workflow/status-network engine**, a **business-rules engine** in
  the spine, a full **critical-path scheduler**. *Why:* ALH's lifecycle is a small, total,
  machine-checked state machine; an open workflow engine is "untyped, untested, hidden-state code"
  and defeats determinism. Adopt typed dependency edges + a float *readout*, never a scheduler.
- **Toward generic CRM:** **sales pipelines, quotas, forecasting, lead scoring**, **Chatter-style
  social feeds**. *Why:* not universal, wrong domain, and feed-sprawl destroys the single ordered
  truth. (The *useful* CRM substrate — activity timeline, ownership, approvals — is already adopted
  in M4 in ALH's event idiom.)
- **Toward generic ERP:** **posting the plan to a GL**, **IMG-scale configuration**, **automatic
  resource leveling**, **full EVM**, **PPM super-objects**. *Why:* enterprise bloat built for
  ledgers/auditors/per-customer config ALH does not have; ALH's immutability already gives a
  superior baseline and it defers resource contention to M5/M6 correctly.
- **Toward an Enterprise product:** **portfolio/program management, cross-project reporting,
  multi-team org hierarchy, centralized procurement, governance/compliance suites.** *Why:* these are
  **organizational-complexity** capabilities of the future **Enterprise edition**
  (`ENTERPRISE_POSITIONING_PRINCIPLE.md`), not the One-Event pipeline — but seams should reference
  identity by stable ID so they can attach later.
- **Toward AI-as-decider:** AI **auto-deciding** money/contracts/marketplace results/closure, or
  **unattended** advancing of lifecycle / sending / charging / booking. *Why:* binding, irreversible,
  must be reproducible and human-owned — a permanent prohibition.

---

## 8. Implementation Readiness Matrix

Priority: **Required · Optional · Future · Never** · *Solved* (no work). Phase: **P0** cross-cutting
contract decisions · **P1**=M4 · **P2**=M5 · **P3**=M6 · **P4**=M7 · **P5**=M8 · **Deferred**
(Enterprise) · **Reject**. Decision: **Adopt · Investigate · Defer · Reject · Already-Solved**.

| Research finding / concept | Module | Priority | Phase | Decision |
|---|---|---|---|---|
| Immutable Project + mutable overlay | M4 | Solved | — | Already-Solved |
| Verify-don't-trust at seams | M4–M8 | Solved | — | Already-Solved |
| Re-plan Lineage (supersedes + overlay migration) | M4 (+M2/M3) | Required | **P0** | Adopt |
| Criticality / Critical Core annotation | M3→M4 | Required | **P0** | Adopt (Investigate O1) |
| Seam idempotency + replay boundary | M4→M5/M6 | Required | **P0** | Adopt |
| Spend-Authorization seam ownership | M4/M5 | Required | **P0** | Adopt |
| Stable-ID indirection (for future identity layer) | all seams | Required | **P0** | Adopt |
| Actual↔plan reference + learning-signal schema | M6/M7 | Required | **P0** | Adopt |
| Attention Model (4-bucket triage) | M4 | Required | P1 | Adopt |
| Interaction Timeline (append-only, attributed) | M4 | Required | P1 | Adopt |
| ADR Decision Records | M4 | Required | P1 | Adopt |
| Go/No-Go gates + explicit human Ready decision | M4 | Required | P1 | Adopt |
| Always-Verify checklist (from `never_drop`) | M4→M6 | Required | P1 | Adopt |
| Confirmation-Loop tracking (M4 side) | M4 | Required | P1 | Adopt |
| Notification restraint | M4 | Required | P1 | Adopt |
| Lenses as projections (status/Kanban, budget grid) | M4 | Required | P1 | Adopt |
| Aggregated buffer (Critical Chain) | M2/M4 | Required | P1 | Adopt |
| Real-time collab editing (CRDT) | M4 | Optional | P1+ | Investigate |
| Hill-chart honest progress | M4 | Optional | P1+ | Investigate |
| Bid Leveling | M5 | Required | P2 | Adopt |
| RFQ/RFP/RFI determinacy fork | M5 (+M2) | Required | P2 | Adopt |
| Continuous re-qualification + COI gating | M5 | Required | P2 | Adopt |
| Confirmation-Loop (M5 confirm side) | M5 | Required | P2 | Adopt |
| Plan B / backup sourcing | M2/M5/M4 | Required | P2 | Adopt |
| Unit-appropriate acceptance handoff | M5→M6 | Required | P2 | Adopt |
| Advisory ranking (human selects) | M5 | Required | P2 | Adopt |
| Catalog short-circuit (pre-priced vendors) | M5 | Optional | P2+ | Investigate |
| Run of Show / Cue Sheet | M6 | Required | P3 | Adopt |
| Late Date-Binding | M6 | Required | P3 | Adopt |
| Situation Awareness / leading-indicator monitoring | M6 | Required | P3 | Adopt |
| Three-Way Match | M6 (+M5) | Required | P3 | Adopt |
| Graceful Degradation ladder | M4/M6 | Required | P3 | Adopt |
| Success-Recognition signal | M6→M7 | Required | P3 | Adopt |
| Flow metrics over EVM | M6 | Required | P3 | Adopt |
| BEO execution contract (M5→M6) | M5/M6 | Optional | P3+ | Investigate |
| Variance-with-reason capture | M7 | Required | P4 | Adopt |
| Evidence-before-closure gate | M7→M8 | Required | P4 | Adopt |
| Learning-signal extraction | M7 | Required | P4 | Adopt |
| Learning Loop / Template-Memory | M8→M1/M2 | Required | P5 | Adopt |
| Closure gate + after-action capture | M8 | Required | P5 | Adopt |
| Recognition-support library for novices | M8 | Optional | P5+ | Investigate |
| Cross-Project Identity / Relationship layer | ✦ cross-cutting | Future | P0 decide / build later | Investigate |
| Portfolio / program management | Enterprise | Future | Deferred | Defer |
| Cross-project reporting | Enterprise | Future | Deferred | Defer |
| Multi-team hierarchy / centralized procurement / governance | Enterprise | Future | Deferred | Defer |
| Custom fields / multi-homing / user templates / one-app | None | Never | Reject | Reject |
| Workflow/status-network engine; BRE in the spine; CPM scheduler | None | Never | Reject | Reject |
| Sales pipeline/quota/forecasting; social-feed sprawl | None | Never | Reject | Reject |
| GL coupling / IMG config / auto resource-leveling / full EVM | None | Never | Reject | Reject |
| Reverse auctions | None | Never | Reject | Reject |
| AI auto-decisions (money/contracts/results/closure); unattended outward actions | None | Never | Reject | Reject |

---

## 9. Implementation Order

**Recommended sequence: P0 (cross-cutting contract decisions) → M4 → M5 → M6 → M7 → M8**, with the
learning loop closing back to M1/M2.

### Phase 0 — Freeze the cross-cutting contracts *before* M4 code (no implementation, decisions only)
Decide and write into the relevant module contracts: **re-plan lineage**, **criticality annotation**
(resolve open question O1 on graph richness), **seam idempotency + replay boundary**,
**spend-authorization seam ownership**, **stable-ID indirection** at every seam (for the future
identity layer), and the **actual↔plan reference + learning-signal schema**. These are the six items
the benchmark flagged as **expensive to retrofit** (R1–R5 + O1). They touch *every* later module, so
fixing them while contracts are still elastic is the single largest debt-avoidance move.

### Then build in pipeline / data-dependency order
1. **M4 — Workspace** (current target; most cross-cutting). It owns lineage, the attention model,
   gates, the interaction timeline, decision records, the launch/route seam, and the spend-auth gate
   — everything downstream attaches to. *Depends on:* the frozen M3 Project (done) + P0 decisions.
2. **M5 — Marketplace/Sourcing.** Consumes M4's launch/route seam + spend-auth gate; produces the
   `MarketplaceResultRef` M6 will reconcile. *Depends on:* M4 seam + result-ref contract (P0).
3. **M6 — Execution.** Consumes M4's Ready hand-off + M5's confirmed resources; binds real dates,
   runs the Run of Show, monitors SA, does the three-way match, emits the success signal.
   *Depends on:* M4 hand-off + M5 confirmations + idempotency boundary (P0).
4. **M7 — Completion Evidence ("Learning").** Consumes M6 actuals (referencing plan nodes); captures
   variance-with-reason and the learning signal; gates closure. *Depends on:* actual↔plan reference
   + learning-signal schema (P0).
5. **M8 — Closure ("Intelligence").** Consumes M7's evidence + learning signal; runs the learning
   loop back to M1/M2 through the expert gate; closes the project. *Depends on:* M7 output + the
   learning-loop edge (P0).

### Why this order minimizes debt and maximizes architectural integrity
- **Data-dependency order = no rework.** Each module consumes a **frozen upstream contract** (FED →
  IR → Project → Workspace → sourced results → actuals → evidence → closure). Building out of order
  would force re-opening upstream contracts.
- **P0 first kills the expensive retrofits.** Lineage, identity-indirection, idempotency,
  spend-auth, and the plan↔actual/learning-signal references are *cross-cutting*: deciding them after
  M4–M8 exist means editing every module that references a version, an identity, an outward action,
  or an actual. Deciding them as **contract decisions** up front costs almost nothing now.
- **The pipeline is its own integrity guarantee.** Because seams are typed and modules are pure/
  verify-don't-trust, finishing one module fully (with its events + gates) before the next means each
  layer is independently testable and the architecture never holds two half-built contracts at once.
- **The learning loop closes last, on purpose.** Intelligence (M8→M1/M2) is only meaningful once
  there are real closed projects to learn from; building it earlier would be speculation, not
  learning.

**Net:** decide the six cross-cutting contracts now; then implement strictly down the pipeline. This
keeps every module consuming a stable upstream, confines all expensive decisions to a zero-code
Phase 0, and preserves the deterministic, immutable, verify-don't-trust integrity that is ALH's
core advantage.

---

*Integration bridge only. No code, no schema, no architecture redesign. The 8-module architecture and
the approved module specs remain the source of truth; this document maps the (now historical)
benchmark research onto them so Modules 4–8 can be implemented without re-reading the benchmark.*

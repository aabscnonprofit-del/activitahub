# OPE Gap Closure Plan

**Status:** Planning artifact — sequencing only.
**Source of truth:** This document is derived **strictly** from the *OPE Architecture Compliance Audit* and the approved OPE architecture docs (the contract). It introduces **no new architecture, no new ideas, no product expansion**. Every system listed here already exists in the approved architecture and was found missing or incomplete by the audit. This plan only answers: *what is missing, how the missing pieces depend on each other, in what order to build them, how much compliance each adds, and what 100% looks like.*

**Baseline (from audit):** Overall OPE completion ≈ **30%**. The implemented 30% is a deterministic single-event planning engine + workspace, 3 priced categories in one region (Honolulu), plus adjacent but **unlinked** participant/venue/request/marketplace features.

---

## 1. Which systems are missing

Taken directly from the audit's per-subsystem compliance. "Missing" = Not Implemented, Simplified MVP Replacement, or the incomplete portion of a Partially Implemented subsystem.

| # | System (as specified) | Audit compliance | Audit classification | What is missing |
|---|---|---|---|---|
| M1 | **Sourcing Engine — L0 brief** | ~5% | Not Implemented | The specified structured sourcing brief (buildable with no network) is not emitted at all. |
| M2 | **Communications — specifics injection** | ~40% | Partially Implemented | Message backbone fills `[token]` placeholders only; real scenario specifics are not injected. No email/SMS send. |
| M3 | **Planning Engine — confidence + tiering** | ~58% | Partially Implemented | No complexity/scale tiering; pattern confidence hardcoded; specified confidence-driven clarification/escalation loop absent. |
| M4 | **Organizer Assets — Templates** | 0% | Not Implemented | No save-as-template / plan reuse; every plan from scratch. |
| M5 | **OPE ↔ Marketplace / Request integration** | ~10% | Not Implemented | `ope_plans` has no link/handoff to `activities` or `customer_requests`; no `request_brief`; no plan→activity publish. |
| M6 | **Participant ↔ Plan link** | ~70% | Partially Implemented | Participants scoped to `activities`, not to OPE plans; no plan-level participant view. |
| M7 | **Organizer Workflow — lifecycle gaps** | ~55% | Partially Implemented | Missing Registration states; no headcount-tied budget freeze; corrections not scope-tagged (regional/pattern/global). |
| M8 | **Trust & Verification layer** | — (foundation, unbuilt) | Not Implemented | T0–T4 standing model; required by networks for verification of safety-critical roles/regulated vendors. |
| M9 | **Staffing Engine / Worker Network (W0/W1)** | ~8% | Simplified MVP Replacement | Only a derived supervisor count. No roles, roster, waves, fulfillment tracking, replacement sourcing, fairness. |
| M10 | **Vendor Engine / Vendor Network (V0/V1)** | ~3% | Not Implemented | No vendor matching, quotes, private/shared graph, demand-driven onboarding, or quote→budget feedback. |
| M11 | **Sourcing Engine — L1/L2** | ~5% | Not Implemented | Seed directory (L1) and network matching + acceptance workflow (L2). |
| M12 | **Actuals capture** | ~5% | Not Implemented | `HistoricalPriceRecord` type defined but never persisted/read; no actuals captured at lifecycle Closed. |
| M13 | **Learning / Reuse loop** | ~5% | Not Implemented | 3-tier learning (local/regional/global), promotion rules, expert review for safety. |
| M14 | **Budget — multi-region / historical / currency** | ~55% | Simplified MVP | Historical & external pricing providers are stubs; Honolulu-only seeds; networking unpriced; no multi-currency. |
| M15 | **Day-of Execution Engine** | ~10% | Simplified MVP Replacement | Static checklist only. No date-anchored schedule, owners, dependencies, reminders, monitoring/deviation detection. |
| M16 | **Resource Market (R0–R3)** | 0% | Not Implemented | Coordination/booking/payment/ratings layer over Worker/Vendor networks; depends on a Payment Engine. |
| M17 | **Event Request Market — full** | ~45% | Simplified MVP Replacement | OPE preliminary assessment at qualification; wave-based fairness + new-organizer reserve; handoff into an OPE plan. |
| M18 | **AI layer (understanding + voice)** | — (deterministic stub) | Not Implemented | No LLM anywhere; "AI layer" is deterministic templating. Event understanding from raw input and personalized copy absent. |

---

## 2. Dependencies between them

Dependency facts are taken from the architecture docs as summarized in the audit. `A → B` means **A depends on B** (B must exist first).

```
Foundation (depend on already-implemented pieces only):
  M1  Sourcing L0 brief        → (resource needs)            [exists]
  M2  Comms specifics          → (deterministic plan output) [exists]
  M3  Confidence + tiering      → (classification)            [exists]
  M4  Templates                 → (ope_plans)                 [exists]
  M5  OPE↔Marketplace/Request   → (ope_plans, activities, customer_requests) [exist]
  M6  Participant↔Plan link     → (participants, ope_plans)   [exist]
  M7  Lifecycle gaps            → (lifecycle state machine)   [exists] + M6

Networks / Trust:
  M8  Trust & Verification      → (no hard dep; foundation for networks)
  M9  Worker Network (W0/W1)    → M11 (sourcing request-gen + candidate chain), M8 (safety-critical verification)
  M10 Vendor Network (V0/V1)    → M11 (sourcing), M8 (regulated verification)
  M11 Sourcing L1/L2            → M1 (L0 request model); L2 → M9, M10

Feedback / Learning:
  M12 Actuals capture           → M7 (lifecycle Closed state)
  M13 Learning loop             → M12 (actuals), M7 (scope-tagged corrections)
  M14 Budget multi-region       → M13 (historical provider), M10 (vendor quote feedback)

Execution / Markets / AI:
  M15 Day-of Execution          → M9 (task owners from staffing)
  M16 Resource Market (R0–R3)   → M9, M10, Payment Engine (specified dependency)
  M17 Event Request Market full → M5 (OPE handoff), M3 (preliminary assessment via engine)
  M18 AI layer                  → deterministic output backbone [exists]; max value after M2/M13 enrich content
```

**Key dependency observations from the audit:**
- The **networks (M9/M10) sit on top of the Sourcing Engine (M11/M1) and the Trust layer (M8)** — they cannot be built first.
- **Budget multi-region (M14) closes only after Learning (M13) and Vendor quotes (M10)** — its historical/external providers are the consumers of those loops.
- **Learning (M13) cannot start without Actuals capture (M12), which needs the lifecycle Closed state (M7).**
- **Day-of Execution (M15) needs Staffing owners (M9).**
- **Resource Market (M16) is the most dependency-heavy** — both networks plus a Payment Engine.
- **AI (M18) has no hard dependency** (it rides on the existing deterministic backbone) but yields most when content is already rich (M2, M13).

---

## 3. In what order to build

Strict topological ordering of the dependencies above. Waves are dependency layers, not estimates.

### Wave 0 — Foundation (no new dependencies; all prerequisites already exist)
1. **M1** Sourcing L0 brief
2. **M2** Communications specifics injection
3. **M3** Planning Engine: confidence engine + complexity/scale tiering
4. **M4** Templates (plan reuse)
5. **M6** Participant ↔ Plan link
6. **M7** Lifecycle gaps (Registration states + scope-tagged corrections)
7. **M5** OPE ↔ Marketplace / Request integration (`request_brief`, plan→activity)

> Wave 0 connects the already-built halves of the platform and completes the deterministic core. It unblocks Actuals (via M7) and the Request Market handoff (via M5).

### Wave 1 — Trust + Networks + Sourcing
8. **M8** Trust & Verification layer (foundation for verification)
9. **M11** Sourcing Engine L1 (seed directory) — extends M1
10. **M9** Worker Network (W0/W1) + staffing roles in plan — needs M11, M8
11. **M10** Vendor Network (V0/V1) + vendor→budget feedback — needs M11, M8
12. **M11 (L2)** Sourcing network matching + acceptance workflow — needs M9, M10

### Wave 2 — Feedback / Learning / Budget closure
13. **M12** Actuals capture at lifecycle Closed — needs M7
14. **M13** Learning loop (local → regional → global, promotion + expert review) — needs M12, M7
15. **M14** Budget multi-region / historical / multi-currency — needs M13, M10

### Wave 3 — Execution / Markets / Intelligence
16. **M15** Day-of Execution Engine + monitoring — needs M9
17. **M17** Event Request Market full (preliminary assessment + waves/fairness + OPE handoff) — needs M5, M3
18. **M16** Resource Market (R0–R3) — needs M9, M10, Payment Engine
19. **M18** AI layer (understanding + voice) — backbone exists; sequenced last for maximum content coverage

---

## 4. OPE compliance gain per system

Each delta is the system's contribution toward the global completion figure (baseline ≈30% → target 100%, i.e. ~70 points to close). Deltas are weighted by the audit's per-subsystem importance and reflect closing the *missing* portion only. Cumulative column assumes the build order in §3.

| Order | System | Δ overall | Cumulative |
|---|---|---|---|
| Baseline | (implemented today) | — | **30%** |
| 1 | M1 Sourcing L0 brief | +3 | 33% |
| 2 | M2 Comms specifics injection | +3 | 36% |
| 3 | M3 Confidence + tiering | +4 | 40% |
| 4 | M4 Templates | +3 | 43% |
| 5 | M6 Participant↔Plan link | +2 | 45% |
| 6 | M7 Lifecycle gaps | +3 | 48% |
| 7 | M5 OPE↔Marketplace/Request integration | +5 | 53% |
| 8 | M8 Trust & Verification | +4 | 57% |
| 9 | M11 Sourcing L1 | +2 | 59% |
| 10 | M9 Worker Network + staffing | +8 | 67% |
| 11 | M10 Vendor Network + budget feedback | +8 | 75% |
| 12 | M11 Sourcing L2 | +2 | 77% |
| 13 | M12 Actuals capture | +2 | 79% |
| 14 | M13 Learning loop | +5 | 84% |
| 15 | M14 Budget multi-region/historical | +4 | 88% |
| 16 | M15 Day-of Execution | +4 | 92% |
| 17 | M17 Event Request Market full | +2 | 94% |
| 18 | M16 Resource Market (R0–R3) | +3 | 97% |
| 19 | M18 AI layer | +3 | 100% |

**Highest-leverage single systems:** Worker Network (M9, +8) and Vendor Network (M10, +8) — together they move OPE from ~59% to ~75% and unblock Sourcing L2, Day-of owners, Resource Market, and Budget feedback. **Highest-leverage cheap wins:** Wave 0 (M1–M7) adds ~+23 with no new dependencies, taking OPE from 30% to ~53%.

---

## 5. What 100% compliance looks like

100% = every subsystem in the compliance audit reaches its specified contract (Fully Implemented), with the cross-cutting guards from the architecture intact. Concretely:

**Engine core**
- Deterministic backbone for all money/quantity/safety, with a real **AI layer** (M18) that fills only the allowlisted text slots under the frozen-field + diff guard. Facts never altered by generation.
- **Classification** produces complexity/scale tiers and a real **confidence value** driving the specified clarification/escalation loop (M3).
- **Budget** prices any supported region/category via the full provider chain (local → historical → external → fallback), with vendor-quote feedback and multi-currency; no permanently-unpriced supported category (M14).

**Resources, staffing, vendors, sourcing**
- **Resource needs** emit a standalone plan and feed sourcing (M1).
- **Worker Network** (W0/W1) sizes roles, runs metered waves, tracks fulfillment, performs replacement sourcing with no silent under-fill, and respects new-worker fairness (M9).
- **Vendor Network** (V0/V1) matches capabilities, returns quotes that refine Budget, keeps the private/shared-graph ownership split, and onboards demand-driven (M10).
- **Sourcing Engine** runs the full L0→L2 ladder with request generation (split/bundle), candidate ranking, and the acceptance workflow (M1, M11).
- **Trust & Verification** (T0–T4) gates safety-critical roles and regulated vendors; safety knowledge never auto-promoted (M8).

**Lifecycle, execution, learning**
- Full lifecycle incl. **Registration states**, freeze points (safety+comms at Ready, budget+resources at Registration Closed), and **scope-tagged corrections** (M7).
- **Day-of Execution**: date-anchored schedule with owners, dependencies, reminders, plus monitoring/deviation detection (M15).
- **Actuals captured at Closed** (M12) feed the **3-tier Learning loop** (local/regional/global) with promotion rules and expert review (M13); next event in a region starts sharper.

**Markets & integration**
- **OPE plans are linked to the marketplace and request market**: `request_brief` handoff, plan→activity publish, single cost source flowing end-to-end (M5).
- **Participants** are addressable at the plan level (M6).
- **Event Request Market** qualifies requests with an OPE preliminary assessment, matches organizers via wave-based fairness, and hands accepted requests into an OPE plan (M17).
- **Resource Market** (R0–R3) coordinates booking/payment/ratings over the networks via the Payment Engine (M16).

**Cross-cutting guards held throughout (from the audit/architecture, unchanged):**
- Determinism for all money/quantity/safety; AI never computes numbers or removes/softens risks.
- No silent under-fill; fulfillment status always truthful.
- Organizer owns their private relationships/pricing; platform never charges on imported/private relationships.
- Safety knowledge only ever gets stricter, via expert review — never auto-relaxed.

At that point the implemented system equals the specified OPE: an organizer operating system that understands the event, plans it deterministically, sources the people and vendors to run it, executes day-of, learns from outcomes, and is wired end-to-end with the marketplace and request market — not a template + budget calculator beside disconnected features.

---

*This plan sequences only what the compliance audit found missing. No subsystem, table, or capability here is new relative to the approved OPE architecture.*

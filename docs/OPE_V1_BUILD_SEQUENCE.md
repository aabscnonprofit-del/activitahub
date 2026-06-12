# OPE v1 — Build Sequence

> **Purpose:** the exact implementation order for OPE v1. **Not** code, schema, API, or architecture —
> sequencing only.
> **Grounded in:** the architecture set, `ARCHITECTURE_CLOSURE_REPORT §8`, `IMPLEMENTATION_SYNC_CHECKLIST`,
> and the built engine (`lib/ope`, M1–M3).
> **Reality check:** Milestones **1–4 are substantially built** (M1–M3, deterministic, snapshot-tested);
> they are sequenced here as **harden + complete + persist**, not build-from-zero. The new OPE-v1 work is
> **M5–M7**.
> **Date:** 2026-06-11.

> **Pre-flight (parallel, non-blocking):** sync the source-of-truth contradictions C1–C4
> (`IMPLEMENTATION_SYNC_CHECKLIST §4`) and decide the two hard blockers — **`request_brief` contract** and
> **Staffing/Vendor needs emission** — before M6.

---

## Milestone 1 — OPE Event Intake

- **Objective:** capture a complete, validated **event scenario** and hold it as a persistable draft (the
  first lifecycle state, `OPE_EVENT_LIFECYCLE`: Draft).
- **Deliverables:** validated intake → `Scenario` (category/pattern, counts, venue, location, budget,
  requirements, recurrence); the **coverage gate** + **clarification loop** at intake; a **Draft** the
  organizer can return to.
- **Dependencies:** none (engine intake + gate + clarification exist; persistence-of-draft is the new
  part).
- **Success criteria:** a scenario can be captured, clarified (UNKNOWN→ASK), gated (supported vs
  handoff), and **retrieved as a Draft**; unsupported inputs return an honest handoff (no silent
  fallback). *(Engine portion already proven by `npm run test:ope`.)*

## Milestone 2 — OPE Event Plan Generator

- **Objective:** turn a supported scenario into the canonical **6-section plan** (`ACTIVITY_PLANNER_OUTPUTS_V1`).
- **Deliverables:** deterministic plan (summary, timeline, checklists, budget, risks, messages, upgrade);
  gate/clarification honored; **Recurring** modifier applied where relevant.
- **Dependencies:** M1 (scenario).
- **Success criteria:** supported scenarios → `plan_ready` with all six sections; refusals → handoff;
  output is **byte-stable** for unchanged inputs (snapshot test green). *(Built — M1–M3.)*

## Milestone 3 — Budget Engine

- **Objective:** produce a credible **low/likely/high** budget with editable line items, priced for the
  launch region with an honest currency/fallback note elsewhere.
- **Deliverables:** per-line breakdown with **preserved `item_key`s** (edit-ready), contingency, key cost
  drivers, levers note, `is_fallback`/currency note; per-session + series totals when Recurring.
- **Dependencies:** M2 (plan), launch-region pricing scope decision (`SYNC §5`).
- **Success criteria:** budget matches the reference seed for the launch region; non-region requests show
  the **reference-pricing/currency note**; line items carry stable IDs for M5 editing. *(Built — M1–M3.)*

## Milestone 4 — Task & Resource Planning

- **Objective:** size **what is needed** — checklists (prep/day-of/after) **and** a structured
  **resource/staffing/vendor needs** list (the sourcing precursor).
- **Deliverables:** task checklists (built); sized **resource quantities** (built); **emit capability-typed
  needs** (workers + vendors + supplies) mapped to budget lines — the part currently PARTIAL (only
  `supervising_adults`).
- **Dependencies:** M2/M3; the **Staffing needs-emission** decision (`SYNC §5`).
- **Success criteria:** a plan yields (a) the task checklists and (b) a **structured needs list** (each
  need: capability, quantity, window, budget reference) ready for sourcing.

## Milestone 5 — Editable Organizer Workspace

- **Objective:** let an organizer **view, edit, and recompute** a saved plan, with **current-plan-only**
  corrections (`OPE_PLANNING_WORKFLOW §3`) and lifecycle states (`OPE_EVENT_LIFECYCLE`).
- **Deliverables:** **persistent plans**; edit key inputs (e.g. guest count) → **deterministic
  recompute**; edit a budget line → plan updates; save/version; the **freeze points** (budget/resources
  freeze as the plan advances). *(No schema/UI designed here — capability only.)*
- **Dependencies:** M2 (plan), M3 (line-item IDs), M4 (resources), a **persistence decision** (`SYNC §5`).
- **Success criteria:** a plan persists and round-trips; editing an input recomputes the budget
  deterministically; corrections are scoped **current-plan-only** (no leakage to shared knowledge in v1).

## Milestone 6 — Sourcing Request Generation

- **Objective:** turn the plan's **needs** (M4) into **sourcing requests / briefs** at L0
  (`OPE_SOURCING_ENGINE`) — workers and vendors.
- **Deliverables:** per-need **`request_brief`** (capability/qty/window/location/budget/spec); split/bundle
  rules; **brief-only** output the organizer can act on (no matching, no transactions in v1 — W0/V0/R0).
- **Dependencies:** M4 (needs emission), the **`request_brief` contract** (hard blocker, `SYNC §5`).
- **Success criteria:** a plan produces structured, actionable **sourcing briefs** for its worker/vendor
  needs; safety-critical/regulated needs are flagged (verification required); nothing is auto-matched or
  charged.

## Milestone 7 — Early Marketplace Integration

- **Objective:** connect the plan to the **markets at their earliest tiers** — the **Event Request Market**
  (OPE preliminary assessment feeding `customer_requests`→organizer) and **Resource Market R0/R1**
  (briefs surfaced for discovery/coordination).
- **Deliverables:** the OPE **preliminary assessment** wired into the existing request/proposal flow;
  sourcing briefs (M6) presentable for **discovery/coordination** (R0/R1) — **no payments, no bookings of
  workers/vendors, no commissions** (those are post-v1, R3+).
- **Dependencies:** M6 (briefs), the partly-built `customer_requests`/`proposals`/`bookings` primitives.
- **Success criteria:** an organizer can take a plan into the existing request flow with a grounded
  assessment; sourcing briefs are presentable for discovery; the **demand market (request→organizer)** and
  **supply market (organizer→resource briefs)** are visibly **distinct** and correctly handed off.

---

## Dependency ordering (summary)

```
M1 Intake ─▶ M2 Plan Generator ─▶ M3 Budget ─▶ M4 Task & Resource (+needs)
                                                      │
                                   M5 Editable Workspace (persist + recompute)
                                                      │
                                   M6 Sourcing Briefs  ── needs request_brief + Staffing emission
                                                      │
                                   M7 Early Marketplace ── needs M6 + Event-Request primitives
```

- **M1–M4** are the engine — **mostly built (M1–M3)**; remaining = persistence-of-draft (M1), needs
  emission (M4).
- **M5** is the first wholly-new v1 surface (organizer workspace).
- **M6–M7** are **blocked** until `request_brief` + Staffing needs emission are decided; everything before
  is unblocked.

## Out of scope for v1 (per the sync checklist)

Community modifier · additional patterns · full Worker/Vendor matching · Resource Market R2+ transactions ·
payments/escrow/contracts/disputes · Trust Layer · Learning/Monitoring promotion · multi-region pricing
depth · LLM planner · proposal view/PDF/convert-to-activity.

_Build sequencing only. No code, schema, API, or architecture. Reflects the architecture set, the closure
report, the sync checklist, and the built `lib/ope` engine as of the date above._

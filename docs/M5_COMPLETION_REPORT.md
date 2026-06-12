# M5 — Organizer Workspace · Completion Report

> **Purpose:** formally close the **M5 Organizer Workspace** milestone.
> **Status:** ✅ **M5.0 complete** (core single-event workspace) · ⏭️ **M5.1 deferred** (open by design).
> **Date:** 2026-06-11
> **Scope of this document:** closure record only — no new architecture, no code, no redesign.
> **Source of truth:** `M5_ORGANIZER_WORKSPACE_IMPLEMENTATION_PLAN.md`, `OPE_V1_BUILD_SEQUENCE.md`,
> the built `lib/ope` engine, and the workspace artifacts listed below.

---

## 1. What M5 originally intended to deliver

M5 set out to build the **Organizer Workspace** as **persistence + editing + readiness + lifecycle on top of
the existing deterministic engine** (`generatePlan` → the 6-section `OUTPUTS_V1` plan) — *reusing* the consumer
rendering components, not rebuilding them, and never touching the engine.

It was scoped in two tiers from the outset:

- **M5.0 (core — must ship):** create an event (intake → gate → clarification → generate) persisted as a Draft;
  persist a plan with its inputs/edit-state/phase/corrections; view the plan across its six lenses (timeline,
  budget, resource, task, risk, communication); edit inputs with **deterministic recompute**; edit budget line
  items (current-plan-only); mark tasks done / risks handled / resources sourced; a **5-tile readiness** model;
  and **lifecycle phases with a freeze** as the plan advances.
- **M5.1 (deferred):** portfolio dashboard (multi-event), Live run-sheet, Completed close-out + **actuals
  capture**, custom tasks/notes, message-send tracking, plan versioning/history UI, recurring per-session
  display.

**Hard constraints (held throughout):** do not modify the OPE engine; reuse the consumer components; keep all
edits **current-plan-only** and deterministic; no sourcing, no marketplace, no payments.

---

## 2. What was implemented

The full **M5.0** loop, end to end:

**create → persist (Draft) → view (6 lenses) → readiness → edit inputs + recompute → budget corrections →
preparation state → lifecycle + freeze + billing signal.**

Key artifacts:

| Layer | Artifacts |
|---|---|
| **Schema** | `supabase/migrations/021_ope_plans.sql` (table, RLS, phase enum) + `022_ope_plan_lifecycle_wp8.sql` (canonical lifecycle enum + `lifecycle_log`) |
| **Store / actions** | `lib/actions/opePlans.ts` — `createPlan`, `getPlan`, `listPlans`, `updatePlanInputs`, `saveCorrections`, `savePrepState`, `advancePhase` (owner-checked; freeze-enforced) |
| **Workspace logic (pure)** | `lib/workspace/readiness.ts`, `budget-overlay.ts`, `prep.ts`, `lifecycle.ts` — deterministic, engine-free |
| **Pages** | `app/[locale]/dashboard/plans/{page,new/page,[id]/page}.tsx` |
| **Components** | `PlanDetailClient`, `SavedPlanView`, `NewPlanForm`, `EditPlanForm`, `ReadinessStrip`, `BudgetView`, `ChecklistView`, `RiskView`, `ResourceView`, `LifecycleControls`, `usePrepToggle` |
| **Render reuse** | `components/planner/PlanResult.tsx` extended with optional slots (`budgetSlot`/`tasksSlot`/`risksSlot`/`resourcesSlot`); public planner render unchanged |
| **i18n** | `workspace.*` namespace across all six locales (en/es/fr/ru/de/pt) |

**Engine untouched:** `npm run test:ope` remained **31/31 byte-stable** through all eight work packages.

---

## 3. WP1–WP8 status

| WP | Scope | Status |
|---|---|---|
| **WP1 — PlanStore** | persist/load/version a plan {inputs, result, corrections, prep_state, phase} | ✅ Complete |
| **WP2 — Create / Persist** | intake → generate → persist as Draft (or honest handoff) | ✅ Complete *(see §9 clarification note)* |
| **WP3 — Read lenses** | render all 6 sections; plans index + detail | ✅ Complete |
| **WP4 — Readiness** | 5 tiles (Ready% + Open Risks, Missing Resources, Budget, Staffing) + Next Action | ✅ Complete |
| **WP5 — Input edit + recompute** | edit identity inputs → deterministic re-run → persist (corrections/prep preserved) | ✅ Complete |
| **WP6 — Budget correction overlay** | edit a line item → totals recompute (current-plan-only, arithmetic-parity with engine) | ✅ Complete |
| **WP7 — Preparation state** | mark tasks done / risks resolved / resources secured → readiness reacts | ✅ Complete |
| **WP8 — Lifecycle & Freeze** | phase transitions + server-enforced freeze + active/closed billing signal + audit log | ✅ Complete |
| WP9 — M5.1 | dashboard · Live · Completed+actuals · comms-send · versioning UI | ⏭️ Deferred (M5.1) |

**Verification at closure:** `tsc --noEmit` exit 0 · `npm run test:ope` 31/31 · `npm run build` ✓ · lint clean ·
all 6 message JSONs valid · lifecycle rule harness 26/26 · budget-overlay parity confirmed.

---

## 4. Final lifecycle model

Canonical six-state linear lifecycle (stored in `ope_plan_phase`, single source of truth
`lib/workspace/lifecycle.ts`):

```
Draft → Planning → Ready → In Progress → Completed → Closed
```

- **Draft → Planning** is **automatic** the moment the engine returns `plan_ready`. Non-ready results
  (clarification / handoff / unsupported) remain **Draft**.
- All other forward steps are **single-step, organizer-initiated**.
- **Overrides** are allowed but warned and recorded as `forced`:
  **unfreeze** (Ready → Planning), **reopen** (In Progress → Ready, Completed → In Progress, Closed →
  Completed), **abandon** (Planning / Ready / In Progress → Closed). Skipping forward > 1 step is rejected.
- **Audit trail:** every transition appends `{from, to, at, by, forced, auto?, reason?}` to an append-only
  `lifecycle_log`.
- **`Cancelled` was retired** as a distinct state (product decision): abandoned projects go directly to
  **Closed**; the success-vs-abandon distinction is derivable from the from-phase in `lifecycle_log`.

---

## 5. Final billing model

**Active project = Planning … Completed.** Draft and Closed are **not** billed.

- Helper: `isBillingActive(phase) = phase ∉ {draft, closed}`.
- **Completed counts** as active (Completed ≠ Closed); only **Closed** removes a project from the active count.
  **Reopening** Closed → Completed re-activates it.
- A plan is **not** billed during Draft (engine-failed/exploratory plans don't count) and stops counting at
  Closed.
- **Signal only — no payments.** M5 exposes the active/closed signal (and an "Active project / Not billed"
  chip); the actual metering/invoicing is a separate future track and was explicitly out of scope.

---

## 6. Freeze model

Two switches, enforced **server-side** in the write actions **and** mirrored as disabled UI affordances
(defense in depth):

| Surface | Editable in | Frozen at |
|---|---|---|
| **Plan definition** — inputs (`updatePlanInputs`) + budget corrections (`saveCorrections`) | Draft, Planning | **Ready** and beyond |
| **Preparation progress** — tasks / risks / resources (`savePrepState`) | Draft … In Progress | **Completed** and beyond |
| **Everything** | — | **Closed** = full read-only |

- Editing a locked plan requires the explicit, warned **Ready → Planning** unfreeze (no per-field unlock).
- **Readiness is never frozen directly** — it's a pure function of its inputs, so it stays live while progress is
  editable and goes static once those inputs freeze.
- Freezing the budget **estimate** at Ready does **not** block future **actuals** capture (a different field,
  M5.1).

---

## 7. What remains in M5.1

Deferred-by-design tier (WP9), all unbuilt and unblocking nothing in M5.0:

- **Portfolio dashboard (multi-event)** — beyond today's flat plans list: status roll-ups / overview.
- **Live run-sheet** — a day-of view for the `In Progress` phase.
- **Completed close-out + actuals capture** — record actual spend/attendance vs. estimate (highest-value item;
  closes the learn-from-reality loop).
- **Custom tasks / notes** — organizer-added tasks and free notes beyond the engine checklist.
- **Message-send tracking** — a "mark sent" state for communications (today: copy-only).
- **Plan versioning / history UI** — the data exists (`version`, `lifecycle_log`); the viewer does not.
- **Recurring per-session display (deeper)** — cadence + series total already render; per-occurrence management
  is M5.1.

---

## 8. What was intentionally deferred (outside M5 entirely)

Per `OPE_V1_BUILD_SEQUENCE` "out of scope for v1" and the M5 constraints — untouched throughout:

- **Sourcing brief generation** (M6) and **marketplace integration** (M7).
- **Worker Network / Vendor Network** matching, bookings, transactions, commissions.
- **Payments / escrow / contracts / disputes**; active-project **billing enforcement** (signal only in M5).
- **LLM planner**, proposal view / PDF export / convert-to-activity, Trust Layer, Learning/Monitoring
  promotion, multi-region pricing depth, Community modifier / additional patterns.

---

## 9. Known limitations

1. **Migration 022 must be applied** for the lifecycle/freeze/billing features to work against the live
   database. (This report assumes 022 applied; 021 was already applied in its original form, and editing it is
   inert — the lesson that prompted 022.)
2. **Create flow has no interactive clarification loop.** A `needs_clarification` result is shown read-only;
   the organizer resolves it by **editing inputs** rather than answering questions inline. Functional, but not
   the designed answer→resubmit UX.
3. **Readiness Ready% granularity.** A single task tick among many (~fraction of a percent) may not move the
   integer percent; the checkbox gives instant visual feedback and the percent climbs as progress accumulates.
   Risk-resolve and resource-secure move both the tile and the percent immediately.
4. **No versioning/history UI.** `version` bumps and the `lifecycle_log` are persisted but not yet surfaced.
5. **Legacy i18n keys** (`phasePreparation` / `phaseLive` / `phaseCancelled`) remain but are unused after the
   WP8 canonical rename — harmless, removable later.
6. **M4 needs-emission is partial** (only `supervising_adults`). Not an M5.0 limitation, but it is the engine
   gap that gates M6 (noted here for continuity).

---

## 10. Recommendation for next milestone

Two viable next moves:

- **Option A — finish M5.1**, led by **Completed actuals capture.** Highest product value: it closes the
  learn-from-reality loop and feeds future pricing/quality. Best if the goal is a polished, demoable
  single-organizer product.
- **Option B — start the M6 track (Sourcing Request Generation).** This is the path to the
  sourcing/marketplace differentiator, but it is **blocked** and requires, first:
  1. **Complete M4 needs-emission** (capability-typed worker/vendor/supply needs).
  2. **Decide the `request_brief` contract** (hard blocker).
  3. **Decide Staffing/Vendor needs emission** (hard blocker).
  Then **M7 — Early Marketplace Integration** (OPE preliminary assessment into the existing request/proposal
  flow; sourcing briefs surfaced for discovery — still no payments/bookings).

**Recommendation:** if a shippable, self-contained organizer product is the near-term goal, do **M5.1 actuals
first**; if unlocking the sourcing/marketplace moat is the priority, resolve the **M6 blockers** next.

---

## Closure statement

**M5.0 — the core single-event Organizer Workspace — is complete, verified, and (with migration 022 applied)
live-consistent.** The deterministic engine was never modified; all editing is current-plan-only and
reproducible; lifecycle, freeze, and the active/closed billing signal are in place. **M5 is hereby closed at
the M5.0 tier**, with M5.1 (WP9) and M6+ tracked as the next work.

_Closure report only. No architecture, schema, API, or code was changed by this document._

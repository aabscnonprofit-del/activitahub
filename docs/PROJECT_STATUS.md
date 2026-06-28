# ActivLife Hub — Project Status

> **Status: Canonical state-of-the-project document.** Reflects the deployed code on `origin/main` and the
> 46 committed migrations as of this Phase-1 recovery. For *what* each thing is, see
> `GLOBAL_PRODUCT_SPECIFICATION.md`; for the architecture, `CURRENT_ARCHITECTURE.md`; for the build order,
> `ROADMAP_V2.md`. This document is the source of truth for **implementation state**.

---

## 1. Current architecture

The **Project-centric pipeline** (`CURRENT_ARCHITECTURE.md`):

```
Client → Discovery / OPE → Project (Root) → Planner / Budget → Occurrence → Publish → Public Space → Registration → Payment
```

A **legacy Event/marketplace architecture** (organizer publishes `activities`; customers `book`; or post
`customer_requests` answered by `proposals`) runs **in parallel** and is the live, revenue-bearing V1. The
two are not yet converged (see §5).

## 2. Implemented (live on `origin/main`)

- **V1 marketplace:** activities, Ready Activities, Event Requests (`customer_requests`), `proposals`, `bookings`.
- **Payments:** Stripe subscriptions, Connect, booking payments, invoices, refunds, One Event License.
- **Academy & certification:** lessons, exam, certificate, certification-gated organizer access.
- **OPE V1 planner:** `lib/ope` deterministic engine; idea-first (`generateFromIdeaAction`) + structured
  (`createPlan`) flows; `dashboard/plans/[id]`.
- **Project layer:** `projects` (041); Plan→Project link + backfill (044/045); creation routed through the
  **Project Service** (`resolveProjectForPlan`).
- **Budget:** `budgets`/`budget_lines`/`budget_vendor_quotes`/`commercial_proposals` (042); delivery
  components (043); Budget Workspace UI.
- **Public Space:** `/[locale]/p/[projectId]` — public projection of a **published** Project (046).
- **Publish Flow:** owner-only, idempotent `is_published` toggle + Published screen.
- **Dashboard / Project Workspace:** organizer dashboard + `dashboard/projects` list & hub.

## 3. Partially implemented

- **Budget ↔ Plan mirroring:** delivery-component fill exists in code but is **uncommitted** (`lib/budget/mirror.ts`,
  parts of `lib/actions/budget.ts`/`planner.ts`/`projects/store.ts`) — budgets are empty on real Projects until wired.
- **Project Workspace hub:** only Budget is a live module; the rest show "Project integration planned".
- **Occurrence:** table exists (046) but there is **no authoring flow** — Public Space shows "Dates coming soon".

## 4. Not implemented

- **Occurrence authoring**, **Registration** (per-Occurrence), **pipeline Payment** (Registration→Payment).
- **OPE V2** (8-module engine) — code dormant/uncommitted (`lib/ope-engine`, `lib/project`, `lib/discovery`,
  `lib/organizer-workspace`); Modules 4–8 spec-only.
- **Knowledge/learning loop, marketing automation, worker/vendor network** (largely spec-only).

## 5. Deprecated / divergent (decided but not yet reconciled)

- **Legacy public discovery** on `activities` vs. **Public Space** on published Projects — duplicate public surfaces.
- **`vendor_requests.plan_id` / `invoices.plan_id`** anchor durable artifacts to the **Plan**, contradicting
  the Project-ownership decision (should be Project-anchored).
- **OPE-V2-"frozen"** architecture is partially superseded by the Project pivot; its status is ambiguous.
- **Ticket Seller** model and **Budget Workspace** framing carry Constitution tensions (per the Constitution Audit).

## 6. Historical

Point-in-time audits, gap analyses, completion reports, and superseded roadmaps — kept for record, not
current (see `DOCUMENTATION_INDEX.md §12–13`).

## 7. Operational risk — migrations not auto-applied

Migrations `041`–`046` are committed but applied to the database **separately** from code deploys. The
deployed plan→project code requires `044`/`045`; Public Space + Publish require `046`. **Confirm production
DB state and apply `044 → 045 → 046` in order.** Until then, the Project pipeline is non-functional in prod.

## 8. Current development phase

**Phase 1 — Documentation recovery** (this set of documents). The implementation phases resume at
`ROADMAP_V2.md` once the foundation is in place and migrations are applied.

## 9. Current roadmap step

`ROADMAP_V2.md` **Phase A — Apply & verify migrations; commit the dormant Budget↔Plan mirroring**, then
**Phase B — Occurrence authoring** (the pipeline hole).

## 10. Immediate next implementation task

**Apply migrations `044 → 045 → 046` to production and verify the deployed Project pipeline** (plan→project,
Public Space, Publish) works end-to-end against the live DB. This unblocks everything downstream and is the
smallest action that closes the largest current gap.

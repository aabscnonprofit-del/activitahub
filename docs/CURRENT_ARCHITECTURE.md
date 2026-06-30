# ActivLife Hub — Current Architecture

---

⚠️ Historical / Supporting Document

The current product definition is:

docs/ACTIVLIFE_HUB_PRODUCT_CANON.md

This document remains for historical context,
additional detail,
or implementation guidance.

If any statement conflicts with the Product Canon,
the Product Canon is authoritative.

---

> **Status: Canonical architecture document.** Describes **only** the architecture considered current. A
> short historical section (§7) records what it supersedes. Governed by the Constitution
> (`ALH_PRODUCT_PHILOSOPHY.md`) — these entities are **invisible to the organizer**; they exist to serve the
> journey. Implementation state in `PROJECT_STATUS.md`; entity specs linked inline.

---

## 1. The canonical pipeline

```
Client
  → Discovery / OPE        (understand intent, generate the plan)
    → Project (Root Entity) (the one durable engagement)
      → Planner / Budget    (scope + estimate; pricing overlay)
        → Occurrence        (concrete dated instances)
          → Publish         (make it public)
            → Public Space   (the public projection)
              → Registration (per-Occurrence sign-up)
                → Payment    (per-Registration)
```

The organizer experiences this as: *describe idea → review the prepared event → set the date → publish.*
The entity names below never appear in the organizer's experience (Constitution §6).

## 2. Root Entity — Project

**Project is the single business root.** Everything *realized* (budget, vendor commitments, proposals,
payments, participants, files, history, the execution record) belongs permanently to the Project
(`ADR_003_ENTITY_OWNERSHIP.md`). The
**Project Service** (`lib/projects/store.ts`) is the **only** owner of Project creation, resolution, and
public-read policy — no component writes the `projects` table directly (`resolveProjectForPlan`,
`getPublicProject`, `publishProject`). *Schema:* migration `041`; RLS owner-only + public-read for published.

## 3. Plan — scope + estimate (owned by the Project)

The OPE engine (`lib/ope`) produces a **Plan** — the scope and estimate (delivery components, schedule,
cost estimate). A Plan is **versioned**, belongs to a Project (`ope_plans.project_id`, migration `044`;
existing plans backfilled by `045`), and only the **active** Plan drives downstream work. The Plan owns
*intent*; the Project owns everything *realized*. *Spec:* `OPE_V1_TECHNICAL_DESIGN.md`.

## 4. Budget — pricing overlay (owned by the Project)

The **Budget** prices the active Plan's scope: budget lines (referencing scope components), vendor quotes
(`selected` ≠ `committed`), an organizer fee, derived totals, and immutable **Commercial Proposal**
snapshots. The Budget is Project-owned and persists across replanning. *Schema:* `042`/`043`; *spec:*
`BUDGET_WORKSPACE_V1_DESIGN.md`, `BUDGET_INPUT_CONTRACT.md`.

## 5. Occurrence — dated instances (owned by the Project)

A **Project has many Occurrences** — concrete, time-bound instances ("the date"). Registration, capacity,
and price belong to the Occurrence; a recurring activity is **one Project with many Occurrences**, never
many Projects. *Schema:* `occurrences` (migration `046`); *spec:* `OCCURRENCE_SPEC.md`. *(Authoring not yet
built — `PROJECT_STATUS.md §3`.)*

## 6. Publish → Public Space → Registration → Payment

- **Publish:** an owner-only, idempotent action sets `projects.is_published = true` (`publishProject`) —
  see `ADR_008_PUBLISH_FLOW.md`.
- **Public Space:** the **read-only public projection** of a published Project at `/[locale]/p/[projectId]`
  — it owns no data and contains no business logic; it projects Project + Occurrence data via public-read
  RLS. *Spec:* `PROJECT_PUBLIC_SPACE_SPEC.md` (migration `046`).
- **Registration / Payment:** per-Occurrence sign-up and payment — **not yet built**; Stripe infrastructure
  is reused when they are.

## 7. Source-of-truth & ownership rules (cross-cutting)

These rules are recorded as Architecture Decision Records (`ADR_INDEX.md`):

- **Entity ownership** — Plan = scope/estimate; Project = everything realized; durable artifacts persist
  across re-planning. → `ADR_003_ENTITY_OWNERSHIP.md`.
- **Source of truth** — one writer per fact; others reference / derive / hold immutable snapshots; issued
  artifacts (proposals, contracts, invoices, payments) are immutable. → `ADR_004_SOURCE_OF_TRUTH.md`.
- **Lifecycle** — the canonical state machine + plan-version layer + progressive freezing. →
  `ADR_005_LIFECYCLE_STATE_MACHINE.md`.
- **Transition authority** — who initiates vs. authorizes; AI never authorizes a commitment. →
  `ADR_006_TRANSITION_AUTHORITY.md`.
- **Business operations** — every command is one guarded, canonical operation. →
  `ADR_007_BUSINESS_OPERATIONS.md`.
- **Publish** — owner-only, idempotent publish to Public Space. → `ADR_008_PUBLISH_FLOW.md`.

## 8. Historical architectures (superseded — short record)

- **Legacy Event/marketplace (V1):** organizers publish `activities` to a marketplace; customers `book`,
  or post `customer_requests` answered by `proposals`. **Still live and revenue-bearing**, runs in parallel,
  and is slated to converge onto Public Space (`PROJECT_STATUS.md §5`). *Docs:* `EVENT_REQUEST_MARKET_ARCHITECTURE.md`.
- **OPE V2 (8-module "frozen" engine):** `lib/ope-engine` etc.; **dormant/uncommitted** and partially
  superseded by the Project-centric pipeline. *Docs:* `OPE_V2_MODULE_STATUS.md`, `OPE_MODULAR_PIPELINE_PRINCIPLE.md`.

---

*This is the one current architecture. Anything not described here as current is historical (§8) or not yet
built (`PROJECT_STATUS.md`). When the architecture changes, update this document first.*

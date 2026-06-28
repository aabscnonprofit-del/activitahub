# ADR 003 — Entity Ownership

> **Status: ACCEPTED.** Architecture Decision Record. Recovers a decision previously held only in working
> sessions. Governed by `ALH_PRODUCT_PHILOSOPHY.md`; canonical architecture in `CURRENT_ARCHITECTURE.md`.

## Purpose

Define, once and for all, which entity **owns** each major piece of information in ActivLife Hub, so that
no fact has two owners and nothing is lost when an event is re-planned.

## Decision

**The boundary is "intended vs. realized."**

- The **Plan** owns only the **scope + estimate** (the generated plan, planned tasks/schedule, resource &
  role *needs*, cost *estimate*). It is versioned and append-only; one version is active.
- The **Project (Root Entity)** owns **everything that becomes real** — committed, transacted, legal,
  relational, or part of the durable record.

**Ownership map (canonical):**

| Thing | Owner | Note |
|---|---|---|
| Project | Project (root) | the durable engagement |
| Plan (scope/estimate) | Project (versioned child) | one active version |
| Cost estimate | Plan | estimate ≠ price |
| Budget, Budget Lines, Vendor Quotes, Commercial Proposal | **Project** | money is durable; proposals are immutable snapshots |
| Resource/Role Needs | Plan | scope; materialized as delivery components |
| Occurrence | Project | concrete dated instance |
| Registration | Occurrence → Project | per-instance sign-up |
| Payment | Registration | follows the registration |
| Contracts, Invoices, Payments | **Project**, immutable | financial/legal record |
| Participants, Files, Messages, Analytics, Execution log | **Project** | durable |
| Worker assignment, Venue (booked) | **Project** | the *need* is Plan; the *commitment* is Project |

## Reasoning

This is the consensus of mature systems that turn a plan into a real, costed engagement — **Procore**
(project owns budget/commitments/contracts; baselines are the planned layer), **Primavera/MS Project**
(baselines = planned; actuals on the project), **SAP PS** (WBS owns commitments/actuals; versions hold
planning), and **Salesforce CPQ** (opportunity owns quotes; one primary). Anchoring durable artifacts to a
*transient* plan version loses them on re-scope; anchoring them to the durable Project preserves them.

## Alternatives considered

- **Plan-as-root** (the plan is the entity, project is a label) — *rejected:* loses history on re-scope,
  can't hold alternatives, ties real money to a transient artifact.
- **Single object** (one record holds plan + realized data) — *rejected:* conflates intent and reality;
  no clean versioning.

## Consequences

- Re-planning is a **Plan-version change inside the Project**, not a state reset; budget/vendors/payments
  persist and only scope references reconcile.
- **Known conflict to fix:** `vendor_requests.plan_id` and `invoices.plan_id` currently anchor durable
  artifacts to the **Plan**; per this ADR they must be **Project-anchored** (tracked in `ROADMAP_V2` Phase F
  — Legacy reconciliation, `PROJECT_STATUS.md §5`).
- `budgets.project_id`, `commercial_proposals` (immutable), and `project_delivery_components` are already
  correct.

## Dependencies

Migrations `041` (projects), `042/043` (budget, delivery components), `044/045` (Plan↔Project link).

## Related documents

`CURRENT_ARCHITECTURE.md`, `ADR_004_SOURCE_OF_TRUTH.md`, `ADR_005_LIFECYCLE_STATE_MACHINE.md`,
`OCCURRENCE_SPEC.md`, `BUDGET_WORKSPACE_V1_DESIGN.md`.

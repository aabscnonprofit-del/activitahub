# ADR 005 — Event Lifecycle State Machine

> **Status: ACCEPTED.** Architecture Decision Record. Recovers a decision previously held only in working
> sessions. Extends (does not replace) the V1 `OPE_EVENT_LIFECYCLE.md`.

## Purpose

Define the complete lifecycle of an event — from the first idea to permanent closure — as one canonical
state machine, with clear entry/exit, locks, and immutable snapshots per state.

## Decision

**A two-layer model:**

- **Project/engagement lifecycle (the canonical states):**

```
Draft(Idea) → Discovery → Planning → Budgeting → Proposal → Approved
            → Ready → Open for Registration → Registration Closed
            → In Progress → Completed → Closed → Archived
  branches: → Cancelled (terminal-fail)   → On Hold (resumable)   Closed → Reopened
```

- **Plan-version lifecycle (orthogonal):** Active / superseded / archived. **Re-planning changes the active
  Plan version without resetting the Project's lifecycle state.**

**Progressive freezing (key transitions):** *Ready* freezes safety + communications; *Registration Closed*
freezes budget + resources; *In Progress* freezes the plan. **Immutable snapshots** are created at: Proposal
sent, Approved (contract/deposit), Ready (baseline), Registration Closed (committed plan), Completed
(evidence), Closed (closeout), Cancelled (cancellation record).

The front half (Discovery → Approved) is the commercial funnel the Budget/Proposal modules add; the back
half (Ready → Closed) is the existing `OPE_EVENT_LIFECYCLE`; `Archived` is new.

## Reasoning

Synthesis of the mature consensus: Salesforce/Tripleseat (commercial funnel + commitment gate), SAP-PS /
Procore (gated execution; each status governs allowed actions), Cvent (registration freeze), Jira (reopen),
and the universal **archive-not-delete** + **append-only history** patterns.

## Alternatives considered

- **Plan-as-primary lifecycle** — *rejected:* loses history on re-scope (see `ADR_003`).
- **One flat status enum without freezing** — *rejected:* can't express what locks when.
- **Re-plan = lifecycle reset** — *rejected:* would orphan realized data; replanning is a plan-version change.

## Consequences

- The Project's lifecycle state is the **single** authoritative state; the active Plan's phase is
  derived/aligned to it (resolves the `project.current_step` vs plan-phase duplication).
- No execution may begin before the **Approved** commitment gate (`ADR_006`).
- Durable modules persist across all transitions (`ADR_003`).

## Dependencies

`ADR_003_ENTITY_OWNERSHIP.md`, `OPE_EVENT_LIFECYCLE.md` (the V1 back half it extends).

## Related documents

`ADR_006_TRANSITION_AUTHORITY.md`, `ADR_007_BUSINESS_OPERATIONS.md`, `OCCURRENCE_SPEC.md`,
`CURRENT_ARCHITECTURE.md`.

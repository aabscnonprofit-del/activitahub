# ADR 006 — State Transition Authority

> **Status: ACCEPTED.** Architecture Decision Record. Recovers a decision previously held only in working
> sessions. Governs the lifecycle in `ADR_005_LIFECYCLE_STATE_MACHINE.md`.

## Purpose

Define exactly **who or what** may move an event from one lifecycle state to another — separating who
*initiates* a transition from who *authorizes* it.

## Decision

**Separate initiation from authorization.** Each transition is a guarded operation with an *initiator*
(who triggers) and an *authority* (who is permitted), plus preconditions and post-effects.

**Authority roles:** Customer/Client, Organizer, AI, System, Administrator, External service (Stripe).

**Three automation classes:**
1. **System-automatic** — deterministic, reversible, internal: `Draft→Discovery`, `Open→Registration
   Closed` (deadline/capacity), `Registration Closed→In Progress` (start time), `Closed→Archived` (retention).
2. **Manual** (organizer-initiated, organizer-authorized) — `Discovery→Planning`, `Planning→Budgeting`,
   `Budgeting→Proposal`, `Approved→Ready`, `Ready→Open`, `In Progress→Completed`, On Hold.
3. **Human-mandatory, never automatic** — `Proposal→Approved` (**Customer** accepts + deposit),
   `any→Cancelled` with refund (**Organizer/Admin**), `Closed→Reopened` (**Admin**), and any **spend
   commitment** (**Organizer within authority limit**).

**Hard rules:** money/legal/outward/irreversible transitions require **explicit human authorization**;
**AI may initiate/draft/suggest but never authorizes a commitment**; **authorization ≠ payment** (the human
authorizes; the gateway confirms asynchronously); issued snapshots are immutable.

## Reasoning

The consensus of SAP-PS status authorizations, Salesforce approval processes, ServiceNow workflow gates,
Jira transition conditions/validators, and Procore commitment approvals — *automate the safe, gate the
risky.* It also enforces the platform's own PHASE0 decisions (spend authorization; irreversible outward
actions need human confirmation).

## Alternatives considered

- **One actor does everything (organizer)** — *rejected:* collapses the Customer's acceptance authority and
  the Admin's exception authority onto the organizer.
- **Let AI auto-advance commitment gates** — *rejected:* violates AI-works/human-decides and risks
  unauthorized money/legal actions.

## Consequences

- `Proposal→Approved` must be a real Customer-authorized gate (acceptance + deposit), never a value the
  system writes for itself.
- Failure handling: validation failure blocks atomically; failed payment leaves the gate closed (idempotent
  retry); rollback never undoes an issued immutable artifact.

## Dependencies

`ADR_005_LIFECYCLE_STATE_MACHINE.md`, `PHASE0_CONTRACT_DECISIONS.md` (spend authorization).

## Related documents

`ADR_007_BUSINESS_OPERATIONS.md`, `ADR_008_PUBLISH_FLOW.md`, `CONFIRMED_COMMITTED_CONTRACT.md`.

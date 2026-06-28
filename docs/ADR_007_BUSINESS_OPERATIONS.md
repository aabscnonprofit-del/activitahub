# ADR 007 — Business Operations

> **Status: ACCEPTED.** Architecture Decision Record. Recovers a decision previously held only in working
> sessions. Realizes the lifecycle (`ADR_005`) and authority (`ADR_006`) as operations.

## Purpose

Define the operational layer: every command in ActivLife Hub must have one canonical **operation** behind
it, regardless of whether it is invoked from web UI, mobile, API, AI agent, scheduler, or automation.

## Decision

**Adopt a guarded-operation / closed-command model.** Every command is exactly one server-side operation
defined by:

```
{ owner, allowed callers, policy, validation/preconditions, state guard,
  reads, writes, immutable post-effects (snapshots + events + notifications), reversibility }
```

It is **UI-independent** and **idempotent for outward effects**. The operation — not the caller surface —
owns authority, policy, validation, and immutability; nothing bypasses it.

**Governing policies:** OwnershipPolicy (RLS owner-only), StateAuthorityPolicy (`ADR_006`),
SpendAuthorizationPolicy (PHASE0), ImmutabilityPolicy (issued snapshots frozen), ScopeIntegrityPolicy
(budget lines only from real scope), RefundPolicy, IdempotencyPolicy.

**Representative operations** (each maps to exactly one lifecycle transition or entity action): CreateProject,
GeneratePlan, Replan, OpenBudget, SelectVendorQuote (*confirmed, not committed*), SendProposal,
**AcceptProposal** (Customer), CommitVendor (spend-authorized), OpenRegistration, CloseRegistration,
StartEvent, FinishEvent, CloseProject, ArchiveProject, CancelProject, **PublishProject** (`ADR_008`).

**Caller rules:** AI may invoke *initiation/draft* operations but is forbidden from `AcceptProposal`,
`AuthorizeSpend`, `CommitVendor`, `Charge/RecordPayment`, `IssueRefund`, `ReopenProject`.

## Reasoning

The SAP-BAPI / Salesforce-action / ServiceNow-rule / Jira-transition consensus: a guarded, document-producing
operation with permission + validation + post-effects, callable identically from any surface. This is the
only way to guarantee a UI/API/AI/scheduler caller cannot bypass authority or policy.

## Alternatives considered

- **Logic embedded in UI/route handlers** — *rejected:* an API/AI/scheduler caller could bypass the guards.
- **Separate "select" and "commit" collapsed into one** — *rejected:* violates SpendAuthorization (select is
  reversible/organizer; commit is human-authorized + outward).

## Consequences

- Server actions (`lib/actions/*`) are **caller surfaces** over the canonical operations, not the operations
  themselves.
- `SelectVendorQuote` (confirmed) and `CommitVendor` (committed, spend-authorized) stay distinct.
- The Project Service is the sole owner of Project operations (`resolveProjectForPlan`, `publishProject`, …).

## Dependencies

`ADR_005_LIFECYCLE_STATE_MACHINE.md`, `ADR_006_TRANSITION_AUTHORITY.md`, `PHASE0_CONTRACT_DECISIONS.md`.

## Related documents

`ADR_008_PUBLISH_FLOW.md`, `CURRENT_ARCHITECTURE.md`, `VENDOR_QUOTE_MARKETPLACE_CONTRACT.md`.

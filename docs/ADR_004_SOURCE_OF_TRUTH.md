# ADR 004 — Source of Truth

> **Status: ACCEPTED.** Architecture Decision Record. Recovers a decision previously held only in working
> sessions. Builds on `ADR_003_ENTITY_OWNERSHIP.md`.

## Purpose

Ensure every piece of information has exactly **one authoritative owner**, and define how other places may
relate to it — so there is no duplicate ownership, conflicting data, or stale copies.

## Decision

Every fact plays exactly one of **four roles**:

1. **Source of Truth** — the single record that may *write* the fact.
2. **Reference** — points at the SoT by stable id; reads only; never copies live data.
3. **Derived** — computed on read from the SoT; may be cached but is non-authoritative.
4. **Immutable snapshot** — a frozen copy taken at issue/commit time that becomes its *own* SoT for the
   issued artifact (decoupled from the still-evolving source).

**Source-of-truth map (key entries):**

| Fact | Source of Truth | Others |
|---|---|---|
| Scope + estimate | the active **Plan** | Budget Line references it |
| Pricing | the **Budget** | totals are **derived** (never stored as truth) |
| Resource/Role needs | the **Plan** | `project_delivery_components` = a **refreshable projection** of the Plan, not a second SoT |
| Vendor terms (marketplace) | the sourced result | Budget holds a **read-only snapshot** |
| Commercial Proposal | the **sent snapshot** (immutable) | the live Budget keeps changing independently |
| Contracts / Payments / Invoices | their own records (immutable) | referenced by the Project |
| Analytics | **none — fully derived** | dashboards recompute |

## Reasoning

Mature systems (Procore rollups, Primavera baselines/EVM, SAP postings, CPQ price books) all enforce
**one writer per fact + reference/derive/snapshot**. This prevents the drift that appears the moment the
same value is editable in two places.

## Alternatives considered

- **Copy data between entities** — *rejected:* guarantees drift.
- **Derive everything (no snapshots)** — *rejected:* issued documents (proposals, invoices) must freeze.
- **Treat the delivery-components table as a second source of scope** — *rejected:* it is a **projection**
  of the Plan, refreshed on (re)plan, never hand-edited.

## Consequences

- Budget **totals are derived/cached**, never authoritative (already implemented).
- Commercial Proposals, invoices, payments are **immutable snapshots** (already implemented).
- `project_delivery_components` must be treated as a **derived projection** of the active Plan.
- Same duplicate-ownership conflict as `ADR_003`: `vendor_requests`/`invoices` must reference the Project.

## Dependencies

`ADR_003_ENTITY_OWNERSHIP.md`; migrations `042/043` (budget, delivery components).

## Related documents

`CURRENT_ARCHITECTURE.md §7`, `ADR_003_ENTITY_OWNERSHIP.md`, `VENDOR_QUOTE_MARKETPLACE_CONTRACT.md`,
`BUDGET_INPUT_CONTRACT.md`.

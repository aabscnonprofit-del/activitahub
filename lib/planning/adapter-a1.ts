// Adapter A1 — EventPlanV2 -> legacy projection (Stage 3 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md and the approved Migration Roadmap.
//
// TEMPORARY. REMOVAL STAGE: end of Stage 5 (removed once every consumer — Budget, plan-review UI,
// Commercial Proposal, Public Space — reads EventPlanV2 directly).
//
// This is a PROJECTION LAYER ONLY. It is NOT a planner. It contains NO business logic, makes NO
// planning decisions, never reinterprets intention, never invents/derives/fills information. It
// only projects information that ALREADY EXISTS in EventPlanV2 into the legacy representation, and
// every projected field stays traceable back to its originating EventPlanV2 element.
//
// It imports only TYPES: the EventPlanV2 (source) and the legacy delivery-component shape (target,
// owned by the preserved Project/Budget layer). No runtime dependency on the legacy Planning Layer.

import type { ProjectDeliveryComponentInput } from '@/lib/projects/store'
import type { EventPlanV2, IntentionTrace } from './event-plan-v2'

/** A single projected legacy delivery component plus the EventPlanV2 element it came from. */
export interface ProjectedDeliveryComponent {
  component: ProjectDeliveryComponentInput
  /** Traceability back to the originating EventPlanV2 element (Spec §5 / adapter principle). */
  trace: IntentionTrace
}

/** Deterministic, information-preserving encoding of an existing label into a stable id. */
function encodeId(prefix: string, index: number, label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
  return `${prefix}-${index}-${slug}`
}

/**
 * Project the EventPlanV2's resource and role needs into the legacy delivery-component shape that
 * Budget consumes. Pure projection: one `resource_need` per EventPlanV2 resource (labelled by its
 * existing label) and one `role_need` per EventPlanV2 role (labelled by its existing role name).
 *
 * Nothing is invented or derived: `label` is the existing EventPlanV2 label; `itemId` is a
 * deterministic, reversible encoding of that label (carries no planning information); the optional
 * legacy fields (`basis`, `quantity`, `source`) are left absent because EventPlanV2 does not carry
 * them — they are NOT filled in. Every component carries the originating element's trace.
 */
export function projectDeliveryComponents(plan: EventPlanV2): ProjectedDeliveryComponent[] {
  const resources: ProjectedDeliveryComponent[] = plan.resources.map((r, i) => ({
    component: { itemKind: 'resource_need', itemId: encodeId('resource', i, r.label), label: r.label },
    trace: r.trace,
  }))
  const roles: ProjectedDeliveryComponent[] = plan.staffing.map((r, i) => ({
    component: { itemKind: 'role_need', itemId: encodeId('role', i, r.role), label: r.role },
    trace: r.trace,
  }))
  return [...resources, ...roles]
}

// Per Migration Decision A (product owner): Adapter A1 projects ONLY the delivery components that
// are strictly present in EventPlanV2. It does NOT project to the legacy PlannerInput / 6-section
// recompute seed — `category` would be a planning decision and `guestCount`/`location` are not in
// EventPlanV2. Consumers that still need PlannerInput / the legacy 6-section output are migrated to
// read EventPlanV2 directly in the appropriate later stages; no such projection exists here.

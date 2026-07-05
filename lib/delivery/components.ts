// Delivery components — the pure projection from an approved EventPlanV2 to the cost-bearing delivery
// components an organizer must deliver for the occurrence: the plan's RESOURCES (things to provide) and
// STAFFING (roles to fill). Deterministic and pure: same plan → same components, in a stable order with
// stable ids (resource:i / role:i by plan order), so per-occurrence delivery state keys attach reliably. It
// READS only the EventPlanV2 type from Planning and changes nothing there.

import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

export type DeliveryComponentKind = 'resource' | 'role'

/** One deliverable unit — a resource to provide or a role to fill. */
export interface DeliveryComponent {
  /** Stable id within the plan, used to key delivery state: `resource:<i>` / `role:<i>`. */
  id: string
  kind: DeliveryComponentKind
  /** Human label — the resource label or the role title. */
  label: string
  /** Supporting detail — the resource's moment (if any) or the role's reason. */
  detail: string
}

/** The delivery component set derived from a plan. */
export interface DeliveryComponentModel {
  components: DeliveryComponent[]
}

/**
 * Project an EventPlanV2 into its delivery components: one per resource (labelled by its label, detailed by
 * the moment it serves) then one per role (labelled by the role, detailed by its reason). Resources first,
 * then roles — a stable order matching the ids. Empty plans (no resources/staffing) yield no components.
 */
export function buildDeliveryComponentModel(plan: EventPlanV2): DeliveryComponentModel {
  const components: DeliveryComponent[] = []
  ;(plan.resources ?? []).forEach((r, i) => {
    components.push({ id: `resource:${i}`, kind: 'resource', label: r.label, detail: r.forMoment ?? '' })
  })
  ;(plan.staffing ?? []).forEach((r, i) => {
    components.push({ id: `role:${i}`, kind: 'role', label: r.role, detail: r.reason })
  })
  return { components }
}

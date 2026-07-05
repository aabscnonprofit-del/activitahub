// Project roles — the roles a project's team fills. These are NOT a new model: they are exactly the plan's
// staffing, already projected as the delivery ROLE components (buildDeliveryComponentModel). Reusing that
// single canonical projection keeps Team and Delivery on the same role source (integration, no duplication).

import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { buildDeliveryComponentModel } from '@/lib/delivery/components'

/** A project role to be filled by a team member. Its id is the delivery role component id (`role:<i>`). */
export interface ProjectRole {
  id: string
  label: string
}

/** The project's roles, projected from the plan's staffing via the shared delivery role components. */
export function projectRolesFromPlan(plan: EventPlanV2): ProjectRole[] {
  return buildDeliveryComponentModel(plan)
    .components.filter((c) => c.kind === 'role')
    .map((c) => ({ id: c.id, label: c.label }))
}

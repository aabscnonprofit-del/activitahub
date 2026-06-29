// Project → Budget Line mirroring (design Phase 2 "open-from-Project + line mirroring";
// BUDGET_INPUT_CONTRACT.md). PURE — no I/O. Maps a Project's delivery components to Budget Line
// creation specs: ONE line per `resource_need` and per `role_need`, never anything else. A WorkPackage
// is a planning container and is NEVER a Budget Line — work packages are intentionally absent from the
// input shape so they cannot be mirrored. No data is invented: only the components passed in (read by
// the caller from the canonical Project) become lines. Defines its own minimal input types so the
// Budget backend stays free of the (separately-shipped) OPE V2 modules.

import type { SourceComponentRef } from '@/lib/budget/types'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

/** A Project resource delivery component (mirrors the canonical Project's ResourceNeed: id + kind). */
export interface DeliveryResourceNeed {
  id: string
  kind: string
}

/** A Project role delivery component (mirrors the canonical Project's RoleNeed: id + role). */
export interface DeliveryRoleNeed {
  id: string
  role: string
}

/** The cost-bearing delivery components of a Project (resource_need / role_need only). */
export interface ProjectDeliveryComponents {
  resourceNeeds: DeliveryResourceNeed[]
  roleNeeds: DeliveryRoleNeed[]
}

/** A Budget Line to create: its source-component reference + the label reflected from the Project. */
export interface BudgetLineSpec {
  sourceComponentRef: SourceComponentRef
  label: string
}

/**
 * Map a Project's delivery components to Budget Line specs — one line per `resource_need` (labelled by
 * its `kind`) and per `role_need` (labelled by its `role`). WorkPackages are never included.
 * Deterministic order: resource needs first, then role needs.
 */
export function deliveryComponentLineSpecs(
  projectRef: { projectId: string; projectVersion: number },
  components: ProjectDeliveryComponents,
): BudgetLineSpec[] {
  const specs: BudgetLineSpec[] = []
  for (const rn of components.resourceNeeds) {
    specs.push({
      sourceComponentRef: {
        projectId: projectRef.projectId,
        projectVersion: projectRef.projectVersion,
        itemKind: 'resource_need',
        itemId: rn.id,
      },
      label: rn.kind,
    })
  }
  for (const role of components.roleNeeds) {
    specs.push({
      sourceComponentRef: {
        projectId: projectRef.projectId,
        projectVersion: projectRef.projectVersion,
        itemKind: 'role_need',
        itemId: role.id,
      },
      label: role.role,
    })
  }
  return specs
}

/** Deterministic, information-preserving encoding of an existing label into a stable component id. */
function encodeComponentId(prefix: string, index: number, label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
  return `${prefix}-${index}-${slug}`
}

/**
 * Stage 5a (Planning Layer Migration) — map a Planning Engine V2 plan (EventPlanV2) DIRECTLY into
 * Budget Line specs: one line per EventPlanV2 resource (`resource_need`, labelled by its label) and
 * one per role (`role_need`, labelled by its role). Budget CONSUMES the planning result here; it
 * performs no planning. Deterministic order: resources first, then roles.
 */
export function eventPlanLineSpecs(
  projectRef: { projectId: string; projectVersion: number },
  plan: EventPlanV2,
): BudgetLineSpec[] {
  const specs: BudgetLineSpec[] = []
  plan.resources.forEach((r, i) => {
    specs.push({
      sourceComponentRef: {
        projectId: projectRef.projectId,
        projectVersion: projectRef.projectVersion,
        itemKind: 'resource_need',
        itemId: encodeComponentId('resource', i, r.label),
      },
      label: r.label,
    })
  })
  plan.staffing.forEach((r, i) => {
    specs.push({
      sourceComponentRef: {
        projectId: projectRef.projectId,
        projectVersion: projectRef.projectVersion,
        itemKind: 'role_need',
        itemId: encodeComponentId('role', i, r.role),
      },
      label: r.role,
    })
  })
  return specs
}

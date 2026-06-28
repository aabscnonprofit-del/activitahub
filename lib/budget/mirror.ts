// Project → Budget Line mirroring (design Phase 2 "open-from-Project + line mirroring";
// BUDGET_INPUT_CONTRACT.md). PURE — no I/O. Maps a Project's delivery components to Budget Line
// creation specs: ONE line per `resource_need` and per `role_need`, never anything else. A WorkPackage
// is a planning container and is NEVER a Budget Line — work packages are intentionally absent from the
// input shape so they cannot be mirrored. No data is invented: only the components passed in (read by
// the caller from the canonical Project) become lines. Defines its own minimal input types so the
// Budget backend stays free of the (separately-shipped) OPE V2 modules.

import type { SourceComponentRef } from '@/lib/budget/types'

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

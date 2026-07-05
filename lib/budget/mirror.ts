// Project → Budget Line mirroring (design Phase 2 "open-from-Project + line mirroring";
// BUDGET_INPUT_CONTRACT.md). PURE — no I/O. Maps a Planning Engine V2 plan (EventPlanV2) to Budget Line
// creation specs: ONE line per `resource_need` (the plan's resources) and per `role_need` (its staffing),
// never anything else. A WorkPackage is a planning container and is NEVER a Budget Line. No data is
// invented: only the plan's resources/roles become lines. Budget CONSUMES the planning result; it plans
// nothing.

import type { SourceComponentRef } from '@/lib/budget/types'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

/** A Budget Line to create: its source-component reference + the label reflected from the Project. */
export interface BudgetLineSpec {
  sourceComponentRef: SourceComponentRef
  label: string
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

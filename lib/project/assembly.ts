// OPE V2 — Module 3: Project Assembly — the assembler (Step 3).
//
// The deterministic transform:
//   assembleProject(ir) → Project | ProjectRefusal   (total, deterministic, never throws)
//
// Verifies the IR first (Step 2), then performs the v1 transform (one work package per requirement,
// lifted+ordered dependency graph, sequenced relative timeline, root carry-through of needs/risks/
// cost), and validates the final Project. At this step there are NO events, NO persistence, NO
// Workspace, NO Marketplace, NO Execution.
//
// Boundary: imports only the IR data contract (types) and Module 3's own verify/validation layers.
// Does NOT import the OPE engine, provider, registry, frozen-engine adapter, or the frozen engine.

import type { ImplementationRequirements, Phase } from '@/lib/ope-engine/types'
import { validateProject } from './project'
import { verifyIr } from './verify'
import {
  PROJECT_VERSION,
  WORK_PACKAGE_NAME_MAX,
  type Project,
  type ProjectDependency,
  type ProjectRefusal,
  type TimelinePhase,
  type WorkPackage,
} from './types'

/** Canonical phase order for the timeline. */
const PHASE_ORDER: Phase[] = ['preparation', 'day_of', 'after']

const wpId = (requirementId: string) => `wp-${requirementId}`

/** Defensive deep copy of carried IR data (plain JSON) so the Project never aliases the input IR. */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Normalize a requirement description into a WorkPackage name: trim, collapse whitespace, ≤120 chars. */
function normalizeName(description: string): string {
  const n = description.trim().replace(/\s+/g, ' ')
  return n.length > WORK_PACKAGE_NAME_MAX ? n.slice(0, WORK_PACKAGE_NAME_MAX).trimEnd() : n
}

/** Deterministic topological order; ties broken by WorkPackage id ascending. Assumes acyclic (verified). */
function deterministicTopoOrder(ids: string[], edges: ProjectDependency[]): string[] {
  const indeg = new Map(ids.map((id) => [id, 0]))
  const adj = new Map(ids.map((id) => [id, [] as string[]]))
  for (const e of edges) {
    if (!adj.has(e.fromWorkPackageId) || !indeg.has(e.toWorkPackageId)) continue
    adj.get(e.fromWorkPackageId)!.push(e.toWorkPackageId)
    indeg.set(e.toWorkPackageId, indeg.get(e.toWorkPackageId)! + 1)
  }
  const order: string[] = []
  let ready = ids.filter((id) => indeg.get(id) === 0).sort()
  while (ready.length) {
    const n = ready.shift()!
    order.push(n)
    const newly: string[] = []
    for (const m of adj.get(n)!) {
      const d = indeg.get(m)! - 1
      indeg.set(m, d)
      if (d === 0) newly.push(m)
    }
    if (newly.length) ready = [...ready, ...newly].sort()
  }
  return order
}

/** Narrow an assembleProject result to a refusal. */
export function isProjectRefusal(r: Project | ProjectRefusal): r is ProjectRefusal {
  return 'reason' in r
}

/**
 * Assemble a Project from an IR. TOTAL: returns a `Project` or a typed `ProjectRefusal`; never throws.
 * Deterministic: identical IR → identical Project (stable ids/order/names/createdAt; no clock).
 */
export function assembleProject(ir: unknown): Project | ProjectRefusal {
  // 1. Verify the IR before assembling (invalid_ir / ir_not_current / unstructurable_requirements).
  const verified = verifyIr(ir)
  if (!verified.ok) return verified.refusal

  try {
    const r = ir as ImplementationRequirements

    // 2. One WorkPackage per Requirement (v1 rule).
    const workPackages: WorkPackage[] = r.requirements.map((req) => ({
      id: wpId(req.id),
      name: normalizeName(req.description),
      phase: req.phase,
      requirementIds: [req.id],
      dependsOn: [], // filled after the lift
      derivedFrom: clone(req.derivedFrom),
    }))
    const wpIdSet = new Set(workPackages.map((w) => w.id))
    const byId = new Map(workPackages.map((w) => [w.id, w]))

    // 3. Lift requirement dependencies → work-package edges; drop self-edges; keep only edges
    //    between existing packages.
    const edges: ProjectDependency[] = []
    for (const d of r.dependencies) {
      if (d.fromRequirementId === d.toRequirementId) continue
      const from = wpId(d.fromRequirementId)
      const to = wpId(d.toRequirementId)
      if (!wpIdSet.has(from) || !wpIdSet.has(to)) continue
      edges.push({ fromWorkPackageId: from, toWorkPackageId: to, type: d.type })
    }

    // 4. dependsOn per package (sorted, unique).
    for (const wp of workPackages) {
      wp.dependsOn = [...new Set(edges.filter((e) => e.toWorkPackageId === wp.id).map((e) => e.fromWorkPackageId))].sort()
    }

    // 5. Deterministic topological order.
    const order = deterministicTopoOrder([...wpIdSet], edges)

    // 6. TimelinePlan: phases present among work packages, in canonical order.
    const phases: TimelinePhase[] = PHASE_ORDER
      .filter((ph) => workPackages.some((w) => w.phase === ph))
      .map((ph) => ({
        phase: ph,
        workPackageIds: order.filter((id) => byId.get(id)!.phase === ph),
        relativeWindow: r.timeline.find((t) => t.phase === ph)?.relativeWindow ?? null,
      }))

    // 7. Assemble the Project — carry needs/risks/cost unchanged at the root; fixed identity.
    const project: Project = {
      project_id: `proj-${r.ir_id}-${r.version}`,
      version: PROJECT_VERSION,
      status: 'assembled',
      irRef: { id: r.ir_id, version: r.version },
      fedRef: { id: r.fedRef.fedId, version: r.fedRef.fedVersion },
      workPackages,
      dependencyGraph: { edges, order },
      timeline: { phases },
      resourceNeeds: clone(r.resourceNeeds),
      roleNeeds: clone(r.roleNeeds),
      risks: clone(r.risks),
      costSummary: clone(r.costEstimate),
      createdAt: r.createdAt,
    }

    // 8. Validate the assembled Project. A verified IR should always yield a valid Project; a
    //    failure (e.g. duplicate requirement ids colliding under the 1:1 id rule) is reported as
    //    `unstructurable_requirements`.
    const v = validateProject(project)
    if (!v.valid) return { reason: 'unstructurable_requirements', message: `assembled Project failed validation: ${v.errors.join('; ')}` }

    return project
  } catch {
    // Total: a verified IR should never reach here, but assembly never throws to the caller.
    return { reason: 'unstructurable_requirements', message: 'assembly error' }
  }
}

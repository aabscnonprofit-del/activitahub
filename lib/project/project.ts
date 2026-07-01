// OPE V2 — Module 3: Project Assembly — Project structural validators (Step 1).
//
// STRUCTURAL validation only (well-formedness + internal consistency of a Project object). NO
// business logic, NO assembly, NO dependency lifting, NO timeline computation, NO grouping. These
// validators verify a *provided* Project is well-formed; they do not build one. Deterministic.

import { COST_ESTIMATE_STATUSES, DEPENDENCY_TYPES, PHASES, PROVENANCE_SOURCES } from '@/lib/ope-engine/types'
import {
  PROJECT_REFUSAL_REASONS,
  PROJECT_STATUSES,
  PROJECT_VERSION,
  WORK_PACKAGE_NAME_MAX,
  type Project,
  type ProjectDependency,
  type ProjectReference,
  type ProjectRefusal,
  type TimelinePlan,
  type WorkPackage,
} from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isInteger = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

/** Validate a `{ id, version }` reference. */
export function validateProjectReference(ref: ProjectReference, where: string): string[] {
  const errors: string[] = []
  if (!isNonEmptyString(ref?.id)) errors.push(`${where}.id: required`)
  if (!isInteger(ref?.version) || ref.version < 1) errors.push(`${where}.version: integer ≥ 1`)
  return errors
}

/** Validate a single dependency edge (shape only; cross-references checked in validateProject). */
export function validateProjectDependency(dep: ProjectDependency, where: string): string[] {
  const errors: string[] = []
  if (!isNonEmptyString(dep?.fromWorkPackageId)) errors.push(`${where}.fromWorkPackageId: required`)
  if (!isNonEmptyString(dep?.toWorkPackageId)) errors.push(`${where}.toWorkPackageId: required`)
  if (!DEPENDENCY_TYPES.includes(dep?.type)) errors.push(`${where}.type: must be finish_to_start|requires`)
  if (isNonEmptyString(dep?.fromWorkPackageId) && dep.fromWorkPackageId === dep.toWorkPackageId) {
    errors.push(`${where}: self-edge not allowed`)
  }
  return errors
}

/** Validate a WorkPackage (shape only; cross-references checked in validateProject). */
export function validateWorkPackage(wp: WorkPackage, where: string): string[] {
  const errors: string[] = []
  if (!isNonEmptyString(wp?.id)) errors.push(`${where}.id: required`)
  if (!isNonEmptyString(wp?.name)) errors.push(`${where}.name: required`)
  else if (wp.name.length > WORK_PACKAGE_NAME_MAX) errors.push(`${where}.name: exceeds ${WORK_PACKAGE_NAME_MAX} chars`)
  if (!PHASES.includes(wp?.phase)) errors.push(`${where}.phase: must be preparation|day_of|after`)

  if (!Array.isArray(wp?.requirementIds) || wp.requirementIds.length !== 1) {
    errors.push(`${where}.requirementIds: must contain exactly one requirement id (v1)`)
  } else if (!isNonEmptyString(wp.requirementIds[0])) {
    errors.push(`${where}.requirementIds[0]: required`)
  }

  if (!Array.isArray(wp?.dependsOn)) errors.push(`${where}.dependsOn: required (may be empty)`)
  else wp.dependsOn.forEach((d, i) => { if (!isNonEmptyString(d)) errors.push(`${where}.dependsOn[${i}]: required`) })

  if (!Array.isArray(wp?.derivedFrom) || wp.derivedFrom.length < 1) {
    errors.push(`${where}.derivedFrom: required, must contain ≥1 provenance reference`)
  } else {
    wp.derivedFrom.forEach((p, i) => {
      if (!isInteger(p?.fedVersion) || p.fedVersion < 1) errors.push(`${where}.derivedFrom[${i}].fedVersion: integer ≥ 1`)
      if (!PROVENANCE_SOURCES.includes(p?.source)) errors.push(`${where}.derivedFrom[${i}].source: invalid`)
    })
  }
  return errors
}

/** Validate the TimelinePlan against the set of known WorkPackage ids and their phases. */
export function validateTimelinePlan(timeline: TimelinePlan, wpById: Map<string, WorkPackage>): string[] {
  const errors: string[] = []
  if (!timeline || !Array.isArray(timeline.phases) || timeline.phases.length < 1) {
    errors.push('timeline.phases: required, must contain ≥1 phase')
    return errors
  }
  const seen: string[] = []
  timeline.phases.forEach((p, i) => {
    if (!PHASES.includes(p?.phase)) errors.push(`timeline.phases[${i}].phase: invalid`)
    if (!Array.isArray(p?.workPackageIds)) {
      errors.push(`timeline.phases[${i}].workPackageIds: required`)
    } else {
      p.workPackageIds.forEach((id) => {
        const wp = wpById.get(id)
        if (!wp) errors.push(`timeline.phases[${i}]: references unknown work package '${id}'`)
        else if (wp.phase !== p.phase) errors.push(`timeline.phases[${i}]: '${id}' phase '${wp.phase}' ≠ timeline phase '${p.phase}'`)
        seen.push(id)
      })
    }
    if (p?.relativeWindow != null && typeof p.relativeWindow !== 'string') {
      errors.push(`timeline.phases[${i}].relativeWindow: Text or null`)
    }
  })
  if (new Set(seen).size !== seen.length) errors.push('timeline: a work package appears in more than one phase')
  if (new Set(seen).size !== wpById.size) errors.push('timeline: must cover every work package exactly once')
  return errors
}

/** Validate a ProjectRefusal. */
export function validateProjectRefusal(r: ProjectRefusal): ValidationResult {
  const errors: string[] = []
  if (!PROJECT_REFUSAL_REASONS.includes(r?.reason)) errors.push('refusal.reason: must be one of the ProjectRefusalReason values')
  if (r?.message != null && typeof r.message !== 'string') errors.push('refusal.message: Text when present')
  return { valid: errors.length === 0, errors }
}

/**
 * Structural validation of a Project (§9): required fields, fixed identity, enums, work-package
 * partition (1:1), dependency-graph integrity (edges reference existing packages, no self-edge,
 * `order` is a topological permutation), timeline coverage/consistency, and carried-content
 * presence. Deterministic; no business logic.
 */
export function validateProject(project: Project): ValidationResult {
  const errors: string[] = []
  const p = project

  if (!isNonEmptyString(p?.project_id)) errors.push('project_id: required')
  if (p?.version !== PROJECT_VERSION) errors.push(`version: must be ${PROJECT_VERSION}`)
  if (!PROJECT_STATUSES.includes(p?.status)) errors.push("status: must be 'assembled'")
  if (!isNonEmptyString(p?.createdAt)) errors.push('createdAt: required')
  errors.push(...validateProjectReference(p?.irRef ?? ({} as ProjectReference), 'irRef'))
  errors.push(...validateProjectReference(p?.fedRef ?? ({} as ProjectReference), 'fedRef'))

  // Work packages + partition (1:1).
  const wpById = new Map<string, WorkPackage>()
  const allReqIds: string[] = []
  if (!Array.isArray(p?.workPackages) || p.workPackages.length < 1) {
    errors.push('workPackages: required, must contain ≥1 work package')
  } else {
    p.workPackages.forEach((wp, i) => {
      errors.push(...validateWorkPackage(wp, `workPackages[${i}]`))
      if (isNonEmptyString(wp?.id)) {
        if (wpById.has(wp.id)) errors.push(`workPackages: duplicate work package id '${wp.id}'`)
        wpById.set(wp.id, wp)
      }
      if (Array.isArray(wp?.requirementIds)) allReqIds.push(...wp.requirementIds)
    })
    if (new Set(allReqIds).size !== allReqIds.length) errors.push('partition: a requirement is assigned to more than one work package')
    // dependsOn references must point to existing packages.
    p.workPackages.forEach((wp, i) => {
      ;(wp?.dependsOn ?? []).forEach((d) => { if (!wpById.has(d)) errors.push(`workPackages[${i}].dependsOn: unknown work package '${d}'`) })
    })
  }

  // Dependency graph integrity.
  const graph = p?.dependencyGraph
  if (!graph || !Array.isArray(graph.edges) || !Array.isArray(graph.order)) {
    errors.push('dependencyGraph: edges and order are required')
  } else {
    graph.edges.forEach((e, i) => {
      errors.push(...validateProjectDependency(e, `dependencyGraph.edges[${i}]`))
      if (isNonEmptyString(e?.fromWorkPackageId) && !wpById.has(e.fromWorkPackageId)) errors.push(`dependencyGraph.edges[${i}].fromWorkPackageId: unknown work package`)
      if (isNonEmptyString(e?.toWorkPackageId) && !wpById.has(e.toWorkPackageId)) errors.push(`dependencyGraph.edges[${i}].toWorkPackageId: unknown work package`)
    })
    // order must be a permutation of all work-package ids.
    const orderSet = new Set(graph.order)
    if (graph.order.length !== wpById.size || orderSet.size !== graph.order.length || ![...wpById.keys()].every((id) => orderSet.has(id))) {
      errors.push('dependencyGraph.order: must be a permutation of all work package ids')
    } else {
      // order must be topologically consistent with edges (catches non-topological order AND cycles).
      const pos = new Map(graph.order.map((id, i) => [id, i] as const))
      graph.edges.forEach((e, i) => {
        const from = pos.get(e?.fromWorkPackageId)
        const to = pos.get(e?.toWorkPackageId)
        if (from != null && to != null && from >= to) errors.push(`dependencyGraph: edges[${i}] violates the topological order (order inconsistent or cyclic)`)
      })
    }
  }

  // Timeline coverage / consistency.
  errors.push(...validateTimelinePlan(p?.timeline as TimelinePlan, wpById))

  // Carried content presence (deep content was validated by Module 2 at IR production).
  if (!Array.isArray(p?.resourceNeeds)) errors.push('resourceNeeds: required (may be empty)')
  if (!Array.isArray(p?.roleNeeds)) errors.push('roleNeeds: required (may be empty)')
  if (!Array.isArray(p?.risks)) errors.push('risks: required (may be empty)')
  if (!p?.costSummary || !COST_ESTIMATE_STATUSES.includes(p.costSummary.status)) errors.push('costSummary: required, status must be estimated|unpriced')

  return { valid: errors.length === 0, errors }
}

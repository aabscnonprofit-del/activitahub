// OPE V2 — Module 3 (Project) domain — Criticality derivation (PHASE0 Decision 2).
//
// A deterministic, read-only DERIVED annotation over an immutable Project — NOT a stored field on
// the Project or IR (M2/M3 contracts unchanged). Pure function: same Project → identical annotation.
// Owned by the Project-Assembly domain (here); CONSUMED by Module 4 (Workspace) and later Module 6.
// Module 4 never recalculates it — it calls this producer.
//
// Model (PHASE0 Decision 2): ALH has no durations (relative timeline), so each work package has unit
// weight; the critical path is the longest dependency chain; float is graph-depth slack. Robust to
// sparse graphs (a thin graph → short path / high float, which is correct information). Risk-tied
// `core` is deferred until the IR links risks↔requirements (M3 §13); in v1, `core` = the critical
// path (float 0).

import type { Project } from './types'

export type CriticalityLevel = 'core' | 'high' | 'normal' | 'optional'

export interface WorkPackageCriticality {
  level: CriticalityLevel
  /** Graph-depth slack before this work package would extend the longest chain. 0 = on the path. */
  float: number
}

export interface CriticalityAnnotation {
  /** One deterministic longest chain through the work-package DAG. */
  criticalPath: string[]
  perWorkPackage: Record<string, WorkPackageCriticality>
  /** The `level = core` set (float 0). */
  criticalCore: string[]
  computedFrom: { projectId: string }
}

/** Deterministic critical-path/float/criticality annotation over an immutable Project. */
export function computeCriticality(project: Project): CriticalityAnnotation {
  const ids = project.workPackages.map((w) => w.id)
  const idSet = new Set(ids)

  const succ = new Map<string, string[]>()
  const pred = new Map<string, string[]>()
  for (const id of ids) { succ.set(id, []); pred.set(id, []) }
  for (const e of project.dependencyGraph.edges) {
    if (!idSet.has(e.fromWorkPackageId) || !idSet.has(e.toWorkPackageId)) continue
    succ.get(e.fromWorkPackageId)!.push(e.toWorkPackageId)
    pred.get(e.toWorkPackageId)!.push(e.fromWorkPackageId)
  }

  // Process in the Project's validated topological order (edges always go earlier→later).
  const order = project.dependencyGraph.order.filter((id) => idSet.has(id))

  // Forward pass — earliest start/finish with unit duration.
  const ES = new Map<string, number>()
  const EF = new Map<string, number>()
  for (const n of order) {
    const es = Math.max(0, ...pred.get(n)!.map((p) => EF.get(p) ?? 0))
    ES.set(n, es)
    EF.set(n, es + 1)
  }
  const L = Math.max(0, ...ids.map((n) => EF.get(n) ?? 0))

  // Backward pass — latest start/finish.
  const LS = new Map<string, number>()
  for (const n of [...order].reverse()) {
    const succs = succ.get(n)!
    const lf = succs.length ? Math.min(...succs.map((s) => LS.get(s) ?? L)) : L
    LS.set(n, lf - 1)
  }

  const perWorkPackage: Record<string, WorkPackageCriticality> = {}
  const criticalCore: string[] = []
  for (const n of ids) {
    const f = (LS.get(n) ?? 0) - (ES.get(n) ?? 0)
    const hasSucc = (succ.get(n)?.length ?? 0) > 0
    let level: CriticalityLevel
    if (f === 0) { level = 'core'; criticalCore.push(n) }            // on the critical path
    else if (!hasSucc) level = 'optional'                            // leaf with no dependents
    else if (f <= 1) level = 'high'                                  // near-zero float
    else level = 'normal'
    perWorkPackage[n] = { level, float: f }
  }

  return {
    criticalPath: reconstructCriticalPath(order, EF, pred, perWorkPackage),
    perWorkPackage,
    criticalCore,
    computedFrom: { projectId: project.project_id },
  }
}

/** Reconstruct one deterministic longest chain of float-0 nodes (tie-break by id ascending). */
function reconstructCriticalPath(
  order: string[],
  EF: Map<string, number>,
  pred: Map<string, string[]>,
  per: Record<string, WorkPackageCriticality>,
): string[] {
  const zero = order.filter((n) => per[n]?.level === 'core')
  if (!zero.length) return []
  const maxEF = Math.max(...zero.map((n) => EF.get(n)!))
  let cur = zero.filter((n) => EF.get(n) === maxEF).sort()[0]
  const path = [cur]
  for (;;) {
    const es = EF.get(cur)! - 1
    const preds = (pred.get(cur) ?? []).filter((p) => per[p]?.level === 'core' && EF.get(p) === es).sort()
    if (!preds.length) break
    cur = preds[0]
    path.push(cur)
  }
  return path.reverse()
}

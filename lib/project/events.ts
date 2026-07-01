// OPE V2 — Module 3: Project Assembly — logical assembly events (Step 4).
//
// A wrapper around assembleProject that records the logical OPE V2 domain events (§8). It calls
// assembleProject EXACTLY ONCE and maps its outcome to events — it does NOT re-implement, change, or
// observe the internals of verification or assembly. Events are in-memory and returned with the
// result: NO queues, buses, transports, or persistence. `assembleProject` behaviour, the Project
// shape, verification logic, and assembly logic are all unchanged.
//
// Boundary: imports only Module 3's own assembler + domain types. Does NOT create Workspace,
// Marketplace requests, or Execution tracking; does NOT import the frozen engine or modify Module 2.

import { assembleProject, isProjectRefusal } from './assembly'
import type { Project, ProjectEvent, ProjectEventType, ProjectRefusal } from './types'

/** assembleProject's result, plus the logical events emitted around it. */
export interface AssembleWithEventsResult {
  result: Project | ProjectRefusal
  events: ProjectEvent[]
}

/** Best-effort `{ id, version }` for events, when the input is IR-shaped (no throw). */
function irRefOf(ir: unknown): { id: string; version: number } | undefined {
  if (ir && typeof ir === 'object') {
    const o = ir as Record<string, unknown>
    if (typeof o.ir_id === 'string' && typeof o.version === 'number') return { id: o.ir_id, version: o.version }
  }
  return undefined
}

/**
 * Assemble a Project and emit the logical domain events around it. TOTAL and deterministic — same
 * input (and `opts.at`) yields the same `{ result, events }`. `result` is exactly what
 * `assembleProject(ir)` returns (unchanged).
 *
 * Event flow (each emitted exactly once):
 *   - always `project.requested` first
 *   - refusal `invalid_ir` / `ir_not_current`   → `project.ir_rejected`
 *   - refusal `unstructurable_requirements`      → `project.assembly_failed`
 *   - success → `project.work_packages_built` → `project.dependencies_resolved` → `project.assembled`
 */
export function assembleProjectWithEvents(ir: unknown, opts: { at?: string } = {}): AssembleWithEventsResult {
  const events: ProjectEvent[] = []
  const at = opts.at ?? ''
  const irRef = irRefOf(ir)
  const base = irRef ? { irRef } : {}
  const emit = (type: ProjectEventType, payload?: Record<string, unknown>): void => {
    events.push({ type, at, ...(payload && Object.keys(payload).length ? { payload } : {}) })
  }

  emit('project.requested', { ...base })

  const result = assembleProject(ir)

  if (isProjectRefusal(result)) {
    const reason = result.reason
    if (reason === 'invalid_ir' || reason === 'ir_not_current') {
      emit('project.ir_rejected', { ...base, reason })
    } else {
      // unstructurable_requirements (e.g. a dependency cycle) → assembly failed.
      emit('project.assembly_failed', { ...base, reason })
    }
    return { result, events }
  }

  const projectId = result.project_id
  emit('project.work_packages_built', { ...base, projectId, workPackageCount: result.workPackages.length })
  emit('project.dependencies_resolved', { ...base, projectId, edgeCount: result.dependencyGraph.edges.length })
  emit('project.assembled', { ...base, projectId })
  return { result, events }
}

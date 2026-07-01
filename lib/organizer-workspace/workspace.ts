// OPE V2 — Module 4: Organizer Workspace — Foundation logic (Phase 1).
//
// Implements ONLY the Workspace Foundation: open from an immutable Project, create the initial
// append-only lineage (v1), load (immutability-guaranteed), basic activity state (status), consume
// criticality, and an append-only change journal. Verify-don't-trust at open. The Project snapshot
// is deep-frozen so the Workspace can NEVER modify the Project. No marketplace/procurement/comms/
// documents/payments/AI/enterprise/portfolio/learning/execution/notifications.
//
// Boundary: imports only the Project contract from lib/project (types, validateProject,
// computeCriticality). Never imports the OPE engine/provider/contract or the frozen engine.

import { validateProject } from '@/lib/project/project'
import { computeCriticality } from '@/lib/project/criticality'
import { PROJECT_VERSION, type Project } from '@/lib/project/types'
import {
  ACTIVITY_STATUSES,
  DECIDER_KINDS,
  GATE_DECISION_OUTCOMES,
  REPLAN_TRIGGERS,
  WORKSPACE_PHASES,
  type ActivityState,
  type ActivityStatus,
  type Gate,
  type JournalEntry,
  type LineageEntry,
  type OperationResult,
  type ReplanTrigger,
  type Workspace,
  type WorkspaceRefusal,
} from './types'

// ── Immutability helpers ────────────────────────────────────────────────────────────────

/** Deep clone of plain JSON data (the Project is plain data). */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Recursively freeze an object so the Workspace can never mutate the Project snapshot. */
function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v)
    for (const k of Object.keys(v as Record<string, unknown>)) deepFreeze((v as Record<string, unknown>)[k])
  }
  return v
}

/** Narrow an open result to a refusal. */
export function isWorkspaceRefusal(r: Workspace | WorkspaceRefusal): r is WorkspaceRefusal {
  return 'reason' in r
}

/**
 * Verify a Project is well-formed and assembled (verify-don't-trust); else a typed refusal.
 *
 * Check order makes both M4 §4.3 reasons reachable: a basic shape guard catches malformed input
 * (`invalid_project`); a well-formed-but-not-assembled Project is then distinguished
 * (`project_not_assembled`) *before* full structural validation (which would otherwise subsume it,
 * since M3's validateProject already enforces status='assembled' && version=1); finally full
 * structural validation catches any remaining structural breakage (`invalid_project`).
 */
function verifyProject(project: Project): WorkspaceRefusal | null {
  if (!project || typeof project !== 'object' || !Array.isArray((project as { workPackages?: unknown }).workPackages)) {
    return { reason: 'invalid_project', message: 'input is not a well-formed Project' }
  }
  if (project.status !== 'assembled' || project.version !== PROJECT_VERSION) {
    return { reason: 'project_not_assembled', message: `status=${project.status}, version=${project.version}` }
  }
  const v = validateProject(project)
  if (!v.valid) return { reason: 'invalid_project', message: v.errors.join('; ') }
  return null
}

function seedActivityStates(project: Project, at: string): ActivityState[] {
  return project.workPackages.map((w) => ({ workPackageId: w.id, status: 'not_started', updatedAt: at }))
}

/**
 * The Go / No-Go gates seeded at open (Phase 2). The canonical, mandated gate is the human go/no-go
 * required before the Workspace may enter `ready` (M4 spec / PHASE0). Undecided at open.
 */
export function seedGates(): Gate[] {
  return [{ id: 'go_no_go', name: 'Go / No-Go (ready for execution)', guardsPhase: 'ready', required: true, decision: null }]
}

// ── 1–2. Open a Workspace from an immutable Project + create the initial lineage (v1) ───────

/**
 * Open a Workspace from an assembled Project. Verifies the Project (refuses otherwise), snapshots it
 * IMMUTABLY (deep-frozen), seeds one activity state per work package, creates the **origin lineage
 * entry (v1, current, no supersedes, no trigger)**, consumes the criticality annotation, and writes
 * the opening journal entry. TOTAL: returns a Workspace or a typed WorkspaceRefusal; never throws.
 * Deterministic: no clock (caller supplies `at`; defaults to the Project's createdAt).
 */
export function openWorkspace(
  project: Project,
  opts: { workspaceId?: string; at?: string; openedBy?: string } = {},
): Workspace | WorkspaceRefusal {
  const refusal = verifyProject(project)
  if (refusal) return refusal

  const at = opts.at ?? project.createdAt
  const workspace_id = opts.workspaceId ?? `ws-${project.project_id}`
  const projectRef = { projectId: project.project_id, version: project.version }

  const origin: LineageEntry = {
    lineageVersion: 1,
    projectRef,
    irRef: { id: project.irRef.id, version: project.irRef.version },
    fedRef: { id: project.fedRef.id, version: project.fedRef.version },
    supersedes: null,
    trigger: null,
    reason: 'initial assembly',
    status: 'current',
    createdAt: at,
  }

  return {
    workspace_id,
    projectRef,
    project: deepFreeze(clone(project)), // immutable snapshot — the Workspace never modifies the Project
    phase: 'planning',
    gates: seedGates(),
    lineage: [origin],
    activityStates: seedActivityStates(project, at),
    criticality: computeCriticality(project), // consumed from the Project domain; never recalculated here
    journal: [{ seq: 1, type: 'workspace.opened', at, payload: { workspaceId: workspace_id, projectRef, lineageVersion: 1, openedBy: opts.openedBy ?? null } }],
    createdAt: at,
  }
}

// ── 3. Load a Workspace (references the Project; never modifies it) ─────────────────────────

/**
 * Load/rehydrate a Workspace, guaranteeing the Project snapshot is immutable. Persistence is logical
 * and deferred in Phase 1; this is the immutability-preserving accessor (re-freeze is idempotent).
 */
export function loadWorkspace(workspace: Workspace): Workspace {
  return { ...workspace, project: deepFreeze(workspace.project) }
}

/** Read-only access to the immutable Project snapshot. */
export function getProject(workspace: Workspace): Project {
  return workspace.project
}

// ── 5. Basic activity state — set status (overlay only; never touches the Project) ─────────

/** Set an activity's working status. Overlay-only, append-only journal; never modifies the Project. */
export function setActivityStatus(
  workspace: Workspace,
  activityId: string,
  status: ActivityStatus,
  at = '',
): OperationResult {
  if (workspace.phase === 'ready') return { ok: false, rejection: { reason: 'phase_locked', message: 'workspace is frozen at ready; overlay edits are not allowed' } }
  if (!ACTIVITY_STATUSES.includes(status)) return { ok: false, rejection: { reason: 'invalid_status', message: String(status) } }
  const idx = workspace.activityStates.findIndex((a) => a.workPackageId === activityId)
  if (idx < 0) return { ok: false, rejection: { reason: 'unknown_activity', message: activityId } }

  const activityStates = workspace.activityStates.map((a, i) => (i === idx ? { ...a, status, updatedAt: at } : a))
  const entry: JournalEntry = { seq: workspace.journal.length + 1, type: 'activity.status_changed', at, payload: { activityId, status } }
  return { ok: true, workspace: { ...workspace, activityStates, journal: [...workspace.journal, entry] }, journal: [entry] }
}

// ── 4. Append-only lineage primitive (PHASE0 Decision 1) ───────────────────────────────────

/**
 * Append a new lineage entry for a re-planned Project. APPEND-ONLY: no entry is removed; the prior
 * `current` entry's identity data is preserved and only its `status` transitions `current →
 * superseded` (the monotonic transition PHASE0 Decision 1 defines). The new entry references the new
 * Project, `supersedes` the prior version, and carries a re-plan `trigger`. The overlay rebinds to
 * the new current Project with fresh activity states + freshly-consumed criticality (overlay
 * MIGRATION — copying prior status forward — is a later phase). Verify-don't-trust the new Project.
 */
export function appendLineageEntry(
  workspace: Workspace,
  newProject: Project,
  opts: { trigger: ReplanTrigger; reason: string; at?: string },
): OperationResult {
  const refusal = verifyProject(newProject)
  if (refusal) return { ok: false, rejection: { reason: refusal.reason, message: refusal.message } }
  if (!REPLAN_TRIGGERS.includes(opts.trigger)) return { ok: false, rejection: { reason: 'invalid_trigger', message: String(opts.trigger) } }

  const at = opts.at ?? newProject.createdAt
  const current = workspace.lineage.find((e) => e.status === 'current') ?? null
  const newVersion = Math.max(...workspace.lineage.map((e) => e.lineageVersion)) + 1
  const projectRef = { projectId: newProject.project_id, version: newProject.version }

  // Append-only: supersede the prior current (status transition only; identity data untouched).
  const superseded = workspace.lineage.map((e) => (e.status === 'current' ? { ...e, status: 'superseded' as const } : e))
  const entry: LineageEntry = {
    lineageVersion: newVersion,
    projectRef,
    irRef: { id: newProject.irRef.id, version: newProject.irRef.version },
    fedRef: { id: newProject.fedRef.id, version: newProject.fedRef.version },
    supersedes: current?.lineageVersion ?? null,
    trigger: opts.trigger,
    reason: opts.reason,
    status: 'current',
    createdAt: at,
  }

  const jentry: JournalEntry = { seq: workspace.journal.length + 1, type: 'lineage.appended', at, payload: { lineageVersion: newVersion, supersedes: entry.supersedes, trigger: opts.trigger } }
  const next: Workspace = {
    ...workspace,
    projectRef,
    project: deepFreeze(clone(newProject)),
    // A re-plan restarts the lifecycle for the new plan: fresh overlay, back to `planning`, and
    // fresh gates (a prior go/no-go approval is stale once the plan changed). Overlay MIGRATION
    // (copying status/decisions forward) is a later phase. Non-destructive to the append-only lineage.
    phase: 'planning',
    gates: seedGates(),
    activityStates: seedActivityStates(newProject, at),
    criticality: computeCriticality(newProject),
    lineage: [...superseded, entry],
    journal: [...workspace.journal, jentry],
  }
  return { ok: true, workspace: next, journal: [jentry] }
}

// ── Structural validation (integrity check; deterministic) ────────────────────────────────

export interface WorkspaceValidationResult { valid: boolean; errors: string[] }

/** Structural integrity of a Workspace: one activity per work package, ≤1 current lineage, etc. */
export function validateWorkspace(workspace: Workspace): WorkspaceValidationResult {
  const errors: string[] = []
  const w = workspace
  if (typeof w?.workspace_id !== 'string' || !w.workspace_id) errors.push('workspace_id: required')
  if (typeof w?.createdAt !== 'string' || !w.createdAt) errors.push('createdAt: required')
  if (w?.phase !== 'planning' && w?.phase !== 'preparation' && w?.phase !== 'ready') errors.push('phase: invalid')

  // Project present + assembled.
  if (!w?.project || w.project.status !== 'assembled' || w.project.version !== PROJECT_VERSION) {
    errors.push('project: must be an assembled Project snapshot')
  }

  // One activity state per work package (partition).
  const wpIds = new Set((w?.project?.workPackages ?? []).map((p) => p.id))
  const stateIds = (w?.activityStates ?? []).map((a) => a.workPackageId)
  if (stateIds.length !== wpIds.size || new Set(stateIds).size !== stateIds.length || !stateIds.every((id) => wpIds.has(id))) {
    errors.push('activityStates: must be exactly one per Project work package')
  }
  for (const a of w?.activityStates ?? []) {
    if (!ACTIVITY_STATUSES.includes(a.status)) errors.push(`activityStates: invalid status '${a.status}' for '${a.workPackageId}'`)
  }

  // Lineage: non-empty, ≤1 current, unique versions, current matches projectRef.
  const lineage = w?.lineage ?? []
  if (!lineage.length) errors.push('lineage: must contain ≥1 entry')
  const currents = lineage.filter((e) => e.status === 'current')
  if (currents.length !== 1) errors.push(`lineage: must have exactly one 'current' entry (found ${currents.length})`)
  const versions = lineage.map((e) => e.lineageVersion)
  if (new Set(versions).size !== versions.length) errors.push('lineage: duplicate lineageVersion')
  if (currents[0] && (currents[0].projectRef.projectId !== w?.projectRef?.projectId)) errors.push('lineage: current entry projectRef must match workspace.projectRef')

  // Journal seqs monotonic 1..n.
  const seqs = (w?.journal ?? []).map((j) => j.seq)
  if (!seqs.every((s, i) => s === i + 1)) errors.push('journal: seq must be 1..n monotonic')

  // Criticality consumed from this Project.
  if (w?.criticality?.computedFrom?.projectId !== w?.project?.project_id) errors.push('criticality: must be derived from this Project')

  // Gates (Phase 2): shape + human-owned decisions + ready-consistency.
  const gates = w?.gates
  if (!Array.isArray(gates)) {
    errors.push('gates: required (may be empty array)')
  } else {
    for (const g of gates) {
      if (typeof g?.id !== 'string' || !g.id) errors.push('gate: id required')
      if (!WORKSPACE_PHASES.includes(g?.guardsPhase)) errors.push(`gate '${g?.id}': invalid guardsPhase`)
      if (typeof g?.required !== 'boolean') errors.push(`gate '${g?.id}': required must be boolean`)
      if (g?.decision) {
        if (!GATE_DECISION_OUTCOMES.includes(g.decision.outcome)) errors.push(`gate '${g.id}': invalid decision outcome`)
        if (!g.decision.decidedBy || !DECIDER_KINDS.includes(g.decision.decidedBy.kind)) errors.push(`gate '${g.id}': invalid decider`)
        else if (g.decision.decidedBy.kind !== 'human') errors.push(`gate '${g.id}': decisions must be human-owned`)
      }
    }
    // Ready-consistency: a Workspace in `ready` must have every required ready-gate approved.
    if (w?.phase === 'ready') {
      const unmet = gates.filter((g) => g.required && g.guardsPhase === 'ready' && g.decision?.outcome !== 'approved')
      if (unmet.length) errors.push(`ready: required gate(s) not approved: ${unmet.map((g) => g.id).join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

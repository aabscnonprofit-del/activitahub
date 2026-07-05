// Organizer Workspace Integration — Slice 2: the LIVE loader that turns the (pure) Execution Workspace read
// model into a REAL runtime data source, composed from live Planning + Occurrence + persisted Execution data.
//
// Chain (for an APPROVED project):
//   Project → EventPlanV2 (frozen operational contract, v1)
//           → Occurrence (minted at approval; reused here, keyed by the approval timestamp)
//           → persisted Execution Status (project_execution_status; missing → pending default)
//           → Execution Snapshot (consumes the persisted status)
//           → Occurrence binding → timeline
//           → Execution Workspace (buildExecutionWorkspace — UNCHANGED pure model)
//
// It only READS/composes existing services and reuses the approval-minted occurrence (create-or-get is
// idempotent). It changes no Planning, Execution, Occurrence, or Organizer Workspace MODEL, and no page/UI.

import type { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { resolveCurrentOccurrence } from '@/lib/occurrence/store'
import { getExecutionStatus, snapshotFromPersistedStatus } from '@/lib/execution/persistence'
import { bindOccurrence } from '@/lib/occurrence/binding'
import { buildOccurrenceTimeline, type OccurrenceTimeline } from '@/lib/occurrence/timeline'
import { buildExecutionWorkspace, type ExecutionWorkspaceModel } from './execution-workspace'

type ServerClient = Awaited<ReturnType<typeof createClient>>

const EMPTY_TIMELINE: OccurrenceTimeline = { occurrenceId: '', occurrenceStartIso: '', entries: [], unbound: [] }

/**
 * Load the Organizer Execution Workspace for an approved project from live data. Returns null when the
 * project is not approved or has no EventPlanV2 (no operational contract to run). Consumes the PERSISTED
 * execution status when present; a missing row falls back to the pending default (existing approved projects
 * without execution state keep working). Pure composition over the live reads; the workspace read model is
 * unchanged.
 */
export async function loadOrganizerExecutionWorkspace(
  supabase: ServerClient,
  projectId: string,
): Promise<ExecutionWorkspaceModel | null> {
  const project = await getProject(supabase, projectId)
  if (!project || !project.approved_at) return null // only an approved project has an execution workspace

  const plan = await getEventPlanV2(supabase, projectId, 1)
  if (!plan) return null // no frozen operational contract → no workspace

  // The project's current execution Occurrence — resolved explicitly (sole occurrence, or lazily created at
  // the approval timestamp for a legacy approved project). Multiple occurrences without a selection resolve to
  // null (ambiguous) rather than guessing → no implicit "first occurrence" anchor.
  const occurrence = (await resolveCurrentOccurrence(supabase, projectId, { createAtIfMissing: project.approved_at })).occurrence

  // Persisted execution status (keyed by occurrence) → the snapshot consumes it; null → pending default.
  const persisted = occurrence ? await getExecutionStatus(supabase, projectId, occurrence.id) : null
  const snapshot = snapshotFromPersistedStatus(plan, persisted)

  const timeline = occurrence
    ? buildOccurrenceTimeline(bindOccurrence(snapshot, occurrence.id, occurrence.starts_at))
    : EMPTY_TIMELINE

  return buildExecutionWorkspace(snapshot, timeline)
}

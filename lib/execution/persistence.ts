// Execution Persistence — Slice 1: persist the ExecutionStatusModel for a (project, occurrence), and load it
// back into the Execution snapshot pipeline.
//
// Storage layer over `project_execution_status` (migration 050): the model's `byItemId` map is stored verbatim
// as JSONB and upserted on the unique (project_id, occurrence_id) key. Reads return null when no row exists —
// callers then fall back to the pending default, so legacy projects with no execution state keep working.
//
// This ADDS a storage layer + a persisted-status snapshot builder. It reuses the existing Execution model
// functions unchanged (buildExecutionMonitoringModel / initialExecutionStatus / composeExecutionState) and
// modifies none of them; it imports only the EventPlanV2 TYPE from Planning and nothing from Occurrence /
// Organizer Workspace.

import type { createClient } from '@/lib/supabase/server'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { buildExecutionMonitoringModel } from './monitoring'
import { initialExecutionStatus, type ExecutionStatusModel, type MonitoringStatus } from './status'
import { composeExecutionState } from './state'
import type { ExecutionSnapshot } from './snapshot'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Row shape for `project_execution_status` (migration 050). `status` is the model's `byItemId` map, verbatim. */
export interface ExecutionStatusRow {
  project_id: string
  occurrence_id: string
  status: Record<string, MonitoringStatus>
}

/** Pure mapping: an ExecutionStatusModel -> its persistence row. Exposed for deterministic testing. */
export function toExecutionStatusRow(
  projectId: string,
  occurrenceId: string,
  status: ExecutionStatusModel,
): ExecutionStatusRow {
  return { project_id: projectId, occurrence_id: occurrenceId, status: status.byItemId }
}

/**
 * Persist the ExecutionStatusModel for a (project, occurrence), upserting on the unique key so a re-save
 * replaces it. `updated_at` is maintained by the DB trigger. Surfaces the Supabase error (never swallows it).
 */
export async function persistExecutionStatus(
  supabase: ServerClient,
  projectId: string,
  occurrenceId: string,
  status: ExecutionStatusModel,
): Promise<void> {
  const { error } = await supabase
    .from('project_execution_status')
    .upsert(toExecutionStatusRow(projectId, occurrenceId, status), { onConflict: 'project_id,occurrence_id' })
  if (error) throw new Error(`persistExecutionStatus failed: ${error.message}`)
}

/**
 * Load the persisted ExecutionStatusModel for a (project, occurrence). Returns null when no row exists yet
 * (the caller falls back to the pending default). Surfaces a Supabase error (never swallows it).
 */
export async function getExecutionStatus(
  supabase: ServerClient,
  projectId: string,
  occurrenceId: string,
): Promise<ExecutionStatusModel | null> {
  const { data, error } = await supabase
    .from('project_execution_status')
    .select('status')
    .eq('project_id', projectId)
    .eq('occurrence_id', occurrenceId)
    .maybeSingle()
  if (error) throw new Error(`getExecutionStatus failed: ${error.message}`)
  if (!data) return null
  return { byItemId: ((data as { status?: Record<string, MonitoringStatus> }).status ?? {}) }
}

/**
 * PURE: build the Execution snapshot from a plan and an OPTIONAL persisted status. When `persisted` is null
 * (no execution state yet — legacy/new projects), every item defaults to pending, identical to the in-memory
 * builder. Otherwise the snapshot consumes the persisted status. Deterministic; reuses the existing pure
 * Execution functions.
 */
export function snapshotFromPersistedStatus(
  plan: EventPlanV2,
  persisted: ExecutionStatusModel | null,
): ExecutionSnapshot {
  const monitoring = buildExecutionMonitoringModel(plan)
  const status = persisted ?? initialExecutionStatus(monitoring)
  const state = composeExecutionState(monitoring, status)
  return { monitoring, status, state }
}

/**
 * Load the persisted execution status and build the Execution snapshot for a (project, occurrence). Legacy
 * projects with no persisted row build from the pending default. This is the persisted entry into the
 * snapshot pipeline (parallel to the in-memory buildExecutionSnapshot).
 */
export async function loadExecutionSnapshot(
  supabase: ServerClient,
  plan: EventPlanV2,
  projectId: string,
  occurrenceId: string,
): Promise<ExecutionSnapshot> {
  const persisted = await getExecutionStatus(supabase, projectId, occurrenceId)
  return snapshotFromPersistedStatus(plan, persisted)
}

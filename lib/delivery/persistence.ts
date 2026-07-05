// Delivery persistence — persist the DeliveryStateModel for a (project, occurrence) and load it back.
//
// Storage layer over `project_delivery_status` (migration 052): the model's `byComponentId` map is stored
// verbatim as JSONB and upserted on the unique (project_id, occurrence_id) key. Reads return null when there
// is no row — callers then fall back to the default (all pending, unassigned), so a project with no delivery
// state yet keeps working. Reads also degrade to null if the table is not present yet (migration not applied),
// so the Delivery Workspace renders (empty) rather than erroring before 052 is live.
//
// It reuses the pure Delivery state model unchanged and imports nothing from Planning / Execution / Occurrence.

import type { createClient } from '@/lib/supabase/server'
import type { DeliveryComponentState, DeliveryStateModel } from './status'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Row shape for `project_delivery_status` (migration 052). `state` is the model's `byComponentId` map. */
export interface DeliveryStatusRow {
  project_id: string
  occurrence_id: string
  state: Record<string, DeliveryComponentState>
}

/** Pure mapping: a DeliveryStateModel -> its persistence row. Exposed for deterministic testing. */
export function toDeliveryStatusRow(
  projectId: string,
  occurrenceId: string,
  state: DeliveryStateModel,
): DeliveryStatusRow {
  return { project_id: projectId, occurrence_id: occurrenceId, state: state.byComponentId }
}

/**
 * Persist the DeliveryStateModel for a (project, occurrence), upserting on the unique key so a re-save
 * replaces it. `updated_at` is maintained by the DB trigger. Surfaces the Supabase error (never swallows it).
 */
export async function persistDeliveryStatus(
  supabase: ServerClient,
  projectId: string,
  occurrenceId: string,
  state: DeliveryStateModel,
): Promise<void> {
  const { error } = await supabase
    .from('project_delivery_status')
    .upsert(toDeliveryStatusRow(projectId, occurrenceId, state), { onConflict: 'project_id,occurrence_id' })
  if (error) throw new Error(`persistDeliveryStatus failed: ${error.message}`)
}

/**
 * Load the persisted DeliveryStateModel for a (project, occurrence), or null when there is no row. Degrades to
 * null on a read error too (e.g. the table is not present before migration 052 is applied), so the workspace
 * renders with defaults rather than crashing.
 */
export async function getDeliveryStatus(
  supabase: ServerClient,
  projectId: string,
  occurrenceId: string,
): Promise<DeliveryStateModel | null> {
  try {
    const { data, error } = await supabase
      .from('project_delivery_status')
      .select('state')
      .eq('project_id', projectId)
      .eq('occurrence_id', occurrenceId)
      .maybeSingle()
    if (error || !data) return null
    return { byComponentId: (data.state ?? {}) as Record<string, DeliveryComponentState> }
  } catch {
    return null
  }
}

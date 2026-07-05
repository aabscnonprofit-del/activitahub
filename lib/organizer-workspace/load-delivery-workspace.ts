// Delivery Workspace loader — the LIVE loader that composes the Delivery Workspace read model from live
// Planning + Occurrence + persisted Delivery state, for an approved project.
//
// Chain (for an APPROVED project):
//   Project → EventPlanV2 (frozen operational contract, v1)
//           → delivery components (resources + staffing, projected from the plan)
//           → current Occurrence (explicit resolver — same as Execution)
//           → persisted Delivery state (project_delivery_status; missing → pending/unassigned default)
//           → Delivery Workspace (buildDeliveryWorkspace)
//
// It only READS/composes existing services and reuses the explicit current-occurrence resolver. It changes no
// Planning, Execution, Occurrence, or existing Workspace model, and no page/UI on its own.

import type { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { resolveCurrentOccurrence } from '@/lib/occurrence/store'
import { buildDeliveryComponentModel } from '@/lib/delivery/components'
import { getDeliveryStatus } from '@/lib/delivery/persistence'
import { emptyDeliveryState } from '@/lib/delivery/status'
import { buildDeliveryWorkspace, type DeliveryWorkspaceModel } from './delivery-workspace'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Load the Delivery Workspace for an approved project from live data. Returns null when the project is not
 * approved or has no EventPlanV2 (no operational contract). The delivery components are projected from the
 * plan; their state is read for the current occurrence (missing row / no occurrence → pending default), so
 * existing approved projects without delivery state keep working. Pure composition over the live reads.
 */
export async function loadDeliveryWorkspace(
  supabase: ServerClient,
  projectId: string,
): Promise<DeliveryWorkspaceModel | null> {
  const project = await getProject(supabase, projectId)
  if (!project || !project.approved_at) return null

  const plan = await getEventPlanV2(supabase, projectId, 1)
  if (!plan) return null

  const componentModel = buildDeliveryComponentModel(plan)

  const occurrence = (await resolveCurrentOccurrence(supabase, projectId, { createAtIfMissing: project.approved_at })).occurrence
  const state = occurrence ? (await getDeliveryStatus(supabase, projectId, occurrence.id)) ?? emptyDeliveryState() : emptyDeliveryState()

  return buildDeliveryWorkspace(componentModel, state)
}

// Worker View (ADR_011 / ADR_012) — a filtered projection of the same Project for an attached Worker: the
// worker's role + responsibilities (RESOLVED from the canonical Delivery role components — never a duplicated
// role definition), the schedule, and the work confirmation. Access is resolved through the SHARED Project
// Access layer (one token choke point + the Access Policy). Type-specific fields (role id, confirmation) live
// in the relationship's metadata. No new Project model.

import { createAdminClient } from '@/lib/supabase/server'
import { buildDeliveryComponentModel } from '@/lib/delivery/components'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { resolveActiveByToken } from '@/lib/project-access/store'
import { accessGrantsView } from '@/lib/project-access/policy'

/** Type-specific worker metadata carried on the shared access relationship. */
export interface WorkerAccessMetadata {
  roleId?: string | null
  confirmedAt?: string | null
}

/** The worker's role + responsibilities, resolved from the canonical project roles. */
export interface WorkerViewRole {
  label: string
  responsibilities: string
}

/** One scheduled occurrence, worker-safe (arrival time + location). */
export interface WorkerViewOccurrence {
  startsAt: string
  endsAt: string | null
  location: string | null
}

/** The Worker View read model — only worker-permitted information. */
export interface WorkerViewData {
  projectId: string
  role: WorkerViewRole | null
  occurrences: WorkerViewOccurrence[]
  confirmed: boolean
}

/**
 * Resolve a worker's role to its label + responsibilities from the CANONICAL project roles (the Delivery role
 * components projected from the plan's staffing). Pure — reuses the existing projection; defines no new role.
 */
export function resolveWorkerRole(plan: EventPlanV2 | null, roleId: string | null | undefined): WorkerViewRole | null {
  if (!plan || !roleId) return null
  const c = buildDeliveryComponentModel(plan).components.find((x) => x.kind === 'role' && x.id === roleId)
  return c ? { label: c.label, responsibilities: c.detail } : null
}

/** Compose the Worker View. Pure. (Access already validated by the shared resolver — this only projects.) */
export function buildWorkerView(
  projectId: string,
  role: WorkerViewRole | null,
  occurrences: WorkerViewOccurrence[],
  confirmed: boolean,
): WorkerViewData {
  return { projectId, role, occurrences, confirmed }
}

/**
 * Load the Worker View for an invite token via the shared Project Access layer: resolve an ACTIVE grant whose
 * type may render the Worker View, resolve the role from the canonical projection, load the schedule, and
 * project. Returns null when the token grants no worker access.
 */
export async function loadWorkerView(token: string): Promise<WorkerViewData | null> {
  const admin = await createAdminClient()
  const access = await resolveActiveByToken(admin, token, new Date().toISOString())
  if (!access || !accessGrantsView(access.access_type, 'worker')) return null

  const meta = (access.metadata ?? {}) as WorkerAccessMetadata

  const { data: planRow } = await admin
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', access.project_id)
    .eq('project_version', 1)
    .maybeSingle()
  const plan = (planRow?.plan as EventPlanV2 | undefined) ?? null

  const { data: occ } = await admin
    .from('occurrences')
    .select('starts_at, ends_at, location')
    .eq('project_id', access.project_id)
    .order('starts_at', { ascending: true })
  const occurrences: WorkerViewOccurrence[] = ((occ as { starts_at: string; ends_at: string | null; location: string | null }[]) ?? []).map((o) => ({
    startsAt: o.starts_at,
    endsAt: o.ends_at,
    location: o.location,
  }))

  return buildWorkerView(access.project_id, resolveWorkerRole(plan, meta.roleId), occurrences, meta.confirmedAt != null)
}

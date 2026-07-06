// Worker View — the first Project View rendered for an attached Worker (ADR_011 / ADR_012). It is a filtered
// PROJECTION of the same Project: the worker's role + responsibilities (RESOLVED from the canonical Delivery
// role components — never a duplicated role definition), the schedule (date + location), and the work
// confirmation. Access is gated by a project-scoped invite token; a revoked relationship resolves to nothing.
// It exposes NO organizer-only data (budget / delivery panels / team / capacity / lead / execution).

import { createAdminClient } from '@/lib/supabase/server'
import { buildDeliveryComponentModel } from '@/lib/delivery/components'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { getProjectWorkerByToken, type WorkerStatus } from './store'

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
export function resolveWorkerRole(plan: EventPlanV2 | null, roleId: string | null): WorkerViewRole | null {
  if (!plan || !roleId) return null
  const c = buildDeliveryComponentModel(plan).components.find((x) => x.kind === 'role' && x.id === roleId)
  return c ? { label: c.label, responsibilities: c.detail } : null
}

/**
 * Compose the Worker View from the relationship status + resolved role + occurrences + confirmation. Pure: a
 * revoked (or missing) relationship yields null (no access). Exposes no organizer-only data.
 */
export function buildWorkerView(
  projectId: string,
  status: WorkerStatus,
  role: WorkerViewRole | null,
  occurrences: WorkerViewOccurrence[],
  confirmed: boolean,
): WorkerViewData | null {
  if (status === 'revoked') return null
  return { projectId, role, occurrences, confirmed }
}

/**
 * Load the Worker View for an invite token. Resolves the relationship server-side (admin), denies a revoked or
 * unknown token, resolves the role from the canonical projection, loads the schedule, and composes the
 * worker-safe view. Returns null when the token grants no access.
 */
export async function loadWorkerView(token: string): Promise<WorkerViewData | null> {
  const admin = await createAdminClient()
  const worker = await getProjectWorkerByToken(admin, token)
  if (!worker || worker.status === 'revoked') return null

  const { data: planRow } = await admin
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', worker.project_id)
    .eq('project_version', 1)
    .maybeSingle()
  const plan = (planRow?.plan as EventPlanV2 | undefined) ?? null

  const { data: occ } = await admin
    .from('occurrences')
    .select('starts_at, ends_at, location')
    .eq('project_id', worker.project_id)
    .order('starts_at', { ascending: true })
  const occurrences: WorkerViewOccurrence[] = ((occ as { starts_at: string; ends_at: string | null; location: string | null }[]) ?? []).map((o) => ({
    startsAt: o.starts_at,
    endsAt: o.ends_at,
    location: o.location,
  }))

  return buildWorkerView(worker.project_id, worker.status, resolveWorkerRole(plan, worker.role_id), occurrences, worker.confirmed_at != null)
}

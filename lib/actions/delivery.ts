'use server'

// Delivery runtime server actions — the integration point for changing a delivery component's state for the
// current occurrence. Both actions: authenticate, owner + approval gate, resolve the current occurrence (the
// explicit resolver — same as Execution), load the persisted delivery state, apply the change, persist, and
// revalidate the project page so the Delivery Workspace reloads. Owner + approval gated. No new route/model.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { resolveCurrentOccurrence } from '@/lib/occurrence/store'
import { buildDeliveryComponentModel } from '@/lib/delivery/components'
import { getDeliveryStatus, persistDeliveryStatus } from '@/lib/delivery/persistence'
import {
  canDeliveryTransition,
  emptyDeliveryState,
  isDeliveryStatus,
  stateOf,
  withDeliveryAssignee,
  withDeliveryStatus,
} from '@/lib/delivery/status'

export type DeliveryActionResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not_authenticated'
        | 'not_authorized'
        | 'not_approved'
        | 'no_plan'
        | 'no_occurrence'
        | 'unknown_component'
        | 'invalid_status'
        | 'invalid_transition'
        | 'persist_failed'
    }

type PreludeError = 'not_authenticated' | 'not_authorized' | 'not_approved' | 'no_plan' | 'no_occurrence' | 'unknown_component'
type DeliveryContext = Awaited<ReturnType<typeof createClient>>
type PreludeResult =
  | { ok: false; error: PreludeError }
  | { ok: true; supabase: DeliveryContext; occurrenceId: string; state: ReturnType<typeof emptyDeliveryState> }

/** Shared prelude: auth + approval gate + plan + current occurrence + known-component + current state. */
async function resolveDeliveryContext(projectId: string, componentId: string): Promise<PreludeResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }
  if (!project.approved_at) return { ok: false, error: 'not_approved' }

  const plan = await getEventPlanV2(supabase, projectId, 1)
  if (!plan) return { ok: false, error: 'no_plan' }

  const componentModel = buildDeliveryComponentModel(plan)
  if (!componentModel.components.some((c) => c.id === componentId)) return { ok: false, error: 'unknown_component' }

  const occurrence = (await resolveCurrentOccurrence(supabase, projectId, { createAtIfMissing: project.approved_at })).occurrence
  if (!occurrence) return { ok: false, error: 'no_occurrence' }

  const state = (await getDeliveryStatus(supabase, projectId, occurrence.id)) ?? emptyDeliveryState()
  return { ok: true, supabase, occurrenceId: occurrence.id, state }
}

/**
 * Change the delivery status of one component for the current occurrence. Validates the target status and the
 * transition against the delivery lifecycle, persists on success, then revalidates so the workspace reloads.
 */
export async function updateDeliveryStatusAction(
  projectId: string,
  componentId: string,
  to: string,
  locale: string,
): Promise<DeliveryActionResult> {
  if (!isDeliveryStatus(to)) return { ok: false, reason: 'invalid_status' }

  const ctx = await resolveDeliveryContext(projectId, componentId)
  if (!ctx.ok) return { ok: false, reason: ctx.error }

  const current = stateOf(ctx.state, componentId).status
  if (!canDeliveryTransition(current, to)) return { ok: false, reason: 'invalid_transition' }

  try {
    await persistDeliveryStatus(ctx.supabase, projectId, ctx.occurrenceId, withDeliveryStatus(ctx.state, componentId, to))
  } catch {
    return { ok: false, reason: 'persist_failed' }
  }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/**
 * Set (or clear) the assignee of one delivery component for the current occurrence. Persists on success, then
 * revalidates so the workspace reloads. An empty assignee clears the assignment.
 */
export async function assignDeliveryComponentAction(
  projectId: string,
  componentId: string,
  assignee: string,
  locale: string,
): Promise<DeliveryActionResult> {
  const ctx = await resolveDeliveryContext(projectId, componentId)
  if (!ctx.ok) return { ok: false, reason: ctx.error }

  try {
    await persistDeliveryStatus(ctx.supabase, projectId, ctx.occurrenceId, withDeliveryAssignee(ctx.state, componentId, assignee))
  } catch {
    return { ok: false, reason: 'persist_failed' }
  }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

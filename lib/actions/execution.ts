'use server'

// Execution runtime server action — the integration point for changing execution status. It loads the live
// execution state (plan → occurrence → persisted status), evaluates the requested transition under ALL the
// existing runtime rules (valid transition + trigger + prerequisites), persists a successful transition, and
// revalidates the workspace so the page reloads with the persisted status. Owner-gated and approval-gated.
// Adds no new rule, model, or route; reuses the existing services + the pure evaluateTransition policy.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { createOrGetOccurrence } from '@/lib/occurrence/store'
import { getExecutionStatus, persistExecutionStatus } from '@/lib/execution/persistence'
import { buildExecutionMonitoringModel } from '@/lib/execution/monitoring'
import { initialExecutionStatus, isMonitoringStatus } from '@/lib/execution/status'
import { evaluateTransition, type TransitionRejection } from './execution-transition'

export type UpdateExecutionStatusResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not_authenticated'
        | 'not_authorized'
        | 'not_approved'
        | 'no_plan'
        | 'no_occurrence'
        | 'invalid_status'
        | 'persist_failed'
        | TransitionRejection
    }

/**
 * Change the status of one execution (monitoring) item for a project's live occurrence. Enforces the runtime
 * rules via evaluateTransition; persists only on success; then revalidates so the workspace reloads. Existing
 * approved projects with no persisted status start from the pending default (backward compatible).
 */
export async function updateExecutionStatusAction(
  projectId: string,
  itemId: string,
  to: string,
  locale: string,
): Promise<UpdateExecutionStatusResult> {
  if (!isMonitoringStatus(to)) return { ok: false, reason: 'invalid_status' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not_authenticated' }

  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, reason: 'not_authorized' }
  if (!project.approved_at) return { ok: false, reason: 'not_approved' }

  const plan = await getEventPlanV2(supabase, projectId, 1)
  if (!plan) return { ok: false, reason: 'no_plan' }

  const occRes = await createOrGetOccurrence(supabase, { projectId, startsAt: project.approved_at })
  if (!occRes.ok) return { ok: false, reason: 'no_occurrence' }
  const occurrence = occRes.occurrence

  const monitoring = buildExecutionMonitoringModel(plan)
  const status = (await getExecutionStatus(supabase, projectId, occurrence.id)) ?? initialExecutionStatus(monitoring)

  const outcome = evaluateTransition(monitoring, status, itemId, to)
  if (!outcome.ok) return { ok: false, reason: outcome.reason }

  try {
    await persistExecutionStatus(supabase, projectId, occurrence.id, outcome.status)
  } catch {
    return { ok: false, reason: 'persist_failed' }
  }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

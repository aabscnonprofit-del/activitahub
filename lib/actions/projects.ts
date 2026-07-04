'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject, publishProject, updateProject, insertApprovedProjectSnapshot } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'

// Project actions — thin server-action surface over the Project Service (lib/projects/store).
// Business logic / ownership stays in the service + RLS; actions only authenticate, delegate, revalidate.

export interface PublishResult {
  ok: boolean
  error?: 'not_authenticated' | 'not_authorized' | 'publish_failed'
}

/**
 * Publish a Project (Publish Flow). Owner-only and idempotent:
 *  - the caller must be authenticated and own the Project (getProject is RLS owner-scoped);
 *  - publishing sets `projects.is_published = true` via the Project Service and nothing else;
 *  - re-publishing an already-published Project is a no-op success.
 */
export async function publishProjectAction(projectId: string, locale: string): Promise<PublishResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  const ok = await publishProject(supabase, projectId)
  if (!ok) return { ok: false, error: 'publish_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}

export interface ApproveResult {
  ok: boolean
  approvedAt?: string
  error?: 'not_authenticated' | 'not_authorized' | 'no_operational_configuration' | 'approve_failed'
}

/**
 * Approve Project V1 — the first TRUTHFUL Approve Project operation (docs/PROJECT_LIFECYCLE.md, ADR_004/005).
 * Owner-only and idempotent. It writes the approval as TWO architecturally distinct things:
 *   1. inserts the Approved Project Snapshot — a SEPARATE IMMUTABLE ARTIFACT capturing the Operational
 *      Configuration (the current EventPlanV2 — V1 scope);
 *   2. records the approval STATE on the Project (approved_at, approved_by).
 *
 * ORDERING: the snapshot MUST be created BEFORE recording approval — approval must never exist without its
 * snapshot. It does NOT write snapshot JSON into projects, change status / current_step, touch Publish,
 * freeze other modules, or start Execution. Approval is refused when no EventPlanV2 exists to snapshot.
 */
export async function approveProjectAction(projectId: string, locale: string): Promise<ApproveResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  // Idempotent: already approved → no-op success.
  if (project.approved_at) return { ok: true, approvedAt: project.approved_at }

  // Load the current Operational Configuration (EventPlanV2, version 1 — the planner's convention).
  // Approval is only truthful if an operational configuration exists to snapshot.
  let plan: Awaited<ReturnType<typeof getEventPlanV2>>
  try {
    plan = await getEventPlanV2(supabase, projectId, 1)
  } catch {
    return { ok: false, error: 'approve_failed' }
  }
  if (!plan) return { ok: false, error: 'no_operational_configuration' }

  const approvedAt = new Date().toISOString()

  // 1. Create the immutable snapshot artifact FIRST — approval must never exist without its snapshot.
  const snapshotOk = await insertApprovedProjectSnapshot(supabase, {
    projectId,
    projectVersion: 1,
    approvedBy: user.id,
    approvedAt,
    snapshot: plan,
  })
  if (!snapshotOk) return { ok: false, error: 'approve_failed' }

  // 2. Only after the snapshot exists, record the approval STATE on the Project (approved_at / approved_by).
  const updated = await updateProject(supabase, projectId, { approved_at: approvedAt, approved_by: user.id })
  if (!updated) return { ok: false, error: 'approve_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true, approvedAt: updated.approved_at ?? approvedAt }
}

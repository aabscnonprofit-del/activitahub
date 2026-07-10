'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject, publishProject, updateProject, insertApprovedProjectSnapshot, setProjectVisibility, type ProjectVisibility, setProjectJoinPolicy, type JoinPolicy, setProjectTicketType, type TicketType, getProjectVisibility, getProjectPublishState } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { createOrGetOccurrence, hasFutureOccurrence } from '@/lib/occurrence/store'
import { loadCapacityGate } from '@/lib/capacity/gate'

// Project actions — thin server-action surface over the Project Service (lib/projects/store).
// Business logic / ownership stays in the service + RLS; actions only authenticate, delegate, revalidate.

export interface PublishResult {
  ok: boolean
  error?: 'not_authenticated' | 'not_authorized' | 'no_future_occurrence' | 'publish_failed'
}

/**
 * Publish a Project (Publish Flow). Owner-only and idempotent:
 *  - the caller must be authenticated and own the Project (getProject is RLS owner-scoped);
 *  - publishing sets `projects.is_published = true` via the Project Service and nothing else;
 *  - re-publishing an already-published Project is a no-op success.
 *
 * Readiness gate: a PUBLIC project may not be published without at least one future Occurrence — a publicly
 * discoverable activity must never be presented as ready with no date ("Dates coming soon" is only for an
 * intentional non-public preview). Publishing a PRIVATE (invitation-only) project stays allowed. Occurrence is
 * the sole date/time source of truth for this check.
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

  // Readiness: publishing a PUBLIC project requires a real future date.
  const visibility = await getProjectVisibility(supabase, projectId)
  if (visibility === 'public' && !(await hasFutureOccurrence(supabase, projectId, new Date().toISOString()))) {
    return { ok: false, error: 'no_future_occurrence' }
  }

  const ok = await publishProject(supabase, projectId)
  if (!ok) return { ok: false, error: 'publish_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}

export interface VisibilityResult {
  ok: boolean
  error?: 'not_authenticated' | 'not_authorized' | 'invalid' | 'no_future_occurrence' | 'visibility_failed'
}

/**
 * Set a Project's discovery visibility (private / public). Owner-only. Independent of publication — it only
 * decides whether the Project is eligible to appear in Local Activities (published + public). Changes no
 * Planning / Budget / Execution / lifecycle / approval state. Revalidates the workspace + the Local Activities
 * catalog so a public/private switch is reflected immediately.
 */
export async function setProjectVisibilityAction(projectId: string, visibility: ProjectVisibility, locale: string): Promise<VisibilityResult> {
  if (visibility !== 'private' && visibility !== 'public') return { ok: false, error: 'invalid' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  // Readiness (the other ordering of the same rule): making an ALREADY-PUBLISHED project public requires a
  // future Occurrence, so a discoverable activity can never end up published + public with no date.
  if (visibility === 'public') {
    const isPublished = await getProjectPublishState(supabase, projectId)
    if (isPublished && !(await hasFutureOccurrence(supabase, projectId, new Date().toISOString()))) {
      return { ok: false, error: 'no_future_occurrence' }
    }
  }

  const ok = await setProjectVisibility(supabase, projectId, visibility)
  if (!ok) return { ok: false, error: 'visibility_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/activities`)
  return { ok: true }
}

export interface JoinPolicyResult {
  ok: boolean
  error?: 'not_authenticated' | 'not_authorized' | 'invalid' | 'join_policy_failed'
}

/**
 * Set a Project's join policy (instant / approval / ticket). Owner-only. Defines only how a participant joins
 * this Project — it creates no Join / Ticket / Registration entity and no payment. Changes no Planning /
 * Budget / Execution / Publication / Visibility / lifecycle state. Revalidates the workspace + the public
 * Activity Page (/p/[projectId]) so the Join action reflects the new policy immediately.
 */
export async function setProjectJoinPolicyAction(projectId: string, joinPolicy: JoinPolicy, locale: string): Promise<JoinPolicyResult> {
  if (joinPolicy !== 'instant' && joinPolicy !== 'approval' && joinPolicy !== 'ticket') return { ok: false, error: 'invalid' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  const ok = await setProjectJoinPolicy(supabase, projectId, joinPolicy)
  if (!ok) return { ok: false, error: 'join_policy_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}

export interface TicketTypeResult {
  ok: boolean
  error?: 'not_authenticated' | 'not_authorized' | 'invalid' | 'ticket_type_failed'
}

/**
 * Set a Project's ticket type (free / paid / donation). Owner-only. The Ticket System sits on top of
 * Participants and only applies when the Join Policy is 'ticket': it decides WHAT ticket is required. Creates no
 * checkout/payment. Changes no Planning / Budget / Execution / Publication / Visibility / Join Policy / lifecycle.
 */
export async function setProjectTicketTypeAction(projectId: string, ticketType: TicketType, locale: string): Promise<TicketTypeResult> {
  if (ticketType !== 'free' && ticketType !== 'paid' && ticketType !== 'donation') return { ok: false, error: 'invalid' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  const ok = await setProjectTicketType(supabase, projectId, ticketType)
  if (!ok) return { ok: false, error: 'ticket_type_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}

export interface ApproveResult {
  ok: boolean
  approvedAt?: string
  error?: 'not_authenticated' | 'not_authorized' | 'no_operational_configuration' | 'capacity_exceeded' | 'approve_failed'
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
/**
 * Best-effort: ensure an approved project has its first live Occurrence (create-or-get), keyed by the stable
 * approval timestamp so repeated approvals reuse the same occurrence (never duplicate). This mints the real
 * occurrence_id the execution pipeline needs. It NEVER blocks approval — any failure here is swallowed, since
 * approval has already been (or will be) recorded. Not user-facing; no route/UI change.
 */
async function ensureFirstOccurrence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  approvedAtIso: string,
): Promise<void> {
  try {
    await createOrGetOccurrence(supabase, { projectId, startsAt: approvedAtIso })
  } catch {
    // best-effort: occurrence creation must never fail an approval
  }
}

export async function approveProjectAction(projectId: string, locale: string): Promise<ApproveResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  // Idempotent: already approved → no-op success. Still ensures the first live Occurrence exists (reused).
  if (project.approved_at) {
    await ensureFirstOccurrence(supabase, projectId, project.approved_at)
    return { ok: true, approvedAt: project.approved_at }
  }

  // Load the current Operational Configuration (EventPlanV2, version 1 — the planner's convention).
  // Approval is only truthful if an operational configuration exists to snapshot.
  let plan: Awaited<ReturnType<typeof getEventPlanV2>>
  try {
    plan = await getEventPlanV2(supabase, projectId, 1)
  } catch {
    return { ok: false, error: 'approve_failed' }
  }
  if (!plan) return { ok: false, error: 'no_operational_configuration' }

  // Organizer Capacity Gate — an organizer may only INDEPENDENTLY lead a project within their capacity level.
  // If the project's participant count exceeds the organizer's maximum, approval (becoming lead) is refused
  // BEFORE any state is written: the project itself stays fully valid; the organizer must upgrade or assign a
  // qualified Lead Organizer. The restriction is on the organizer, never on the event.
  const gate = await loadCapacityGate(supabase, projectId, user.id)
  if (!gate.allowed) return { ok: false, error: 'capacity_exceeded' }

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

  // 3. Best-effort: mint the project's first live Occurrence (create-or-get) now that it is approved — the
  //    execution pipeline needs a real occurrence_id + starts_at. Never fails the approval.
  await ensureFirstOccurrence(supabase, projectId, updated.approved_at ?? approvedAt)

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true, approvedAt: updated.approved_at ?? approvedAt }
}

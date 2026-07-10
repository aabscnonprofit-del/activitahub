'use server'

// Quick Activity — the "I already know what I'm creating" entry point. Creates the SAME canonical Project the
// assisted (BIG/OPE) path creates, without any AI/OPE generation. It composes existing services only:
//   1. Project root         (resolveProjectForPlan — the single canonical creation entry)
//   2. EventPlanV2          (quickActivityEventPlan — a minimal, valid operational contract; NO AI)
//   3. Approve              (insert the immutable snapshot, then record approval STATE)
//   4. Occurrence(s)        (applyOccurrenceWindows — the scheduled date(s); the sole date/time source of truth)
//   5. Ticket config        (paid → join policy 'ticket' + ticket type 'paid'; free → defaults)
// It creates NO legacy `activities` row and NO second date/public model. The organizer lands in the Project
// Workspace to Set Public + Publish (the readiness gate then requires the future date this already created).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveProjectForPlan, updateProject, insertApprovedProjectSnapshot, setProjectJoinPolicy, setProjectTicketType } from '@/lib/projects/store'
import { persistEventPlanV2 } from '@/lib/planning/persistence'
import { quickActivityEventPlan } from '@/lib/planning/quick-activity-plan'
import { applyOccurrenceWindows } from '@/lib/occurrence/store'
import { validateSchedule, expandSchedule, type ScheduleSpec } from '@/lib/scheduling/schedule'

export interface QuickActivityInput {
  title: string
  description: string
  spec: ScheduleSpec
  location?: string | null
  capacity?: number | null
  /** 'free' → no price; 'paid' → priceCents applies and the join policy becomes a paid ticket. */
  pricing: 'free' | 'paid'
  priceCents?: number | null
}

export type QuickActivityResult =
  | { ok: true; projectId: string }
  | { ok: false; reason: 'not_authenticated' | 'missing_title' | 'missing_description' | 'invalid_schedule' | 'create_failed'; detail?: string }

export async function createQuickActivityAction(input: QuickActivityInput, locale: string): Promise<QuickActivityResult> {
  const title = (input.title ?? '').trim()
  const description = (input.description ?? '').trim()
  if (!title) return { ok: false, reason: 'missing_title' }
  if (!description) return { ok: false, reason: 'missing_description' }

  const now = new Date().toISOString()
  const valid = validateSchedule(input.spec, now)
  if (!valid.ok) return { ok: false, reason: 'invalid_schedule', detail: valid.reason }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not_authenticated' }

  // 1. Canonical Project (the single creation entry point). Marked plan_ready — it carries a finished plan.
  const projectId = await resolveProjectForPlan(supabase, { organizerId: user.id, init: { current_step: 'plan_ready' } })
  if (!projectId) return { ok: false, reason: 'create_failed' }

  // 2. Minimal EventPlanV2 (no AI) — the canonical operational contract. Required for approval + public display.
  try {
    await persistEventPlanV2(supabase, projectId, 1, quickActivityEventPlan({ title, description }))
  } catch {
    return { ok: false, reason: 'create_failed' }
  }

  // 3. Approve — snapshot FIRST (approval must never exist without its snapshot), then record approval STATE.
  //    Done directly (not via approveProjectAction) so NO approval-time placeholder occurrence is minted; the
  //    real scheduled occurrence is created next. The organizer capacity gate is vacuous here (0 participants).
  const approvedAt = new Date().toISOString()
  const plan = quickActivityEventPlan({ title, description })
  const snapshotOk = await insertApprovedProjectSnapshot(supabase, { projectId, projectVersion: 1, approvedBy: user.id, approvedAt, snapshot: plan })
  if (!snapshotOk) return { ok: false, reason: 'create_failed' }
  const approved = await updateProject(supabase, projectId, { approved_at: approvedAt, approved_by: user.id })
  if (!approved) return { ok: false, reason: 'create_failed' }

  // 4. The scheduled Occurrence(s) — the sole date/time source of truth (location/capacity/price live here too).
  const priceCents = input.pricing === 'paid' && input.priceCents != null ? Math.max(0, Math.round(input.priceCents)) : null
  const { windows } = expandSchedule(input.spec)
  const applied = await applyOccurrenceWindows(
    supabase,
    projectId,
    windows,
    {
      title,
      location: input.location?.trim() ? input.location.trim() : null,
      capacity: input.capacity != null ? Math.max(0, Math.round(input.capacity)) : null,
      priceCents,
    },
    now,
    input.spec.kind === 'weekly' ? 'series' : 'one_time',
  )
  if (!applied.ok) return { ok: false, reason: 'create_failed' }

  // 5. Ticket configuration — a paid activity requires a ticket (the price sits on the occurrence). Free stays
  //    on the safe defaults. Best-effort: never fails the create (the workspace can adjust it).
  if (input.pricing === 'paid') {
    await setProjectJoinPolicy(supabase, projectId, 'ticket')
    await setProjectTicketType(supabase, projectId, 'paid')
  }

  revalidatePath(`/${locale}/dashboard/projects`)
  return { ok: true, projectId }
}

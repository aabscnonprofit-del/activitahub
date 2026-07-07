'use server'

// Activity Review — server action. An eligible participant's plain-text feedback on a completed public activity,
// stored in the Activity Reviews layer (inside Activity Memories). Server-authoritative on eligibility: it
// REUSES the canonical Review Eligibility helper (public + completed + approved participant) — never trusts the
// client, never reads the Ticket System. Only the participant writes their OWN review; the organizer cannot.
// Plain text, length-limited. No ratings/scores/reputation. No Planning/Budget/Execution/Ticket change.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPublicProject, getProjectVisibility } from '@/lib/projects/store'
import { getParticipantForAccount } from '@/lib/participants/store'
import { setActivityReview } from '@/lib/activity-memories/store'
import { getReviewEligibility } from '@/lib/reviews/reviews-eligibility'

/** Plain-text length cap for an Activity Review. */
export const ACTIVITY_REVIEW_MAX = 2000

export type ActivityReviewResult = { ok: true } | { ok: false; error: 'not_authenticated' | 'not_eligible' | 'too_long' | 'failed' }

/**
 * Set (or clear) the caller's own Activity Review. Requires eligibility per the canonical Review Eligibility
 * projection (public + completed + approved participant); empty/whitespace clears it. Revalidates the Space.
 */
export async function setActivityReviewAction(projectId: string, review: string, locale: string): Promise<ActivityReviewResult> {
  if (typeof review !== 'string' || review.length > ACTIVITY_REVIEW_MAX) return { ok: false, error: 'too_long' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Eligibility (public + completed + approved participant) — canonical Review Eligibility; never trust the client.
  const publicProject = await getPublicProject(supabase, projectId)
  const visibility = await getProjectVisibility(supabase, projectId)
  const { data: occData } = await supabase.from('occurrences').select('starts_at, ends_at').eq('project_id', projectId)
  const occurrences = (occData ?? []) as { starts_at: string; ends_at: string | null }[]
  const mine = await getParticipantForAccount(supabase, projectId, user.id)
  const eligibility = getReviewEligibility({
    isPublished: !!publicProject,
    visibility,
    occurrences,
    nowMs: Date.now(),
    participantStatus: mine?.status ?? null,
  })
  if (!eligibility.eligible) return { ok: false, error: 'not_eligible' }

  const trimmed = review.trim()
  if (!(await setActivityReview(supabase, projectId, user.id, trimmed.length > 0 ? trimmed : null))) return { ok: false, error: 'failed' }

  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}

'use server'

// Participant Story — server action. An eligible participant's short personal reflection on a completed public
// activity, stored in the Activity Memories participant-memories layer. Server-authoritative on eligibility: it
// REUSES the Participant Memory Eligibility helper (public + completed + approved participant) — never trusts
// the client, never reads the Ticket System. Only the participant can write their OWN story; the organizer
// cannot. Plain text, length-limited. No Planning/Budget/Execution/Ticket/Organizer-content change.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPublicProject, getProjectVisibility } from '@/lib/projects/store'
import { getParticipantForAccount } from '@/lib/participants/store'
import { setParticipantStory } from '@/lib/activity-memories/store'
import { getParticipantMemoryEligibility } from '@/lib/activity-memories/participant-memory-eligibility'
import { PARTICIPANT_STORY_MAX } from '@/lib/activity-memories/limits'

export type ParticipantStoryResult = { ok: true } | { ok: false; error: 'not_authenticated' | 'not_eligible' | 'too_long' | 'failed' }

/**
 * Set (or clear) the caller's own Participant Story. Requires eligibility per the shared projection (public +
 * completed + approved participant); empty/whitespace clears it. Revalidates the public Activity Space.
 */
export async function setParticipantStoryAction(projectId: string, story: string, locale: string): Promise<ParticipantStoryResult> {
  if (typeof story !== 'string' || story.length > PARTICIPANT_STORY_MAX) return { ok: false, error: 'too_long' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Eligibility (public + completed + approved participant) — shared helper; never trust the client.
  const publicProject = await getPublicProject(supabase, projectId)
  const visibility = await getProjectVisibility(supabase, projectId)
  const { data: occData } = await supabase.from('occurrences').select('starts_at, ends_at').eq('project_id', projectId)
  const occurrences = (occData ?? []) as { starts_at: string; ends_at: string | null }[]
  const mine = await getParticipantForAccount(supabase, projectId, user.id)
  const eligibility = getParticipantMemoryEligibility({
    isPublished: !!publicProject,
    visibility,
    occurrences,
    nowMs: Date.now(),
    participantStatus: mine?.status ?? null,
  })
  if (!eligibility.eligible) return { ok: false, error: 'not_eligible' }

  const trimmed = story.trim()
  if (!(await setParticipantStory(supabase, projectId, user.id, trimmed.length > 0 ? trimmed : null))) return { ok: false, error: 'failed' }

  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}

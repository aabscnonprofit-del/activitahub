'use server'

// Organizer Story — server action. The organizer's public reflection on a completed public activity, stored as
// a simple property of the Project (organizer_story). Owner-only; plain text with a reasonable length limit.
// No Story/Memory entity, no lifecycle. Changes no Planning/Budget/Execution/Join-Policy/Participants/Ticket/
// Project-Access state.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject, setProjectOrganizerStory } from '@/lib/projects/store'

/** Plain-text length cap for the Organizer Story. */
export const ORGANIZER_STORY_MAX = 4000

export type OrganizerStoryResult = { ok: true } | { ok: false; error: 'not_authenticated' | 'not_authorized' | 'too_long' | 'failed' }

/**
 * Set (or clear) the Organizer Story for a Project. Owner-only (getProject is owner-RLS). Plain text, capped at
 * ORGANIZER_STORY_MAX; an empty/whitespace story clears it (→ the "Coming soon" placeholder). Revalidates the
 * public Activity Space so the story appears immediately.
 */
export async function setOrganizerStoryAction(projectId: string, story: string, locale: string): Promise<OrganizerStoryResult> {
  if (typeof story !== 'string' || story.length > ORGANIZER_STORY_MAX) return { ok: false, error: 'too_long' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  const trimmed = story.trim()
  if (!(await setProjectOrganizerStory(supabase, projectId, trimmed.length > 0 ? trimmed : null))) return { ok: false, error: 'failed' }

  revalidatePath(`/${locale}/p/${projectId}`)
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

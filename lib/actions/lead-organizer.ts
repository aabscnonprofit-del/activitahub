'use server'

// Lead Organizer assignment server action — lets a project's owner assign (or change/clear) a qualified Lead
// Organizer so an over-capacity owner can keep a valid project and have someone with enough capacity lead it.
// Owner-gated. Assigning validates the candidate's capacity against the project's participant count (reused,
// never re-derived); an unqualified candidate is rejected and nothing is persisted. Clearing (empty id) returns
// the lead to the owner. No new route/model; reuses the capacity model + participant-count source.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject, setProjectLeadOrganizer } from '@/lib/projects/store'
import { getOrganizerCapacityLevel, projectParticipantCount } from '@/lib/capacity/gate'
import { evaluateCapacityGate } from '@/lib/capacity/model'

export type AssignLeadResult =
  | { ok: true; cleared: boolean }
  | { ok: false; reason: 'not_authenticated' | 'not_authorized' | 'lead_unqualified' | 'persist_failed' }

/**
 * Assign (or change) the project's Lead Organizer, validating the candidate has enough capacity to lead a
 * project of this size; an empty id clears the assignment (owner becomes the lead again). Owner-only; persists
 * only on success, then revalidates so the Capacity Gate / approval re-evaluate against the effective lead.
 */
export async function assignLeadOrganizerAction(
  projectId: string,
  leadOrganizerId: string,
  locale: string,
): Promise<AssignLeadResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not_authenticated' }

  // Ownership: only the project's owner may assign its Lead Organizer (owner RLS scopes the read).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, reason: 'not_authorized' }

  const candidate = typeof leadOrganizerId === 'string' ? leadOrganizerId.trim() : ''

  // Clear → the owner leads again.
  if (!candidate) {
    if (!(await setProjectLeadOrganizer(supabase, projectId, null))) return { ok: false, reason: 'persist_failed' }
    revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
    return { ok: true, cleared: true }
  }

  // Validate the candidate's capacity for this project's size before assigning.
  const [level, count] = await Promise.all([
    getOrganizerCapacityLevel(supabase, candidate),
    projectParticipantCount(supabase, projectId),
  ])
  if (!evaluateCapacityGate(level, count).allowed) return { ok: false, reason: 'lead_unqualified' }

  if (!(await setProjectLeadOrganizer(supabase, projectId, candidate))) return { ok: false, reason: 'persist_failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true, cleared: false }
}

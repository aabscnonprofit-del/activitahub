// Activity Memories — participant-memories storage (project_activity_participant_memories, migration 065).
// Persistence for Participant Story (the first participant-generated memory). Graceful degradation: reads return
// [] / null when the table is absent. RLS owns authorization (participant self-write + approved; public read for
// published+public). Not a Story/Timeline entity — a simple child storage of Activity Memories.

import { createAdminClient } from '@/lib/supabase/server'
import type { createClient } from '@/lib/supabase/server'
import { getParticipantProfiles } from '@/lib/participants/store'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** A participant's story for display — name (public profile) + text, with its created time (chronological). */
export interface ParticipantStoryEntry {
  participantId: string
  name: string | null
  story: string
  createdAt: string
}

/** The caller's own participant story for a Project, or null. Tolerant (null when absent/empty/error). */
export async function getParticipantStory(supabase: ServerClient, projectId: string, participantId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('project_activity_participant_memories')
      .select('participant_story')
      .eq('project_id', projectId)
      .eq('participant_id', participantId)
      .maybeSingle()
    if (error || !data) return null
    const s = (data as { participant_story?: string | null }).participant_story
    return typeof s === 'string' && s.trim().length > 0 ? s : null
  } catch {
    return null
  }
}

/** Upsert the caller's OWN participant story (RLS: own row + approved participant). Returns true on success. */
export async function setParticipantStory(supabase: ServerClient, projectId: string, participantId: string, story: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('project_activity_participant_memories')
    .upsert({ project_id: projectId, participant_id: participantId, participant_story: story }, { onConflict: 'project_id,participant_id' })
  return !error
}

/**
 * List a Project's participant stories (non-empty) for public display — chronological (oldest first), each with
 * the participant's public display name. Reads via the admin client to resolve names; graceful [] on error/empty.
 */
export async function listParticipantStories(projectId: string): Promise<ParticipantStoryEntry[]> {
  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('project_activity_participant_memories')
      .select('participant_id, participant_story, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    const rows = ((data ?? []) as { participant_id: string; participant_story: string | null; created_at: string }[]).filter(
      (r) => typeof r.participant_story === 'string' && r.participant_story.trim().length > 0,
    )
    if (rows.length === 0) return []
    const profiles = await getParticipantProfiles(rows.map((r) => r.participant_id))
    return rows.map((r) => ({
      participantId: r.participant_id,
      name: profiles[r.participant_id]?.fullName ?? null,
      story: (r.participant_story as string).trim(),
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}

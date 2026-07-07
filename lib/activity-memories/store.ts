// Activity Memories — participant-memory storage over the UNIFIED content layer (project_activity_memory_items,
// migration 067). Persistence for Participant Story and Activity Review (typed memory items). Graceful
// degradation: reads return [] / null when the table is absent. RLS owns authorization (participant self-write +
// approved; public read for published+public). Text only — no ratings/reactions/comments. Same public function
// signatures + entry types as before, so actions/components are unchanged; only the underlying table changed.

import { createAdminClient } from '@/lib/supabase/server'
import type { createClient } from '@/lib/supabase/server'
import { getParticipantProfiles } from '@/lib/participants/store'

type ServerClient = Awaited<ReturnType<typeof createClient>>

const PARTICIPANT_STORY = 'participant_story'
const ACTIVITY_REVIEW = 'activity_review'

// ── shared unified-layer access ─────────────────────────────────────────────────────────────────────────────
interface MemoryEntry { authorId: string; name: string | null; body: string; createdAt: string }

/** The caller's own memory-item body for (project, type, author), or null. Tolerant (null when absent/empty/error). */
async function getOwnMemoryBody(supabase: ServerClient, projectId: string, memoryType: string, authorId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('project_activity_memory_items')
      .select('body')
      .eq('project_id', projectId)
      .eq('memory_type', memoryType)
      .eq('author_id', authorId)
      .maybeSingle()
    if (error || !data) return null
    const s = (data as { body?: string | null }).body
    return typeof s === 'string' && s.trim().length > 0 ? s : null
  } catch {
    return null
  }
}

/** Upsert the caller's own PARTICIPANT memory item (RLS: own row + approved participant). Returns true on success. */
async function upsertParticipantMemory(supabase: ServerClient, projectId: string, memoryType: string, authorId: string, body: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('project_activity_memory_items')
    .upsert(
      { project_id: projectId, author_type: 'participant', author_id: authorId, memory_type: memoryType, body },
      { onConflict: 'project_id,memory_type,author_id' },
    )
  return !error
}

/** List non-empty memory items of a type for public display — chronological (oldest first), with display names. */
async function listMemoryEntries(projectId: string, memoryType: string): Promise<MemoryEntry[]> {
  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('project_activity_memory_items')
      .select('author_id, body, created_at')
      .eq('project_id', projectId)
      .eq('memory_type', memoryType)
      .order('created_at', { ascending: true })
    const rows = ((data ?? []) as { author_id: string; body: string | null; created_at: string }[]).filter(
      (r) => typeof r.body === 'string' && r.body.trim().length > 0,
    )
    if (rows.length === 0) return []
    const profiles = await getParticipantProfiles(rows.map((r) => r.author_id))
    return rows.map((r) => ({
      authorId: r.author_id,
      name: profiles[r.author_id]?.fullName ?? null,
      body: (r.body as string).trim(),
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}

// ── Participant Stories (memory_type = 'participant_story') ──────────────────────────────────────────────────
/** A participant's story for display — name (public profile) + text, with its created time (chronological). */
export interface ParticipantStoryEntry {
  participantId: string
  name: string | null
  story: string
  createdAt: string
}

/** The caller's own participant story for a Project, or null. */
export async function getParticipantStory(supabase: ServerClient, projectId: string, participantId: string): Promise<string | null> {
  return getOwnMemoryBody(supabase, projectId, PARTICIPANT_STORY, participantId)
}

/** Upsert the caller's OWN participant story. Returns true on success. */
export async function setParticipantStory(supabase: ServerClient, projectId: string, participantId: string, story: string | null): Promise<boolean> {
  return upsertParticipantMemory(supabase, projectId, PARTICIPANT_STORY, participantId, story)
}

/** List a Project's participant stories (non-empty) for public display — chronological, with display names. */
export async function listParticipantStories(projectId: string): Promise<ParticipantStoryEntry[]> {
  const entries = await listMemoryEntries(projectId, PARTICIPANT_STORY)
  return entries.map((e) => ({ participantId: e.authorId, name: e.name, story: e.body, createdAt: e.createdAt }))
}

// ── Activity Reviews (memory_type = 'activity_review') ───────────────────────────────────────────────────────
/** A participant's review for display — name (public profile) + text + creation date (chronological). */
export interface ActivityReviewEntry {
  participantId: string
  name: string | null
  review: string
  createdAt: string
}

/** The caller's own review for a Project, or null. */
export async function getActivityReview(supabase: ServerClient, projectId: string, participantId: string): Promise<string | null> {
  return getOwnMemoryBody(supabase, projectId, ACTIVITY_REVIEW, participantId)
}

/** Upsert the caller's OWN review. Returns true on success. */
export async function setActivityReview(supabase: ServerClient, projectId: string, participantId: string, review: string | null): Promise<boolean> {
  return upsertParticipantMemory(supabase, projectId, ACTIVITY_REVIEW, participantId, review)
}

/** List a Project's reviews (non-empty) for public display — chronological, with display names + creation date. */
export async function listActivityReviews(projectId: string): Promise<ActivityReviewEntry[]> {
  const entries = await listMemoryEntries(projectId, ACTIVITY_REVIEW)
  return entries.map((e) => ({ participantId: e.authorId, name: e.name, review: e.body, createdAt: e.createdAt }))
}

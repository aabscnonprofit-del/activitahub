// Organizer Public Presence — the read-only data assembly for the public Organizer Page. Both public
// routes (/o/[slug] and /organizers/[id]) render the SAME page from this single projection, so the
// organizer's public identity is consistent regardless of how it was reached.
//
// It owns no data. It reuses existing public projections (partitionOrganizerActivities, getOrganizerReviewFacts)
// and derives two additional FACTS from existing tables — participants hosted (project_participants) and the
// avatar (profiles.avatar_url). Facts only: no ratings, averages, scores, reputation, or gamification.

import { createAdminClient } from '@/lib/supabase/server'
import { partitionOrganizerActivities, type MarketplaceActivityCard } from '@/lib/activity-marketplace/cards'
import { getOrganizerReviewFacts, type OrganizerReviewFacts } from '@/lib/reviews/organizer-review-facts'
import type { PublicOrganizer } from '@/lib/types'

export interface OrganizerPublicPageData {
  activities: MarketplaceActivityCard[]
  completedActivities: MarketplaceActivityCard[]
  reviewFacts: OrganizerReviewFacts
  /** Total participants hosted across the organizer's COMPLETED public activities — the primary scale metric. */
  participantsHosted: number
  /** The organizer's public avatar (profiles.avatar_url), or null → the page shows an initials fallback. */
  avatarUrl: string | null
  /** Distinct activity categories the organizer runs (from their public activities). */
  categories: string[]
}

/** Approved participants across the organizer's completed public activities (existing project_participants). */
async function countParticipantsHosted(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  completedProjectIds: string[],
): Promise<number> {
  const ids = [...new Set(completedProjectIds)].filter(Boolean)
  if (ids.length === 0) return 0
  try {
    const { count } = await admin
      .from('project_participants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .in('project_id', ids)
    return count ?? 0
  } catch {
    return 0
  }
}

/** The organizer's public avatar url (existing profiles.avatar_url — public identity, read via service role). */
async function readAvatarUrl(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  organizerId: string,
): Promise<string | null> {
  try {
    const { data } = await admin.from('profiles').select('avatar_url').eq('id', organizerId).maybeSingle()
    const url = (data as { avatar_url?: string | null } | null)?.avatar_url
    return url && url.trim() ? url : null
  } catch {
    return null
  }
}

/** Assemble the full public Organizer Page projection for one organizer. Graceful, facts-only. */
export async function getOrganizerPublicPageData(org: PublicOrganizer): Promise<OrganizerPublicPageData> {
  const { current, completed } = await partitionOrganizerActivities(org.id, new Date().toISOString())
  const completedIds = completed.map((c) => c.projectId)
  const admin = await createAdminClient()
  const [reviewFacts, participantsHosted, avatarUrl] = await Promise.all([
    getOrganizerReviewFacts(completedIds),
    countParticipantsHosted(admin, completedIds),
    readAvatarUrl(admin, org.id),
  ])
  const categories = [...new Set((org.activities ?? []).map((a) => a.category).filter(Boolean))] as string[]
  return { activities: current, completedActivities: completed, reviewFacts, participantsHosted, avatarUrl, categories }
}

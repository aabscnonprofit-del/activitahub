// Organizer Review Facts — a read-only PROJECTION of objective review facts for the public Organizer Page.
// It owns no data: it counts Activity Reviews (project_activity_memory_items, memory_type = 'activity_review')
// that belong to the organizer's COMPLETED PUBLIC activities. The set of completed public activities comes from
// the shared completed-public-activities projection (via partitionOrganizerActivities) — completion is NOT
// re-derived here, and private / draft activities never participate (they are not in that set).
//
// Facts only — NO average rating, stars, score, ranking, trust/reputation level, weighting, sentiment, or
// recommendations. Never reads the Ticket System. Future Reputation/Trust layers should consume THIS projection
// rather than re-counting reviews.

import { createAdminClient } from '@/lib/supabase/server'

export interface OrganizerReviewFacts {
  /** Count of activity_review items on the organizer's completed public activities. */
  reviewsReceived: number
  /** Count of those completed public activities that have at least one review. */
  reviewedActivities: number
  /** Newest review creation date (ISO), or null when there are none. */
  latestReviewDate: string | null
}

const EMPTY: OrganizerReviewFacts = { reviewsReceived: 0, reviewedActivities: 0, latestReviewDate: null }

/**
 * Compute Organizer Review Facts from the organizer's COMPLETED PUBLIC activity project IDs (from the shared
 * completed projection). Only reviews attached to those activities are counted. Graceful EMPTY on error/absence.
 */
export async function getOrganizerReviewFacts(completedProjectIds: string[]): Promise<OrganizerReviewFacts> {
  const ids = [...new Set(completedProjectIds)].filter(Boolean)
  if (ids.length === 0) return EMPTY
  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('project_activity_memory_items')
      .select('project_id, created_at, body')
      .eq('memory_type', 'activity_review')
      .in('project_id', ids)
    const rows = ((data ?? []) as { project_id: string; created_at: string; body: string | null }[]).filter(
      (r) => typeof r.body === 'string' && r.body.trim().length > 0,
    )
    if (rows.length === 0) return EMPTY
    return {
      reviewsReceived: rows.length,
      reviewedActivities: new Set(rows.map((r) => r.project_id)).size,
      latestReviewDate: rows.reduce((max, r) => (r.created_at > max ? r.created_at : max), rows[0].created_at),
    }
  } catch {
    return EMPTY
  }
}

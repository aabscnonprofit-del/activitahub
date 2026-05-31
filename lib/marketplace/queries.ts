import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type {
  MarketplaceCard,
  MarketplaceActivityDetail,
  PublicOrganizer,
  PublicReview,
} from '@/lib/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
const BUCKET = 'venue-photos'

function publicUrl(sb: SupabaseServerClient, path: string): string {
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export type MarketplaceCardVM = MarketplaceCard & { cover_url: string | null }

/** Public catalogue search via search_marketplace(). */
export async function searchMarketplace(
  sb: SupabaseServerClient,
  filters: Record<string, string>
): Promise<MarketplaceCardVM[]> {
  const { data } = await sb.rpc('search_marketplace', { p_filters: filters })
  const cards = (data ?? []) as MarketplaceCard[]
  return cards.map((c) => ({
    ...c,
    cover_url: c.cover_path ? publicUrl(sb, c.cover_path) : null,
  }))
}

export type MarketplaceActivityVM = MarketplaceActivityDetail & {
  photo_urls: string[]
}

/** Single published activity detail via get_marketplace_activity(). */
export async function getMarketplaceActivity(
  sb: SupabaseServerClient,
  id: string
): Promise<MarketplaceActivityVM | null> {
  const { data } = await sb.rpc('get_marketplace_activity', { p_id: id })
  if (!data) return null
  const d = data as MarketplaceActivityDetail
  return { ...d, photo_urls: (d.photo_paths ?? []).map((p) => publicUrl(sb, p)) }
}

/** Public organizer profile + their published activities. */
export async function getPublicOrganizer(
  sb: SupabaseServerClient,
  userId: string
): Promise<PublicOrganizer | null> {
  const { data } = await sb.rpc('get_public_organizer', { p_user_id: userId })
  return (data as PublicOrganizer | null) ?? null
}

/** Approved public reviews for an activity. */
export async function getActivityReviews(
  sb: SupabaseServerClient,
  activityId: string
): Promise<PublicReview[]> {
  const { data } = await sb.rpc('get_activity_reviews', { p_activity_id: activityId })
  return (data ?? []) as PublicReview[]
}

/** Approved public reviews for an organizer. */
export async function getOrganizerReviews(
  sb: SupabaseServerClient,
  organizerId: string
): Promise<PublicReview[]> {
  const { data } = await sb.rpc('get_organizer_reviews', { p_organizer_id: organizerId })
  return (data ?? []) as PublicReview[]
}

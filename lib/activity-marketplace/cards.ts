// Activity Marketplace ("Local Activities") — the server query that builds public activity cards from the
// EXISTING published-project representation (no new activity/Local-Activity model). Local Activities is simply
// the catalog of published PUBLIC Projects: an "activity" is an APPROVED + PUBLISHED + PUBLIC project (business
// rule: published Projects WHERE visibility = 'public'). Each card composes
// the public prepared event (getPublicEventPlan — title/summary), its next public occurrence (date / location /
// capacity / price), and the public organizer profile (getPublicOrganizer). Only public-safe fields are
// returned — never owner_id or any draft/internal data. Filtering/sorting live in ./model (pure).

import { createAdminClient } from '@/lib/supabase/server'
import { getPublicEventPlan } from '@/lib/planning/load-public-event-plan'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import type { MarketplaceActivityCard } from './model'

export type { MarketplaceActivityCard } from './model'

/**
 * List the marketplace activities: APPROVED + PUBLISHED projects, each composed into a public-safe card from
 * the existing public readers. Reads server-side (admin client, same pattern as getPublicEventPlan) but exposes
 * only public-safe fields. Projects with no public prepared event are skipped.
 */
export async function listMarketplaceActivities(nowIso: string): Promise<MarketplaceActivityCard[]> {
  const admin = await createAdminClient()

  // Local Activities = published Projects WHERE visibility = 'public'. Publication and visibility are
  // independent, so BOTH are required (a published-but-private Project never appears here). The visibility
  // filter also degrades safely: if migration 059 is not yet applied, the query errors → projects is null →
  // an empty catalog (nothing is public until the column exists + the organizer opts in).
  const { data: projects } = await admin
    .from('projects')
    .select('id, owner_id, created_at')
    .eq('is_published', true)
    .eq('visibility', 'public')
    .not('approved_at', 'is', null)
    .order('created_at', { ascending: false })
  if (!projects) return []

  const organizerCache = new Map<string, Awaited<ReturnType<typeof getPublicOrganizer>>>()
  const cards: MarketplaceActivityCard[] = []

  for (const p of projects as { id: string; owner_id: string; created_at: string }[]) {
    const plan = await getPublicEventPlan(p.id)
    if (!plan) continue // no public prepared event → nothing to show

    const { data: occ } = await admin
      .from('occurrences')
      .select('starts_at, ends_at, location, capacity, price_cents')
      .eq('project_id', p.id)
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const o = occ as { starts_at?: string; ends_at?: string | null; location?: string | null; capacity?: number | null; price_cents?: number | null } | null

    if (!organizerCache.has(p.owner_id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organizerCache.set(p.owner_id, await getPublicOrganizer(admin as any, p.owner_id))
    }
    const organizer = organizerCache.get(p.owner_id) ?? null

    cards.push({
      projectId: p.id,
      title: plan.intendedExperience,
      summary: plan.concept || null,
      organizerName: organizer?.display_name ?? null,
      organizerSlug: organizer?.slug ?? null,
      location: o?.location ?? null,
      startsAt: o?.starts_at ?? null,
      endsAt: o?.ends_at ?? null,
      capacity: o?.capacity ?? null,
      priceCents: o?.price_cents ?? null,
      createdAt: p.created_at,
    })
  }

  return cards
}

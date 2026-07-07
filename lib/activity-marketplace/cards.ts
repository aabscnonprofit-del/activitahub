// Activity Marketplace ("Local Activities") — the server query that builds public activity cards from the
// EXISTING published-project representation (no new activity/Local-Activity model). Local Activities is simply
// the catalog of published PUBLIC Projects: an "activity" is an APPROVED + PUBLISHED + PUBLIC project (business
// rule: published Projects WHERE visibility = 'public'). Each card composes the public prepared event
// (getPublicEventPlan — title/summary), its next public occurrence (date / location / capacity / price), and the
// public organizer profile (getPublicOrganizer). Only public-safe fields are returned — never owner_id or any
// draft/internal data. Filtering/sorting live in ./model (pure).

import { createAdminClient } from '@/lib/supabase/server'
import { getPublicEventPlan } from '@/lib/planning/load-public-event-plan'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import { isProjectCompleted, representativeOccurrence } from './completed-public-activities'
import type { MarketplaceActivityCard } from './model'

export type { MarketplaceActivityCard } from './model'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>
interface ProjectRow { id: string; owner_id: string; created_at: string }

/** Compose public-safe cards from published-public-approved project rows. Projects with no public prepared
 *  event are skipped. Shared by the catalog and the per-organizer query so the same public-safe rule applies. */
async function composeActivityCards(admin: AdminClient, projects: ProjectRow[], nowIso: string): Promise<MarketplaceActivityCard[]> {
  const organizerCache = new Map<string, Awaited<ReturnType<typeof getPublicOrganizer>>>()
  const cards: MarketplaceActivityCard[] = []

  for (const p of projects) {
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

/**
 * List the marketplace activities: APPROVED + PUBLISHED + PUBLIC projects, each composed into a public-safe
 * card. Reads server-side (admin client) but exposes only public-safe fields.
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

  return composeActivityCards(admin, projects as ProjectRow[], nowIso)
}

interface OccRow { starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; price_cents: number | null }

/** An organizer's public activities partitioned into current (upcoming/ongoing) and completed (archive). */
export interface OrganizerActivities {
  current: MarketplaceActivityCard[]
  completed: MarketplaceActivityCard[]
}

/**
 * Partition ONE organizer's public activities into CURRENT and COMPLETED for their public Organizer Page —
 * the SAME public-safe rule (published + visibility = 'public' + approved), scoped to this organizer. Private /
 * published-private / draft-public Projects never appear.
 *
 * "Completed" is a read-only PROJECTION (no "completed" Project state, no new lifecycle). The completion rule
 * itself lives in the single shared module ./completed-public-activities (isProjectCompleted /
 * representativeOccurrence) — it is NOT restated here. Each Project falls into exactly ONE bucket — never both.
 * Completed are ordered newest-finished first. Degrades to empty when the visibility column is absent.
 */
export async function partitionOrganizerActivities(organizerId: string, nowIso: string): Promise<OrganizerActivities> {
  const admin = await createAdminClient()

  const { data: projects } = await admin
    .from('projects')
    .select('id, owner_id, created_at')
    .eq('owner_id', organizerId)
    .eq('is_published', true)
    .eq('visibility', 'public')
    .not('approved_at', 'is', null)
    .order('created_at', { ascending: false })
  if (!projects) return { current: [], completed: [] }

  const nowMs = new Date(nowIso).getTime()
  const organizerCache = new Map<string, Awaited<ReturnType<typeof getPublicOrganizer>>>()
  const current: MarketplaceActivityCard[] = []
  const completed: MarketplaceActivityCard[] = []

  for (const p of projects as ProjectRow[]) {
    const plan = await getPublicEventPlan(p.id)
    if (!plan) continue

    const { data: occRows } = await admin
      .from('occurrences')
      .select('starts_at, ends_at, location, capacity, price_cents')
      .eq('project_id', p.id)
      .order('starts_at', { ascending: true })
    const occs = (occRows ?? []) as OccRow[]
    // Completion rule lives in ./completed-public-activities (the single shared projection) — not inline here.
    const isCompleted = isProjectCompleted(occs, nowMs)
    const o = representativeOccurrence(occs, nowMs, isCompleted)

    if (!organizerCache.has(p.owner_id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organizerCache.set(p.owner_id, await getPublicOrganizer(admin as any, p.owner_id))
    }
    const organizer = organizerCache.get(p.owner_id) ?? null

    const card: MarketplaceActivityCard = {
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
    }
    if (isCompleted) completed.push(card)
    else current.push(card)
  }

  completed.sort((a, b) => new Date(b.startsAt ?? 0).getTime() - new Date(a.startsAt ?? 0).getTime())
  return { current, completed }
}

/**
 * Participant History — the completed PUBLIC activities where `userId` was an APPROVED participant. A read-only
 * projection over Project + Participants + the shared completed-public-activities rule (no history table/entity):
 * only published + visibility = 'public' + approved + COMPLETED, and only where the user was an approved
 * participant. Ticket ownership never grants history (participation is read from project_participants, never the
 * Ticket System). Newest-completed first; each activity appears once. Degrades to [] on any error.
 */
export async function listParticipantHistory(userId: string, nowIso: string): Promise<MarketplaceActivityCard[]> {
  const admin = await createAdminClient()

  // The user's APPROVED participations (the source of truth for attendance; unique per project).
  const { data: parts } = await admin.from('project_participants').select('project_id').eq('account_id', userId).eq('status', 'approved')
  const projectIds = [...new Set(((parts ?? []) as { project_id: string }[]).map((p) => p.project_id))]
  if (projectIds.length === 0) return []

  // Of those, the published + public + approved Projects (private / draft never appear).
  const { data: projects } = await admin
    .from('projects')
    .select('id, owner_id, created_at')
    .in('id', projectIds)
    .eq('is_published', true)
    .eq('visibility', 'public')
    .not('approved_at', 'is', null)
  if (!projects) return []

  const nowMs = new Date(nowIso).getTime()
  const organizerCache = new Map<string, Awaited<ReturnType<typeof getPublicOrganizer>>>()
  const cards: MarketplaceActivityCard[] = []

  for (const p of projects as ProjectRow[]) {
    const plan = await getPublicEventPlan(p.id)
    if (!plan) continue

    const { data: occRows } = await admin
      .from('occurrences')
      .select('starts_at, ends_at, location, capacity, price_cents')
      .eq('project_id', p.id)
      .order('starts_at', { ascending: true })
    const occs = (occRows ?? []) as OccRow[]
    if (!isProjectCompleted(occs, nowMs)) continue // only COMPLETED activities belong to history
    const o = representativeOccurrence(occs, nowMs, true) // its latest finished occurrence

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

  cards.sort((a, b) => new Date(b.startsAt ?? 0).getTime() - new Date(a.startsAt ?? 0).getTime())
  return cards
}

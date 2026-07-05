// Activity Marketplace — the public card model + pure filtering/sorting. No I/O, no server imports (so it is
// safe to import anywhere). An "activity" card is the public-safe projection of an APPROVED + PUBLISHED
// project; it carries no owner_id or internal data.

/** A public-safe marketplace card for one published activity. No owner_id / no internal data. */
export interface MarketplaceActivityCard {
  projectId: string
  title: string
  summary: string | null
  organizerName: string | null
  organizerSlug: string | null
  location: string | null
  startsAt: string | null
  endsAt: string | null
  capacity: number | null
  priceCents: number | null
  createdAt: string
}

/** Filters over the existing card data (all public-safe). */
export interface MarketplaceFilters {
  location?: string
  maxPriceCents?: number
  upcomingOnly?: boolean
}

/** Sort orders over the existing card data. */
export type MarketplaceSort = 'soonest' | 'newest' | 'price_low' | 'price_high'

/** Pure: filter cards by location substring / max price / upcoming. A card with no price is never priced out. */
export function filterActivities(cards: MarketplaceActivityCard[], filters: MarketplaceFilters): MarketplaceActivityCard[] {
  const loc = filters.location?.trim().toLowerCase()
  return cards.filter((c) => {
    if (loc && !(c.location ?? '').toLowerCase().includes(loc)) return false
    if (filters.maxPriceCents != null && c.priceCents != null && c.priceCents > filters.maxPriceCents) return false
    if (filters.upcomingOnly && !c.startsAt) return false
    return true
  })
}

/** Pure: sort cards. Soonest/newest/price; unknown start sorts last, unknown price sorts to the far end. */
export function sortActivities(cards: MarketplaceActivityCard[], sort: MarketplaceSort): MarketplaceActivityCard[] {
  const arr = [...cards]
  switch (sort) {
    case 'newest':
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'price_low':
      return arr.sort((a, b) => (a.priceCents ?? Number.POSITIVE_INFINITY) - (b.priceCents ?? Number.POSITIVE_INFINITY))
    case 'price_high':
      return arr.sort((a, b) => (b.priceCents ?? Number.NEGATIVE_INFINITY) - (a.priceCents ?? Number.NEGATIVE_INFINITY))
    case 'soonest':
    default:
      return arr.sort((a, b) => (a.startsAt ?? '9999-12-31').localeCompare(b.startsAt ?? '9999-12-31'))
  }
}

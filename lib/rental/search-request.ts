// Rental Search Request V1 — pure, deterministic mapper from RentalResource[] (Rental
// Taxonomy V1) into RentalSearchRequest[]. It only reshapes existing OPE data into a
// self-contained search intent per rental; it performs NO search.
//
// NO external APIs (Google/Yelp/etc.), NO marketplace, NO vendor/worker/sourcing
// network, NO UI, NO AI. Empty input → [] (never throws).

import type { RentalResource } from '@/lib/rental/taxonomy'

export interface RentalLocation {
  city: string | null
  region: string | null
  country: string | null
}

/** Caller-supplied context: event location (from OPE/PlannerOutput) + optional timing. */
export interface RentalSearchContext {
  location: RentalLocation
  eventDate?: string | null // ISO date if known, else null (OPE does not yet carry one)
  startTime?: string | null
  endTime?: string | null
}

export interface RentalSearchRequest {
  rental_key: string
  title: string
  quantity: number | null
  quantity_unit: string
  search_query: string // taxonomy query, scoped to the event location
  location: RentalLocation
  event_date: string | null
  start_time: string | null
  end_time: string | null
  delivery_required: boolean
  setup_required: boolean
  notes: string | null
}

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** "City, Region, Country" with blanks and duplicates dropped; "" when nothing is known. */
function locationString(loc: RentalLocation): string {
  const parts: string[] = []
  for (const raw of [loc.city, loc.region, loc.country]) {
    const v = (raw ?? '').trim()
    if (v && !parts.some((p) => p.toLowerCase() === v.toLowerCase())) parts.push(v)
  }
  return parts.join(', ')
}

/** Map one RentalResource to a self-contained search request. */
export function toRentalSearchRequest(rental: RentalResource, ctx: RentalSearchContext): RentalSearchRequest {
  const qtyLabel = rental.quantity != null ? ` × ${rental.quantity}` : ''
  const title = `${cap(rental.keywords[0] ?? rental.label)}${qtyLabel}`

  const locStr = locationString(ctx.location)
  const search_query = locStr ? `${rental.search_query} in ${locStr}` : rental.search_query

  const noteParts: string[] = []
  if (rental.delivery_required) noteParts.push('delivery required')
  if (rental.setup_required) noteParts.push('setup required')
  const notes = noteParts.length ? `${cap(noteParts.join(', '))}.` : null

  return {
    rental_key: rental.rental_key,
    title,
    quantity: rental.quantity ?? null,
    quantity_unit: rental.quantity_unit,
    search_query,
    location: ctx.location,
    event_date: ctx.eventDate ?? null,
    start_time: ctx.startTime ?? null,
    end_time: ctx.endTime ?? null,
    delivery_required: rental.delivery_required,
    setup_required: rental.setup_required,
    notes,
  }
}

/**
 * RentalResource[] → RentalSearchRequest[]. Order-preserving; empty input yields [].
 * Uses only the rentals + the supplied OPE location/timing — no external lookups.
 */
export function buildRentalSearchRequests(
  rentals: RentalResource[],
  ctx: RentalSearchContext,
): RentalSearchRequest[] {
  return rentals.map((r) => toRentalSearchRequest(r, ctx))
}

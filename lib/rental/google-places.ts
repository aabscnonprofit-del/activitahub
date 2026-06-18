// Google Places API (New) transport for Real Supplier Discovery V1 — the first
// production PlaceSearchFn. It plugs into the EXISTING RealDiscoveryProvider /
// PlaceSearchFn seam (no model/provider redesign).
//
// OPT-IN ONLY: requires GOOGLE_PLACES_API_KEY. With no key the factory returns null →
// RealDiscoveryProvider treats it as a no-op ([]). Any API failure / non-200 / timeout /
// malformed response → [] (never throws). `fetch` is injectable so tests never make a
// live network call.
//
// Out of scope: OSM/Yelp/SerpAPI, quotes, messaging, email, booking, vendor accounts,
// marketplace, UI, docs.

import type { PlaceSearchFn, RawPlace } from '@/lib/rental/real-discovery'
import { RealDiscoveryProvider } from '@/lib/rental/real-discovery'
import { SupplierDiscoveryService } from '@/lib/rental/supplier-discovery'

/** Minimal fetch shape so tests can inject a stub without the full DOM Response type. */
export interface FetchLike {
  (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
  ): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>
}

export interface GooglePlacesOptions {
  apiKey?: string // defaults to process.env.GOOGLE_PLACES_API_KEY
  fetchImpl?: FetchLike // defaults to global fetch; injected in tests
  endpoint?: string // defaults to the Places API (New) Text Search endpoint
  timeoutMs?: number // defaults to 8000
}

const TEXT_SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
// Only the fields we map — keeps the billing field mask tight.
const FIELD_MASK =
  'places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.addressComponents'

interface GoogleAddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}
interface GooglePlace {
  displayName?: { text?: string }
  formattedAddress?: string
  internationalPhoneNumber?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  addressComponents?: GoogleAddressComponent[]
}

/** Pull the city (locality) from Google address components, if present. */
function localityOf(components: GoogleAddressComponent[] | undefined): string | null {
  if (!Array.isArray(components)) return null
  const locality = components.find((c) => Array.isArray(c.types) && c.types.includes('locality'))
  return (locality?.longText ?? locality?.shortText ?? '').trim() || null
}

/** Map one Google place into a RawPlace, or null when it has no usable name. */
function mapGooglePlace(p: GooglePlace, fallbackCity: string | null): RawPlace | null {
  const name = p.displayName?.text?.trim()
  if (!name) return null
  return {
    name,
    website: p.websiteUri?.trim() || null,
    phone: (p.internationalPhoneNumber || p.nationalPhoneNumber || '').trim() || null,
    address: p.formattedAddress?.trim() || null,
    city: localityOf(p.addressComponents) || fallbackCity || null,
  }
}

/** Parse a Places API (New) searchText response into RawPlace[]. Defensive. */
export function parseGooglePlaces(data: unknown, fallbackCity: string | null): RawPlace[] {
  const places = (data as { places?: unknown[] } | null)?.places
  if (!Array.isArray(places)) return []
  return places
    .map((p) => mapGooglePlace(p as GooglePlace, fallbackCity))
    .filter((r): r is RawPlace => r !== null)
}

/**
 * Build a Google Places (New) PlaceSearchFn. Returns null when no API key is available
 * (so RealDiscoveryProvider stays a safe no-op). The transport posts a Text Search query
 * built from the request's location-scoped search_query and maps results to RawPlace[].
 */
export function createGooglePlaceSearch(opts: GooglePlacesOptions = {}): PlaceSearchFn | null {
  const apiKey = opts.apiKey ?? process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null // not configured → no-op

  const fetchImpl = opts.fetchImpl ?? (globalThis as { fetch?: FetchLike }).fetch
  const endpoint = opts.endpoint ?? TEXT_SEARCH_ENDPOINT
  const timeoutMs = opts.timeoutMs ?? 8_000

  return async ({ query, city, limit }) => {
    if (!fetchImpl) return [] // no fetch available → safe no-op
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: Math.min(Math.max(limit, 1), 20) }),
        signal: controller.signal,
      })
      if (!res.ok) return []
      return parseGooglePlaces(await res.json(), city)
    } catch {
      return [] // network / abort / parse error → graceful empty
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * Convenience: a discovery service backed by the real provider using Google Places.
 * When no key is configured, the real provider falls back to its own no-op ([]).
 */
export function createGoogleDiscoveryService(opts: GooglePlacesOptions = {}): SupplierDiscoveryService {
  const search = createGooglePlaceSearch(opts) ?? undefined
  return new SupplierDiscoveryService([new RealDiscoveryProvider({ search })])
}

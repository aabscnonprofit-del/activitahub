// Real Supplier Discovery V1 — the first real-world discovery capability, built on the
// EXISTING provider architecture (SupplierDiscoveryProvider / SupplierCandidate /
// SupplierDiscoveryService are unchanged). The MockDiscoveryProvider stays intact for
// deterministic tests.
//
// "Real" data comes from an INJECTABLE transport (PlaceSearchFn): the provider builds a
// query from the RentalSearchRequest, calls the transport, and maps raw places into
// SupplierCandidate[] with confidence scoring. The default transport is OPT-IN (it needs
// SUPPLIER_DISCOVERY_URL) and OFF by default — so with nothing configured the provider is
// a safe no-op (returns []) and never makes a surprise network call. Any failure /
// timeout / disabled state → [] (never throws).
//
// Out of scope (NOT here): quotes, messaging, email, booking, vendor onboarding/accounts,
// vendor/worker networks, marketplace, UI.

import type { RentalSearchRequest } from '@/lib/rental/search-request'
import type { SupplierCandidate, SupplierDiscoveryProvider } from '@/lib/rental/supplier-discovery'
import { SupplierDiscoveryService, MockDiscoveryProvider } from '@/lib/rental/supplier-discovery'

/** A raw place record returned by a discovery transport (normalized, source-agnostic). */
export interface RawPlace {
  name: string
  website?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
}

/** Injectable transport: text query + city → raw places. Plug in a real source here. */
export type PlaceSearchFn = (args: { query: string; city: string | null; limit: number }) => Promise<RawPlace[]>

export interface RealDiscoveryOptions {
  /** The real data source. When omitted, the env-configured default (or a no-op) is used. */
  search?: PlaceSearchFn
  maxResults?: number
}

const slug = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'supplier'

/** Confidence from result rank + how complete the contact info is. Deterministic. */
function confidenceFor(place: RawPlace, rank: number): number {
  let c = 0.8 - rank * 0.1
  if (place.website) c += 0.1
  if (place.phone) c += 0.05
  if (place.address) c += 0.05
  return Math.round(Math.min(0.95, Math.max(0.1, c)) * 100) / 100
}

/** Map a raw place to a SupplierCandidate for a given request (pure). */
function toCandidate(request: RentalSearchRequest, place: RawPlace, rank: number): SupplierCandidate {
  const name = place.name.trim()
  return {
    id: `real:${request.rental_key}:${slug(name)}`,
    name,
    category: request.rental_key,
    website: place.website?.trim() || null,
    phone: place.phone?.trim() || null,
    address: place.address?.trim() || null,
    city: place.city?.trim() || request.location.city || null,
    source: 'real',
    confidence: confidenceFor(place, rank),
  }
}

/**
 * The env-configured default transport (opt-in). Returns null unless
 * SUPPLIER_DISCOVERY_URL is set; when set, GETs `${URL}?q=&city=&limit=` and expects a
 * JSON array of RawPlace. 8s timeout; any error → []. No API key is hardcoded — point
 * it at your own places source/proxy.
 */
export function defaultPlaceSearch(): PlaceSearchFn | null {
  const base = process.env.SUPPLIER_DISCOVERY_URL
  if (!base) return null
  return async ({ query, city, limit }) => {
    const url = `${base}${base.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}&city=${encodeURIComponent(city ?? '')}&limit=${limit}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
      if (!res.ok) return []
      const data = (await res.json()) as unknown
      return Array.isArray(data) ? (data as RawPlace[]) : []
    } catch {
      return []
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * Real discovery provider. Same SupplierDiscoveryProvider interface as the mock, so the
 * service can run either or both. Returns [] when no transport is configured or on any
 * failure — never throws.
 */
export class RealDiscoveryProvider implements SupplierDiscoveryProvider {
  readonly name = 'real'
  constructor(private readonly opts: RealDiscoveryOptions = {}) {}

  async discover(request: RentalSearchRequest): Promise<SupplierCandidate[]> {
    const search = this.opts.search ?? defaultPlaceSearch()
    if (!search) return [] // not configured → safe no-op

    const limit = this.opts.maxResults ?? 5
    let places: RawPlace[]
    try {
      places = await search({ query: request.search_query, city: request.location.city, limit })
    } catch {
      return []
    }
    if (!Array.isArray(places)) return []

    return places
      .filter((p) => p && typeof p.name === 'string' && p.name.trim())
      .slice(0, limit)
      .map((p, i) => toCandidate(request, p, i))
  }
}

/** A service backed by the real provider only. */
export function createRealDiscoveryService(opts: RealDiscoveryOptions = {}): SupplierDiscoveryService {
  return new SupplierDiscoveryService([new RealDiscoveryProvider(opts)])
}

/**
 * A service running BOTH providers through the same interface: real first, mock as a
 * deterministic fallback/supplement. Candidates are deduped by id ('real:' vs 'mock:'
 * never collide).
 */
export function createHybridDiscoveryService(opts: RealDiscoveryOptions = {}): SupplierDiscoveryService {
  return new SupplierDiscoveryService([new RealDiscoveryProvider(opts), new MockDiscoveryProvider()])
}

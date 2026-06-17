// Supplier Discovery V1 — the layer after RentalSearchRequest. Given a rental search
// request it returns candidate suppliers (SupplierCandidate[]). V1 ships a DETERMINISTIC
// MOCK provider only — it validates the end-to-end pipeline without any external API.
//
// Pipeline: Requirement → RentalSearchRequest → Supplier Discovery → SupplierCandidate[]
//
// Out of scope (NOT implemented here): RFQ, quotes, messaging, booking, vendor
// onboarding/accounts, vendor/worker networks, marketplace. No external APIs, no network.

import type { RentalSearchRequest } from '@/lib/rental/search-request'

/** A discovered supplier candidate (V1 minimal — no ratings/reviews/pricing/accounts). */
export interface SupplierCandidate {
  id: string
  name: string
  category: string // the rental_key this candidate serves, e.g. 'chair_rental'
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  source: string // provider name, e.g. 'mock'
  confidence: number // 0..1, provider's confidence this candidate fits the request
}

/** A discovery provider. The service can run several; more providers can be added later. */
export interface SupplierDiscoveryProvider {
  readonly name: string
  discover(request: RentalSearchRequest): SupplierCandidate[] | Promise<SupplierCandidate[]>
}

/** Sourcing output: a rental search request with its discovered supplier candidates. */
export interface SourcingResult {
  request: RentalSearchRequest
  candidates: SupplierCandidate[]
}

const slug = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'local'

/** Group a rental_key into a supplier "trade" so the mock can name plausible companies. */
function tradeFor(rentalKey: string): string {
  if (/chair|table|registration/.test(rentalKey)) return 'furniture'
  if (/tent|stage|dance_floor/.test(rentalKey)) return 'structures'
  if (/audio|projector/.test(rentalKey)) return 'av'
  if (/lighting/.test(rentalKey)) return 'lighting'
  if (/tableware/.test(rentalKey)) return 'tableware'
  if (/grill/.test(rentalKey)) return 'catering'
  if (/power/.test(rentalKey)) return 'power'
  if (/heater/.test(rentalKey)) return 'climate'
  if (/restroom/.test(rentalKey)) return 'sanitation'
  if (/decor/.test(rentalKey)) return 'decor'
  if (/venue/.test(rentalKey)) return 'venue'
  return 'equipment'
}

// Three deterministic company-name templates per trade ({city} is substituted).
const NAME_TEMPLATES: Record<string, string[]> = {
  furniture: ['{city} Party Rentals', '{city} Event Furniture Co.', '{city} Table & Chair Hire'],
  structures: ['{city} Tent & Event Structures', '{city} Marquee Hire', '{city} Staging & Canopies'],
  av: ['{city} AV Rentals', '{city} Sound & Vision Hire', '{city} Event Tech Rentals'],
  lighting: ['{city} Event Lighting Co.', '{city} Stage Lighting Hire', '{city} Lighting Rentals'],
  tableware: ['{city} Catering Supplies & Linens', '{city} Tableware Hire', '{city} Linen & Glassware Rentals'],
  catering: ['{city} BBQ & Catering Equipment', '{city} Grill Rentals', '{city} Catering Equipment Hire'],
  power: ['{city} Generator Rentals', '{city} Event Power Hire', '{city} Portable Power Rentals'],
  climate: ['{city} Patio Heater Rentals', '{city} Event Climate Hire', '{city} Heater Rentals'],
  sanitation: ['{city} Portable Restroom Rentals', '{city} Event Sanitation Hire', '{city} Restroom Trailer Rentals'],
  decor: ['{city} Event Decor Rentals', '{city} Centerpiece & Backdrop Hire', '{city} Decor Rentals'],
  venue: ['{city} Event Venues', '{city} Banquet Halls', '{city} Function Rooms'],
  equipment: ['{city} Event Equipment Rentals', '{city} Party Rentals', '{city} Event Rentals Co.'],
}

const CONFIDENCE = [0.9, 0.75, 0.6] // by candidate index (deterministic, decreasing)

/**
 * Deterministic mock discovery provider — for validating the pipeline only. For each
 * request it returns three plausible local rental companies derived purely from the
 * request's rental_key + city (no randomness, no I/O). Same request → same candidates.
 */
export class MockDiscoveryProvider implements SupplierDiscoveryProvider {
  readonly name = 'mock'

  discover(request: RentalSearchRequest): SupplierCandidate[] {
    const city = (request.location.city ?? '').trim()
    const cityLabel = city || 'Local'
    const citySlug = slug(city || 'local')
    const templates = NAME_TEMPLATES[tradeFor(request.rental_key)] ?? NAME_TEMPLATES.equipment

    return templates.map((tpl, i) => {
      const name = tpl.replace('{city}', cityLabel)
      const nameSlug = slug(name)
      return {
        id: `mock:${request.rental_key}:${citySlug}:${i + 1}`,
        name,
        category: request.rental_key,
        website: `https://example.com/suppliers/${nameSlug}`,
        phone: null,
        address: null,
        city: city || null,
        source: this.name,
        confidence: CONFIDENCE[i] ?? 0.5,
      }
    })
  }
}

/**
 * Supplier Discovery Service — accepts a RentalSearchRequest, runs the configured
 * provider(s), and returns SupplierCandidate[] (deduped by id). Designed for multiple
 * providers; V1 uses the mock provider only.
 */
export class SupplierDiscoveryService {
  constructor(private readonly providers: SupplierDiscoveryProvider[]) {}

  async discover(request: RentalSearchRequest): Promise<SupplierCandidate[]> {
    const seen = new Set<string>()
    const out: SupplierCandidate[] = []
    for (const provider of this.providers) {
      const candidates = await provider.discover(request)
      for (const c of candidates) {
        if (!seen.has(c.id)) {
          seen.add(c.id)
          out.push(c)
        }
      }
    }
    return out
  }

  /** Sourcing integration: attach candidates to each rental search request. */
  async discoverForRequests(requests: RentalSearchRequest[]): Promise<SourcingResult[]> {
    const results: SourcingResult[] = []
    for (const request of requests) {
      results.push({ request, candidates: await this.discover(request) })
    }
    return results
  }
}

/** The default V1 service: mock provider only. */
export function createDefaultDiscoveryService(): SupplierDiscoveryService {
  return new SupplierDiscoveryService([new MockDiscoveryProvider()])
}

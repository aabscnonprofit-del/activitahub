// Real Supplier Discovery V1 — deterministic test via an INJECTED stub transport (no
// real network). Proves the provider works, raw places map into SupplierCandidate, the
// no-transport case is a safe no-op, hybrid (real+mock) runs through one service, and
// the existing mock pipeline is untouched.
//
//   Run:  npx tsx scripts/real-discovery-test.mts   (or: npm run test:real-discovery)

import { assembleOpeOutput } from '../lib/ope/output-contract'
import { generatePlan } from '../lib/ope/index'
import { mapResourcesToRentals } from '../lib/rental/taxonomy'
import { buildRentalSearchRequests } from '../lib/rental/search-request'
import { createDefaultDiscoveryService, type SupplierCandidate } from '../lib/rental/supplier-discovery'
import { RealDiscoveryProvider, createHybridDiscoveryService, type PlaceSearchFn, type RawPlace } from '../lib/rental/real-discovery'
import { generateRfqs } from '../lib/rental/rfq'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const REQUIRED = ['id', 'name', 'category', 'website', 'phone', 'address', 'city', 'source', 'confidence'] as const
const valid = (c: SupplierCandidate) => REQUIRED.every((f) => f in c) && c.confidence > 0 && c.confidence <= 1

// Deterministic stub transport: returns fixture places per query (no network).
const stubFixtures: Record<string, RawPlace[]> = {
  chair: [
    { name: 'Island Event Rentals', website: 'https://islandeventrentals.example', phone: '+1-808-555-0101', address: '12 Ala Moana Blvd', city: 'Honolulu' },
    { name: 'Aloha Party Hire', website: 'https://alohapartyhire.example', phone: '+1-808-555-0102', address: '88 King St', city: 'Honolulu' },
    { name: 'Pacific Chair Co', website: null, phone: '+1-808-555-0103', address: null, city: 'Honolulu' },
  ],
  table: [
    { name: 'Island Event Rentals', website: 'https://islandeventrentals.example', phone: '+1-808-555-0101', address: '12 Ala Moana Blvd', city: 'Honolulu' },
    { name: 'Kapolei Table & Linen', website: 'https://kapoleitable.example', phone: null, address: '5 Kapolei Pkwy', city: 'Kapolei' },
  ],
}
const stubSearch: PlaceSearchFn = async ({ query, limit }) => {
  const key = /chair/.test(query) ? 'chair' : /table/.test(query) ? 'table' : ''
  return (stubFixtures[key] ?? []).slice(0, limit)
}

const LOC = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }
function requestsFor(input: PlannerInput) {
  const out = assembleOpeOutput(generatePlan(input).plan as PlannerOutput)
  return buildRentalSearchRequests(mapResourcesToRentals(out.resources), {
    location: { city: out.event_summary.location.city, region: out.event_summary.location.region, country: out.event_summary.location.country },
  })
}

// ── Provider works + maps raw places → SupplierCandidate ────────────────────
console.log('Real provider (injected stub) → SupplierCandidate[]:')
{
  const provider = new RealDiscoveryProvider({ search: stubSearch })
  const chairReq = requestsFor({ category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600, specialRequirements: [], location: LOC })
    .find((r) => r.rental_key === 'chair_rental')!
  const candidates = await provider.discover(chairReq)
  for (const c of candidates) console.log(`   • ${c.name} (conf=${c.confidence}) site=${c.website} phone=${c.phone}`)
  check('returns candidates from the transport', candidates.length === 3)
  check('all valid + source=real + category=chair_rental', candidates.every((c) => valid(c) && c.source === 'real' && c.category === 'chair_rental'))
  check('real fields populated (name/website/phone/address/city)',
    candidates[0].name === 'Island Event Rentals' && candidates[0].website?.includes('islandeventrentals') && !!candidates[0].phone && !!candidates[0].address && candidates[0].city === 'Honolulu')
  check('confidence reflects completeness + rank (complete first > sparse last)',
    candidates[0].confidence > candidates[2].confidence)
  check('ids stable + source-prefixed', candidates.every((c) => c.id.startsWith('real:chair_rental:')))
}

// ── No transport → safe no-op (does not throw, returns []) ─────────────────
console.log('\nNo transport configured → safe no-op:')
{
  const provider = new RealDiscoveryProvider() // no search, env unset → defaultPlaceSearch() null
  const req = requestsFor({ category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450, specialRequirements: [], location: LOC })[0]
  const candidates = await provider.discover(req)
  check('disabled provider returns [] (no crash)', Array.isArray(candidates) && candidates.length === 0)

  const throwing = new RealDiscoveryProvider({ search: async () => { throw new Error('network down') } })
  check('transport error → [] (no crash)', (await throwing.discover(req)).length === 0)
}

// ── Hybrid: real + mock through the SAME service interface ──────────────────
console.log('\nHybrid service (real + mock, same interface):')
{
  const service = createHybridDiscoveryService({ search: stubSearch })
  const chairReq = requestsFor({ category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600, specialRequirements: [], location: LOC })
    .find((r) => r.rental_key === 'chair_rental')!
  const candidates = await service.discover(chairReq)
  const sources = new Set(candidates.map((c) => c.source))
  check('hybrid returns both real and mock candidates', sources.has('real') && sources.has('mock'))
  check('ids unique across providers (real: vs mock:)', new Set(candidates.map((c) => c.id)).size === candidates.length)
  // End-to-end: real candidates flow into RFQ generation.
  const sourcing = await service.discoverForRequests([chairReq])
  const rfqs = generateRfqs(sourcing)
  check('real candidates produce linked RFQs', rfqs.some((r) => r.supplierId.startsWith('real:')) && rfqs.every((r) => candidates.some((c) => c.id === r.supplierId)))
}

// ── Existing mock pipeline untouched ────────────────────────────────────────
console.log('\nMock pipeline intact:')
{
  const mock = createDefaultDiscoveryService()
  const req = requestsFor({ category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450, specialRequirements: [], location: LOC })
    .find((r) => r.rental_key === 'grill_rental')!
  const a = await mock.discover(req)
  const b = await mock.discover(req)
  check('mock still deterministic + source=mock', a.length >= 3 && a.every((c) => c.source === 'mock') && JSON.stringify(a) === JSON.stringify(b))
}

console.log('')
if (failures === 0) {
  console.log('Real Supplier Discovery V1 OK — real provider maps places → SupplierCandidate[]; no-op safe; hybrid + mock intact.')
  process.exit(0)
} else {
  console.log(`Real Supplier Discovery V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

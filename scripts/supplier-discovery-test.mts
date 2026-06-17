// Supplier Discovery V1 — deterministic mock-provider test (no external API, no network).
// Proves the full pipeline: Requirement → RentalSearchRequest → Supplier Discovery →
// SupplierCandidate[], for chair_rental and table_rental, with deterministic output.
//
//   Run:  npx tsx scripts/supplier-discovery-test.mts   (or: npm run test:supplier)

import { assembleOpeOutput } from '../lib/ope/output-contract'
import { generatePlan } from '../lib/ope/index'
import { mapResourcesToRentals } from '../lib/rental/taxonomy'
import { buildRentalSearchRequests, type RentalLocation, type RentalSearchRequest } from '../lib/rental/search-request'
import {
  MockDiscoveryProvider, createDefaultDiscoveryService, type SupplierCandidate,
} from '../lib/rental/supplier-discovery'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const REQUIRED_FIELDS = ['id', 'name', 'category', 'website', 'phone', 'address', 'city', 'source', 'confidence'] as const
const validCandidate = (c: SupplierCandidate) =>
  REQUIRED_FIELDS.every((f) => f in c) && !!c.id && !!c.name && c.source === 'mock' && c.confidence > 0 && c.confidence <= 1

// Full pipeline: PlannerInput → OPE → rentals → requests → discovery.
function pipeline(input: PlannerInput) {
  const out = assembleOpeOutput(generatePlan(input).plan as PlannerOutput)
  const loc: RentalLocation = {
    city: out.event_summary.location.city, region: out.event_summary.location.region, country: out.event_summary.location.country,
  }
  const requests = buildRentalSearchRequests(mapResourcesToRentals(out.resources), { location: loc })
  return requests
}

const LOC = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }
const service = createDefaultDiscoveryService()

// ── chair_rental → SupplierCandidate[] ──────────────────────────────────────
console.log('chair_rental → suppliers:')
{
  const requests = pipeline({
    category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
    specialRequirements: [], location: LOC,
  })
  const chairReq = requests.find((r) => r.rental_key === 'chair_rental')!
  check('chair_rental request exists', !!chairReq)
  const candidates = await service.discover(chairReq)
  for (const c of candidates) console.log(`   • ${c.name} (${c.category}, conf=${c.confidence}) ${c.website}`)
  check('chair_rental returns several candidates (≥3)', candidates.length >= 3)
  check('every candidate is valid + category=chair_rental', candidates.every((c) => validCandidate(c) && c.category === 'chair_rental'))
  check('candidate ids are unique', new Set(candidates.map((c) => c.id)).size === candidates.length)
  check('confidence is descending', candidates.every((c, i) => i === 0 || candidates[i - 1].confidence >= c.confidence))
}

// ── table_rental → SupplierCandidate[] ──────────────────────────────────────
console.log('\ntable_rental → suppliers:')
{
  const requests = pipeline({
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: [], location: LOC,
  })
  const tableReq = requests.find((r) => r.rental_key === 'table_rental')!
  check('table_rental request exists', !!tableReq)
  const candidates = await service.discover(tableReq)
  for (const c of candidates) console.log(`   • ${c.name} (${c.category}, conf=${c.confidence})`)
  check('table_rental returns several candidates (≥3)', candidates.length >= 3)
  check('every candidate valid + category=table_rental', candidates.every((c) => validCandidate(c) && c.category === 'table_rental'))
}

// ── Determinism ─────────────────────────────────────────────────────────────
console.log('\nDeterminism:')
{
  const req: RentalSearchRequest = {
    rental_key: 'chair_rental', title: 'Folding chairs × 40', quantity: 40, quantity_unit: 'chairs',
    search_query: 'folding chairs rental in Honolulu, USA',
    location: { city: 'Honolulu', region: 'HI', country: 'USA' },
    event_date: null, start_time: null, end_time: null, delivery_required: true, setup_required: true, notes: null,
  }
  const a = await service.discover(req)
  const b = await new MockDiscoveryProvider().discover(req)
  check('same request → identical candidates (deterministic)', JSON.stringify(a) === JSON.stringify(b))
  check('candidate id encodes rental_key + city', a[0].id.startsWith('mock:chair_rental:honolulu:'))
}

// ── Sourcing integration: requests → SourcingResult[] ──────────────────────
console.log('\nSourcing integration (requests → candidates attached):')
{
  const requests = pipeline({
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: [], location: LOC,
  })
  const sourcing = await service.discoverForRequests(requests)
  console.log(`   ${sourcing.length} sourcing results: ${sourcing.map((s) => `${s.request.rental_key}(${s.candidates.length})`).join(', ')}`)
  check('one sourcing result per request', sourcing.length === requests.length)
  check('every request has ≥1 candidate', sourcing.every((s) => s.candidates.length >= 1))
  check('candidates carry their request rental_key as category', sourcing.every((s) => s.candidates.every((c) => c.category === s.request.rental_key)))
  // empty requests → empty sourcing (no crash)
  check('empty requests → [] (no crash)', (await service.discoverForRequests([])).length === 0)
}

console.log('')
if (failures === 0) {
  console.log('Supplier Discovery V1 OK — RentalSearchRequest → SupplierCandidate[] (mock, deterministic); full pipeline works.')
  process.exit(0)
} else {
  console.log(`Supplier Discovery V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

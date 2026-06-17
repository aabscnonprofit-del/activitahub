// RFQ Generation V1 — deterministic test (no sending, no messaging, no network).
// Proves the full pipeline: Requirement → RentalSearchRequest → Supplier Discovery →
// RFQPackage[], with correct supplier linkage, batch fan-out, and stable output.
//
//   Run:  npx tsx scripts/rfq-test.mts   (or: npm run test:rfq)

import { assembleOpeOutput } from '../lib/ope/output-contract'
import { generatePlan } from '../lib/ope/index'
import { mapResourcesToRentals } from '../lib/rental/taxonomy'
import { buildRentalSearchRequests, type RentalSearchRequest } from '../lib/rental/search-request'
import { createDefaultDiscoveryService, type SupplierCandidate } from '../lib/rental/supplier-discovery'
import { generateRfq, generateRfqs } from '../lib/rental/rfq'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const REQUIRED = ['id', 'category', 'quantity', 'eventDate', 'deliveryDateTime', 'pickupDateTime', 'location', 'notes', 'supplierId'] as const
const LOC = { city: 'Kapolei', state: 'HI', country: 'USA', postalCode: null }
const service = createDefaultDiscoveryService()

// Full pipeline → SourcingResult[] with a concrete event date + delivery/pickup times.
async function sourcingFor(input: PlannerInput) {
  const out = assembleOpeOutput(generatePlan(input).plan as PlannerOutput)
  const requests = buildRentalSearchRequests(mapResourcesToRentals(out.resources), {
    location: { city: out.event_summary.location.city, region: out.event_summary.location.region, country: out.event_summary.location.country },
    eventDate: '2026-07-12', startTime: '13:00', endTime: '22:00',
  })
  return service.discoverForRequests(requests)
}

// ── Single RFQ generation (the worked example: 50 chairs, Kapolei, Jul 12) ──
console.log('Single RFQ (50 chairs, Kapolei, Jul 12, deliver 13:00 / pickup 22:00):')
{
  const request: RentalSearchRequest = {
    rental_key: 'chair_rental', title: 'Folding chairs × 50', quantity: 50, quantity_unit: 'chairs',
    search_query: 'folding chairs rental in Kapolei, USA',
    location: { city: 'Kapolei', region: 'HI', country: 'USA' },
    event_date: '2026-07-12', start_time: '13:00', end_time: '22:00', delivery_required: true, setup_required: true, notes: 'Delivery required, setup required.',
  }
  const supplier: SupplierCandidate = {
    id: 'mock:chair_rental:kapolei:1', name: 'Kapolei Party Rentals', category: 'chair_rental',
    website: null, phone: null, address: null, city: 'Kapolei', source: 'mock', confidence: 0.9,
  }
  const rfq = generateRfq(request, supplier)
  console.log(`   ${JSON.stringify(rfq)}`)
  check('has all RFQ fields', REQUIRED.every((f) => f in rfq))
  check('category = chair_rental', rfq.category === 'chair_rental')
  check('quantity = 50', rfq.quantity === 50)
  check('eventDate = 2026-07-12', rfq.eventDate === '2026-07-12')
  check('deliveryDateTime = 2026-07-12T13:00', rfq.deliveryDateTime === '2026-07-12T13:00')
  check('pickupDateTime = 2026-07-12T22:00', rfq.pickupDateTime === '2026-07-12T22:00')
  check('supplierId links the candidate', rfq.supplierId === supplier.id)
  check('location carried', rfq.location.city === 'Kapolei')
}

// ── Batch: chair_rental → 3 suppliers → 3 RFQs ──────────────────────────────
console.log('\nBatch (chair_rental → 3 suppliers → 3 RFQs):')
{
  const sourcing = await sourcingFor({
    category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
    specialRequirements: [], location: LOC,
  })
  const chair = sourcing.find((s) => s.request.rental_key === 'chair_rental')!
  const rfqs = generateRfqs([chair])
  for (const r of rfqs) console.log(`   • ${r.id} → supplier ${r.supplierId} (${r.category}, qty ${r.quantity})`)
  check('chair_rental yields one RFQ per supplier', rfqs.length === chair.candidates.length && rfqs.length >= 3)
  check('every RFQ supplierId matches a discovered candidate',
    rfqs.every((r) => chair.candidates.some((c) => c.id === r.supplierId)))
  check('every RFQ category = chair_rental', rfqs.every((r) => r.category === 'chair_rental'))
  check('RFQ ids unique', new Set(rfqs.map((r) => r.id)).size === rfqs.length)
}

// ── Full batch over a plan (all rentals) ────────────────────────────────────
console.log('\nFull batch (bbq plan → all RFQs):')
{
  const sourcing = await sourcingFor({
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: [], location: LOC,
  })
  const rfqs = generateRfqs(sourcing)
  const totalCandidates = sourcing.reduce((n, s) => n + s.candidates.length, 0)
  console.log(`   requests=${sourcing.length} candidates=${totalCandidates} rfqs=${rfqs.length} keys=[${[...new Set(rfqs.map((r) => r.category))].join(', ')}]`)
  check('one RFQ per (request × supplier)', rfqs.length === totalCandidates)
  check('every RFQ links a real candidate',
    rfqs.every((r) => sourcing.some((s) => s.candidates.some((c) => c.id === r.supplierId))))
  check('empty sourcing → [] (no crash)', generateRfqs([]).length === 0)
}

// ── Determinism ─────────────────────────────────────────────────────────────
console.log('\nDeterminism:')
{
  const s1 = await sourcingFor({ category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450, specialRequirements: [], location: LOC })
  const s2 = await sourcingFor({ category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450, specialRequirements: [], location: LOC })
  check('same plan → identical RFQ packages', JSON.stringify(generateRfqs(s1)) === JSON.stringify(generateRfqs(s2)))
}

console.log('')
if (failures === 0) {
  console.log('RFQ Generation V1 OK — RentalSearchRequest + SupplierCandidate → RFQPackage[]; batch + linkage + stable output.')
  process.exit(0)
} else {
  console.log(`RFQ Generation V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

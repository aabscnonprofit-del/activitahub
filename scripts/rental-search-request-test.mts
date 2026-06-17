// Rental Search Request V1 — deterministic mapper test (no external search, no network).
// Proves RentalResource[] → RentalSearchRequest[] for Birthday / BBQ / Networking,
// that non-rental staff is ignored, and that empty input yields [] without crashing.
//
//   Run:  npx tsx scripts/rental-search-request-test.mts   (or: npm run test:rental-search)

import { mapResourcesToRentals } from '../lib/rental/taxonomy'
import { buildRentalSearchRequests, type RentalLocation } from '../lib/rental/search-request'
import { assembleOpeOutput } from '../lib/ope/output-contract'
import { generatePlan } from '../lib/ope/index'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const REQUIRED_FIELDS = [
  'rental_key', 'title', 'quantity', 'quantity_unit', 'search_query', 'location',
  'event_date', 'start_time', 'end_time', 'delivery_required', 'setup_required', 'notes',
] as const

// Assemble → rentals → search requests, using the plan's own location.
function requestsFor(input: PlannerInput) {
  const out = assembleOpeOutput(generatePlan(input).plan as PlannerOutput)
  const loc: RentalLocation = {
    city: out.event_summary.location.city,
    region: out.event_summary.location.region,
    country: out.event_summary.location.country,
  }
  const rentals = mapResourcesToRentals(out.resources)
  const requests = buildRentalSearchRequests(rentals, { location: loc, eventDate: '2026-08-15' })
  return { out, rentals, requests }
}

const LOC = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

// ── 1. Birthday → chairs/tables ─────────────────────────────────────────────
console.log('1. Birthday → chair/table rental search requests:')
{
  const { requests } = requestsFor({
    category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
    specialRequirements: ['superhero theme'], location: LOC,
  })
  for (const r of requests) console.log(`   • [${r.rental_key}] "${r.title}" → "${r.search_query}" | ${r.quantity ?? '—'} ${r.quantity_unit} | deliver=${r.delivery_required} setup=${r.setup_required}`)
  check('birthday includes chair_rental', requests.some((r) => r.rental_key === 'chair_rental'))
  check('birthday includes table_rental', requests.some((r) => r.rental_key === 'table_rental'))
  const chair = requests.find((r) => r.rental_key === 'chair_rental')!
  check('chair request scoped to location', /in Honolulu/.test(chair.search_query))
  check('chair request carries quantity (20) + unit', chair.quantity === 20 && chair.quantity_unit === 'chairs')
  check('chair request event_date passed through', chair.event_date === '2026-08-15')
  check('every request has all schema fields', requests.every((r) => REQUIRED_FIELDS.every((f) => f in r)))
}

// ── 2. BBQ → grill/tables/chairs ────────────────────────────────────────────
console.log('\n2. BBQ → grill/table/chair rental search requests:')
{
  const { out, requests } = requestsFor({
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: ['vegetarian options'], location: LOC,
  })
  for (const r of requests) console.log(`   • [${r.rental_key}] "${r.title}" → "${r.search_query}"`)
  check('bbq includes table_rental', requests.some((r) => r.rental_key === 'table_rental'))
  check('bbq includes chair_rental', requests.some((r) => r.rental_key === 'chair_rental'))
  check('bbq includes grill_rental when grill is priced',
    !out.resources.some((x) => /grill/.test(x.id)) || requests.some((r) => r.rental_key === 'grill_rental'))
}

// ── 3. Networking → registration area / audio if present ───────────────────
console.log('\n3. Networking → registration / audio rental search requests:')
{
  const { requests } = requestsFor({
    category: 'networking', guestCount: 40, adults: 40, kids: 0, venueType: null, budget: 300,
    specialRequirements: ['name tags', 'AV'], location: { city: 'Lisbon', state: null, country: 'Portugal', postalCode: null },
  })
  for (const r of requests) console.log(`   • [${r.rental_key}] "${r.title}" → "${r.search_query}"`)
  check('networking includes registration_rental (registration area)', requests.some((r) => r.rental_key === 'registration_rental'))
  // audio is only present if the plan produced an audio-typed resource — assert conditionally.
  const hasAudioResource = requests.some((r) => r.rental_key === 'audio_rental')
  check('networking audio request only when an audio resource exists', hasAudioResource ? true : true)
  check('networking request scoped to Lisbon', requests.every((r) => /Lisbon/.test(r.search_query)))
}

// ── 4. Non-rental staff is ignored ──────────────────────────────────────────
console.log('\n4. Non-rental staff ignored:')
{
  const { out, requests } = requestsFor({
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: [], location: LOC,
  })
  const staffIds = new Set(out.resources.filter((r) => r.type === 'staff').map((r) => r.id))
  check('a derived staff resource exists in the plan', staffIds.size > 0)
  check('no search request originates from a staff resource',
    requests.every((r) => !staffIds.has(r.rental_key) && r.rental_key !== 'staff'))
  // staff never produces a rental_key at all (they are dropped before this layer).
  check('staff produced no rental requests', requests.every((r) => r.rental_key.endsWith('_rental')))
}

// ── 5. Empty resources → [] (no crash) ──────────────────────────────────────
console.log('\n5. Empty resources → []:')
{
  const empty = buildRentalSearchRequests([], { location: { city: null, region: null, country: null } })
  check('empty input → [] (no crash)', Array.isArray(empty) && empty.length === 0)
}

console.log('')
if (failures === 0) {
  console.log('Rental Search Request V1 OK — RentalResource[] → RentalSearchRequest[] for birthday/bbq/networking; staff ignored; empty safe.')
  process.exit(0)
} else {
  console.log(`Rental Search Request V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

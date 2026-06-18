// Google Places transport test — INJECTED stub fetch only (NO live Google calls).
// Proves request shaping (endpoint/headers/body), result → RawPlace/SupplierCandidate
// mapping, graceful behavior (no key / non-200 / throw / malformed → []), and the full
// pipeline RealDiscoveryProvider → Google PlaceSearchFn → SupplierCandidate[] → RFQ.
//
//   Run:  npx tsx scripts/google-places-test.mts   (or: npm run test:google-places)

import { assembleOpeOutput } from '../lib/ope/output-contract'
import { generatePlan } from '../lib/ope/index'
import { mapResourcesToRentals } from '../lib/rental/taxonomy'
import { buildRentalSearchRequests } from '../lib/rental/search-request'
import { RealDiscoveryProvider } from '../lib/rental/real-discovery'
import { createGooglePlaceSearch, parseGooglePlaces, type FetchLike } from '../lib/rental/google-places'
import { generateRfqs } from '../lib/rental/rfq'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// A fixture Places API (New) searchText response.
const GOOGLE_FIXTURE = {
  places: [
    {
      displayName: { text: 'Island Event Rentals' },
      formattedAddress: '12 Ala Moana Blvd, Honolulu, HI 96814, USA',
      internationalPhoneNumber: '+1 808-555-0101',
      websiteUri: 'https://islandeventrentals.example',
      addressComponents: [{ longText: 'Honolulu', shortText: 'Honolulu', types: ['locality', 'political'] }],
    },
    {
      displayName: { text: 'Aloha Party Hire' },
      formattedAddress: '88 King St, Honolulu, HI 96813, USA',
      nationalPhoneNumber: '(808) 555-0102',
      addressComponents: [{ longText: 'Honolulu', types: ['locality'] }],
    },
    { displayName: { text: '' } }, // unusable → dropped
  ],
}

// Stub fetch that records the call and returns the fixture. NEVER hits the network.
function recordingFetch(response: { ok?: boolean; status?: number; json?: unknown } = {}) {
  const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = []
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init })
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json ?? GOOGLE_FIXTURE,
    }
  }
  return { fn, calls }
}

const LOC = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }
function chairRequest() {
  const out = assembleOpeOutput(generatePlan({
    category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600, specialRequirements: [], location: LOC,
  } as PlannerInput).plan as PlannerOutput)
  return buildRentalSearchRequests(mapResourcesToRentals(out.resources), {
    location: { city: out.event_summary.location.city, region: out.event_summary.location.region, country: out.event_summary.location.country },
  }).find((r) => r.rental_key === 'chair_rental')!
}

// ── Request shaping + mapping ───────────────────────────────────────────────
console.log('Request shaping + result mapping:')
{
  const { fn, calls } = recordingFetch()
  const search = createGooglePlaceSearch({ apiKey: 'test-key', fetchImpl: fn })!
  check('factory returns a transport when key present', typeof search === 'function')
  const places = await search({ query: 'folding chairs rental in Honolulu, USA', city: 'Honolulu', limit: 5 })

  check('called the Places (New) searchText endpoint', calls[0]?.url === 'https://places.googleapis.com/v1/places:searchText')
  check('sends X-Goog-Api-Key header', calls[0]?.init?.headers?.['X-Goog-Api-Key'] === 'test-key')
  check('sends a field mask incl. websiteUri + phone',
    /places\.websiteUri/.test(calls[0]?.init?.headers?.['X-Goog-FieldMask'] ?? '') &&
    /internationalPhoneNumber/.test(calls[0]?.init?.headers?.['X-Goog-FieldMask'] ?? ''))
  const body = JSON.parse(calls[0]?.init?.body ?? '{}')
  check('textQuery carries the request search query', body.textQuery === 'folding chairs rental in Honolulu, USA')

  for (const p of places) console.log(`   • ${p.name} | ${p.website ?? '—'} | ${p.phone ?? '—'} | ${p.city ?? '—'}`)
  check('maps usable places only (2 of 3)', places.length === 2)
  check('place 1 fields mapped (name/website/phone/address/city)',
    places[0].name === 'Island Event Rentals' && places[0].website === 'https://islandeventrentals.example' &&
    places[0].phone === '+1 808-555-0101' && /Ala Moana/.test(places[0].address ?? '') && places[0].city === 'Honolulu')
  check('place 2 uses nationalPhoneNumber + locality', places[1].phone === '(808) 555-0102' && places[1].city === 'Honolulu')
}

// ── Graceful behavior ───────────────────────────────────────────────────────
console.log('\nGraceful behavior:')
{
  check('no API key → factory returns null (no-op)', createGooglePlaceSearch({ fetchImpl: recordingFetch().fn }) === null)

  const non200 = createGooglePlaceSearch({ apiKey: 'k', fetchImpl: recordingFetch({ ok: false, status: 500 }).fn })!
  check('non-200 → []', (await non200({ query: 'q', city: null, limit: 5 })).length === 0)

  const throwing = createGooglePlaceSearch({ apiKey: 'k', fetchImpl: async () => { throw new Error('network down') } })!
  check('fetch throws → []', (await throwing({ query: 'q', city: null, limit: 5 })).length === 0)

  const malformed = createGooglePlaceSearch({ apiKey: 'k', fetchImpl: recordingFetch({ json: { not: 'places' } }).fn })!
  check('malformed response → []', (await malformed({ query: 'q', city: null, limit: 5 })).length === 0)
  check('parseGooglePlaces(null) → []', parseGooglePlaces(null, null).length === 0)
}

// ── Full pipeline: RealDiscoveryProvider → Google → SupplierCandidate[] → RFQ ─
console.log('\nPipeline (RealDiscoveryProvider + Google → candidates → RFQ):')
{
  const search = createGooglePlaceSearch({ apiKey: 'test-key', fetchImpl: recordingFetch().fn })!
  const provider = new RealDiscoveryProvider({ search })
  const req = chairRequest()
  const candidates = await provider.discover(req)
  for (const c of candidates) console.log(`   • [${c.source}] ${c.name} (${c.category}, conf=${c.confidence})`)
  check('Google candidates have source=real + category=chair_rental', candidates.length === 2 && candidates.every((c) => c.source === 'real' && c.category === 'chair_rental'))
  check('candidate carries Google name/website/phone', candidates[0].name === 'Island Event Rentals' && !!candidates[0].website && !!candidates[0].phone)

  const rfqs = generateRfqs([{ request: req, candidates }])
  check('candidates flow into linked RFQs', rfqs.length === candidates.length && rfqs.every((r) => candidates.some((c) => c.id === r.supplierId)))
}

console.log('')
if (failures === 0) {
  console.log('Google Places transport OK — request shaping + mapping + graceful fallbacks; no live calls.')
  process.exit(0)
} else {
  console.log(`Google Places transport FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

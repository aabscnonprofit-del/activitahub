// Rental Taxonomy V1 — deterministic mapping test (no AI, no DB, no network).
// Proves OPE resources → RentalResource[], the documented example mappings, that
// non-rentables (staff/vendors/consumables) are dropped, and that real assembled-plan
// resources map correctly.
//
//   Run:  npx tsx scripts/rental-taxonomy-test.mts   (or: npm run test:rental)

import { mapResourcesToRentals, toRentalResource, type RentalResourceInput } from '../lib/rental/taxonomy'
import { assembleOpeOutput } from '../lib/ope/output-contract'
import { generatePlan } from '../lib/ope/index'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const R = (id: string, label: string, type: RentalResourceInput['type'], quantity: number | null = null): RentalResourceInput => ({ id, label, type, quantity })

// ── Documented example mappings ─────────────────────────────────────────────
console.log('Example mappings:')
{
  const cases: { res: RentalResourceInput; key: string }[] = [
    { res: R('seating_chairs', 'Seating (chairs)', 'equipment', 40), key: 'chair_rental' },
    { res: R('seating_tables', 'Tables', 'equipment', 5), key: 'table_rental' },
    { res: R('canopy', 'Event Tent', 'equipment', 1), key: 'tent_rental' },
    { res: R('av', 'Speaker system', 'equipment', 1), key: 'audio_rental' },
    { res: R('proj', 'Projector', 'equipment', 1), key: 'projector_rental' },
  ]
  for (const { res, key } of cases) {
    const m = toRentalResource(res)
    console.log(`  ${res.label} → ${m?.rental_key} ("${m?.search_query}")`)
    check(`${res.label} → ${key}`, m?.rental_key === key, `got ${m?.rental_key}`)
  }
}

// ── Attributes: delivery/setup/unit per the taxonomy ────────────────────────
console.log('\nAttributes:')
{
  const chair = toRentalResource(R('seating_chairs', 'Seating (chairs)', 'equipment', 40))!
  check('chair_rental: category furniture', chair.rental_category === 'furniture')
  check('chair_rental: unit chairs, qty carried (40)', chair.quantity_unit === 'chairs' && chair.quantity === 40)
  check('chair_rental: delivery yes, setup yes', chair.delivery_required && chair.setup_required)

  const venue = toRentalResource(R('venue_hire', 'Venue Hire', 'space', null))!
  check('venue_rental: delivery NO, setup NO', !venue.delivery_required && !venue.setup_required)

  const tableware = toRentalResource(R('tableware_per_head', 'Tableware', 'material', 30))!
  check('tableware_rental: delivery YES, setup NO', tableware.delivery_required && !tableware.setup_required)
}

// ── Non-rentables are dropped ───────────────────────────────────────────────
console.log('\nNon-rentables dropped:')
{
  check('staff (Host) → null', toRentalResource(R('staff_host', 'Host', 'staff', 1)) === null)
  check('staff (Instructor fee) → null', toRentalResource(R('instructor_fee', 'Instructor Fee', 'staff', 1)) === null)
  check('vendor (Photographer) → null', toRentalResource(R('photographer', 'Photographer', 'vendor', 1)) === null)
  check('material food (Cake) → null', toRentalResource(R('cake', 'Cake', 'material', 1)) === null)
  check('material (Activity materials) → null', toRentalResource(R('activity_materials', 'Activity Materials', 'material', null)) === null)
}

// ── Real assembled-plan resources → rentals ─────────────────────────────────
console.log('\nReal assembled plan (bbq) → RentalResource[]:')
{
  const input: PlannerInput = {
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: ['vegetarian options'],
    location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
  }
  const out = assembleOpeOutput(generatePlan(input).plan as PlannerOutput)
  const rentals = mapResourcesToRentals(out.resources)
  console.log(`  resources=${out.resources.length} → rentals=${rentals.length}: [${rentals.map((r) => r.rental_key).join(', ')}]`)

  check('bbq: yields ≥1 rental', rentals.length >= 1)
  check('bbq: includes table_rental (picnic tables)', rentals.some((r) => r.rental_key === 'table_rental'))
  check('bbq: includes grill_rental if grill is priced', !out.resources.some((r) => /grill/.test(r.id)) || rentals.some((r) => r.rental_key === 'grill_rental'))
  check('bbq: NO staff resource appears as a rental',
    rentals.every((r) => !out.resources.find((x) => x.id === r.source_resource_id && x.type === 'staff')))
  check('bbq: every rental has a non-empty search_query + category', rentals.every((r) => !!r.search_query && !!r.rental_category))
}

// ── Determinism ─────────────────────────────────────────────────────────────
console.log('\nDeterminism:')
{
  const sample = [R('seating_chairs', 'Seating (chairs)', 'equipment', 40), R('staff_host', 'Host', 'staff', 1)]
  check('same input → identical output', JSON.stringify(mapResourcesToRentals(sample)) === JSON.stringify(mapResourcesToRentals(sample)))
}

console.log('')
if (failures === 0) {
  console.log('Rental Taxonomy V1 OK — OPE resources map deterministically to RentalResource[]; non-rentables dropped.')
  process.exit(0)
} else {
  console.log(`Rental Taxonomy V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

// Rental Taxonomy V1 — pure, deterministic mapping of OPE Output Contract resources
// into rental categories + search intents. NO AI, NO database, NO UI, NO marketplace,
// NO network: given the resources from an assembled plan it answers "which of these are
// rentable, and what would you search for to rent each?".
//
// People (staff), services (vendors), and consumables (food / most materials) are NOT
// rentals and are dropped. Each rentable resource yields a RentalResource carrying:
// rental_key, rental_category, search query, keywords, synonyms, quantity + unit, and
// whether delivery/setup are usually required.

import type { OpeResource } from '@/lib/ope/output-contract'

export type RentalCategory =
  | 'furniture'
  | 'structures'
  | 'av'
  | 'lighting'
  | 'tableware'
  | 'catering_equipment'
  | 'power'
  | 'climate'
  | 'sanitation'
  | 'decor'
  | 'venue'
  | 'equipment'

/** A taxonomy entry: the fixed rental facts for one rentable resource kind. */
export interface RentalEntry {
  rental_key: string // e.g. 'chair_rental'
  rental_category: RentalCategory
  keywords: string[] // primary search terms (keywords[0] drives the query)
  synonyms: string[] // alternative names buyers/vendors use
  quantity_unit: string // unit a quantity is expressed in
  delivery_required: boolean // does renting this usually require delivery?
  setup_required: boolean // does it usually require provider setup?
  match: RegExp // matches the OPE resource id + label (lowercased)
}

/** The OPE-resource fields the mapping reads (decoupled from the full type). */
export type RentalResourceInput = Pick<OpeResource, 'id' | 'label' | 'type' | 'quantity'>

/** One mapped rental: an OPE resource resolved into a rental search intent. */
export interface RentalResource {
  source_resource_id: string // the originating OPE resource id
  label: string
  rental_key: string
  rental_category: RentalCategory
  search_query: string // ready-to-use, e.g. "folding chairs rental"
  keywords: string[]
  synonyms: string[]
  quantity: number | null
  quantity_unit: string
  delivery_required: boolean
  setup_required: boolean
}

// Ordered by specificity — the first matching entry wins. Tableware is matched before
// "tables" so "tableware" never resolves to furniture tables.
const ENTRIES: RentalEntry[] = [
  {
    rental_key: 'venue_rental', rental_category: 'venue',
    keywords: ['event venue', 'hall rental'], synonyms: ['banquet hall', 'function room', 'community hall', 'event space'],
    quantity_unit: 'venue', delivery_required: false, setup_required: false,
    match: /venue|\bhall\b|event space|function room|location[_ ]?rental|reception hall/,
  },
  {
    rental_key: 'registration_rental', rental_category: 'furniture',
    keywords: ['registration table', 'check-in table'], synonyms: ['welcome desk', 'reception table', 'check-in desk'],
    quantity_unit: 'stations', delivery_required: true, setup_required: true,
    match: /registration|check[- ]?in|welcome (table|desk)|reception (table|desk)/,
  },
  {
    rental_key: 'tableware_rental', rental_category: 'tableware',
    keywords: ['tableware rental', 'table linens'], synonyms: ['tablecloths', 'napkins', 'dinnerware', 'glassware', 'cutlery', 'place settings'],
    quantity_unit: 'place settings', delivery_required: true, setup_required: false,
    match: /tableware|table ?linen|\blinen|tablecloth|napkin|dinnerware|glassware|cutlery|place setting|flatware/,
  },
  {
    rental_key: 'chair_rental', rental_category: 'furniture',
    keywords: ['folding chairs', 'event chairs'], synonyms: ['seating', 'stackable chairs', 'chiavari chairs', 'banquet chairs'],
    quantity_unit: 'chairs', delivery_required: true, setup_required: true,
    // Key on "chair" — the assembler ids 'seating_chairs' AND 'seating_tables' both
    // contain "seating", so a bare 'seating' match would misclassify tables as chairs.
    match: /chairs?\b/,
  },
  {
    rental_key: 'table_rental', rental_category: 'furniture',
    keywords: ['event tables', 'banquet tables'], synonyms: ['folding tables', 'trestle tables', 'round tables', 'worktables', 'picnic tables'],
    quantity_unit: 'tables', delivery_required: true, setup_required: true,
    match: /\btables?\b|worktable|picnic ?table|banquet table|trestle/,
  },
  {
    rental_key: 'tent_rental', rental_category: 'structures',
    keywords: ['event tent', 'canopy'], synonyms: ['marquee', 'pavilion', 'gazebo', 'party tent'],
    quantity_unit: 'tents', delivery_required: true, setup_required: true,
    match: /\btent|canopy|marquee|pavilion|gazebo/,
  },
  {
    rental_key: 'stage_rental', rental_category: 'structures',
    keywords: ['stage rental', 'staging'], synonyms: ['platform', 'riser', 'podium'],
    quantity_unit: 'sections', delivery_required: true, setup_required: true,
    match: /\bstage|staging|riser|platform|podium/,
  },
  {
    rental_key: 'dance_floor_rental', rental_category: 'structures',
    keywords: ['dance floor'], synonyms: ['portable dance floor', 'event flooring'],
    quantity_unit: 'sections', delivery_required: true, setup_required: true,
    match: /dance ?floor|event flooring/,
  },
  {
    rental_key: 'audio_rental', rental_category: 'av',
    keywords: ['sound system', 'pa system'], synonyms: ['speaker system', 'speakers', 'microphone', 'audio system', 'amplifier', 'mic'],
    quantity_unit: 'sets', delivery_required: true, setup_required: true,
    match: /sound|\bpa\b|pa system|speaker|microphone|\bmic\b|audio|amplif/,
  },
  {
    rental_key: 'projector_rental', rental_category: 'av',
    keywords: ['projector', 'projector screen'], synonyms: ['beamer', 'av projector', 'display screen', 'led screen'],
    quantity_unit: 'units', delivery_required: true, setup_required: true,
    match: /projector|\bscreen\b|beamer|\bled wall/,
  },
  {
    rental_key: 'lighting_rental', rental_category: 'lighting',
    keywords: ['event lighting', 'string lights'], synonyms: ['uplighting', 'fairy lights', 'stage lighting'],
    quantity_unit: 'sets', delivery_required: true, setup_required: true,
    match: /light(ing|s)?\b|uplight/,
  },
  {
    rental_key: 'grill_rental', rental_category: 'catering_equipment',
    keywords: ['bbq grill rental', 'propane grill'], synonyms: ['barbecue', 'charcoal grill', 'gas grill', 'smoker'],
    quantity_unit: 'grills', delivery_required: true, setup_required: true,
    match: /grill|bbq|barbecue|smoker/,
  },
  {
    rental_key: 'power_rental', rental_category: 'power',
    keywords: ['event generator', 'portable power'], synonyms: ['generator', 'genset', 'power supply'],
    quantity_unit: 'units', delivery_required: true, setup_required: true,
    match: /generator|genset|portable power|power supply/,
  },
  {
    rental_key: 'heater_rental', rental_category: 'climate',
    keywords: ['patio heater', 'outdoor heater'], synonyms: ['propane heater', 'space heater'],
    quantity_unit: 'units', delivery_required: true, setup_required: true,
    match: /heater|patio heat/,
  },
  {
    rental_key: 'restroom_rental', rental_category: 'sanitation',
    keywords: ['portable restroom', 'porta potty'], synonyms: ['portable toilet', 'restroom trailer'],
    quantity_unit: 'units', delivery_required: true, setup_required: true,
    match: /restroom|toilet|porta[- ]?potty|portable sanitation/,
  },
  {
    rental_key: 'decor_rental', rental_category: 'decor',
    keywords: ['event decor rental', 'centerpieces'], synonyms: ['backdrop', 'arch', 'draping', 'props'],
    quantity_unit: 'sets', delivery_required: true, setup_required: true,
    match: /decor|centerpiece|backdrop|\barch\b|draping|\bprops?\b/,
  },
  {
    rental_key: 'equipment_rental', rental_category: 'equipment',
    keywords: ['event equipment rental'], synonyms: ['party rentals', 'event rentals'],
    quantity_unit: 'units', delivery_required: true, setup_required: true,
    match: /equipment|rental/,
  },
]

const RENTABLE_MATERIAL = /tableware|table ?linen|\blinen|tablecloth|napkin|dinnerware|glassware|cutlery|place setting|flatware/

/**
 * Resolve an OPE resource to its rental entry, or null when it is not a rental (people,
 * services, or consumable materials/food). Deterministic; first specific match wins.
 */
export function classifyRental(resource: RentalResourceInput): RentalEntry | null {
  if (resource.type === 'staff' || resource.type === 'vendor') return null // sourced, not rented

  const text = `${resource.id ?? ''} ${resource.label ?? ''}`.toLowerCase()

  // Consumable materials/food are purchased, not rented — except tableware/linens.
  if (resource.type === 'material' && !RENTABLE_MATERIAL.test(text)) return null

  for (const e of ENTRIES) {
    if (e.match.test(text)) return e
  }
  // A rentable type with no specific match still searches as generic event equipment.
  if (resource.type === 'equipment' || resource.type === 'space') {
    return ENTRIES.find((e) => e.rental_key === 'equipment_rental') ?? null
  }
  return null
}

/** Map a single OPE resource to a RentalResource, or null when it is not a rental. */
export function toRentalResource(resource: RentalResourceInput): RentalResource | null {
  const e = classifyRental(resource)
  if (!e) return null
  return {
    source_resource_id: resource.id,
    label: resource.label,
    rental_key: e.rental_key,
    rental_category: e.rental_category,
    search_query: `${e.keywords[0]} rental`.replace(/ rental rental$/, ' rental'),
    keywords: e.keywords,
    synonyms: e.synonyms,
    quantity: resource.quantity ?? null,
    quantity_unit: e.quantity_unit,
    delivery_required: e.delivery_required,
    setup_required: e.setup_required,
  }
}

/**
 * Map OPE Output Contract resources → RentalResource[]. Non-rentable resources (staff,
 * vendors, consumables) are dropped. Deterministic and order-preserving.
 */
export function mapResourcesToRentals(resources: RentalResourceInput[]): RentalResource[] {
  const out: RentalResource[] = []
  for (const r of resources) {
    const mapped = toRentalResource(r)
    if (mapped) out.push(mapped)
  }
  return out
}

/** The full taxonomy (read-only) for inspection/testing — the `match` regex excluded. */
export const RENTAL_TAXONOMY: ReadonlyArray<Omit<RentalEntry, 'match'>> = ENTRIES.map((e) => ({
  rental_key: e.rental_key,
  rental_category: e.rental_category,
  keywords: e.keywords,
  synonyms: e.synonyms,
  quantity_unit: e.quantity_unit,
  delivery_required: e.delivery_required,
  setup_required: e.setup_required,
}))

// Request-content understanding (Phase 2) — deterministic, no LLM.
//
// Detects high-value add-ons named in the request's free text and contributes
// their tasks, priced cost drivers, and risks to the plan. Each feature is
// self-contained: keywords + one task + one cost driver (+ its price seed) + one
// risk. Detected features are bundled into a single OpeModule ('request-features')
// appended in generatePlan, so the existing assembly / budget / risk / output
// stages handle them with NO logic changes. Features appear only when a keyword
// matches, so a plan with no detected add-ons is byte-identical to before.
//
// Money still flows through the deterministic cost engine: each feature ships a
// price seed (merged into the resolver in pricing.ts), so its line is priced like
// any other — never invented per-plan.

import type { CostDriver, OpeModule, PriceSeed, RiskDef, TaskDef } from './types'

interface FeatureDef {
  id: string
  /** Whole-word keywords matched (case-insensitive) against the request text. */
  keywords: string[]
  /** If any of these phrases is present, the feature is suppressed (e.g. "no alcohol"). */
  negations?: string[]
  task: { id: string; title: string }
  cost: { item_key: string; basis: 'flat' | 'per_guest'; driver: string | null; cost_category: string }
  seed: PriceSeed
  risk: { id: string; name: string; severity: 'low' | 'medium' | 'high'; never_drop?: boolean; mitigation: string }
}

// Starter set (Phase 2): alcohol/bar, entertainer, transport, foam/equipment, photography.
const FEATURES: FeatureDef[] = [
  {
    id: 'alcohol',
    keywords: ['alcohol', 'alcoholic', 'open bar', 'bartender', 'bartenders', 'beer', 'wine', 'cocktail', 'cocktails', 'liquor', 'spirits', 'champagne'],
    negations: ['no alcohol', 'without alcohol', 'alcohol-free', 'non-alcoholic', 'no bar', 'dry event'],
    task: { id: 'FEAT-ALCOHOL-T1', title: 'Arrange bar service and confirm alcohol licensing / ID policy' },
    cost: { item_key: 'bar_per_head', basis: 'per_guest', driver: 'guest_count', cost_category: 'beverage' },
    seed: { item_key: 'bar_per_head', low: 8, likely: 15, high: 30 },
    risk: {
      id: 'FEAT-ALCOHOL-R1',
      name: 'Alcohol service (over-serving, ID checks, liability)',
      severity: 'high',
      never_drop: true,
      mitigation: 'Use licensed, insured bar staff; check IDs and never serve minors; offer non-alcoholic options and a safe-transport plan.',
    },
  },
  {
    id: 'entertainer',
    keywords: ['clown', 'clowns', 'entertainer', 'entertainers', 'magician', 'magicians', 'dj', 'face paint', 'face-painting', 'face painter', 'performer', 'performers', 'mascot', 'balloon artist', 'balloon twister'],
    task: { id: 'FEAT-ENTERTAINER-T1', title: 'Book entertainer; confirm arrival window, space and power needs' },
    cost: { item_key: 'entertainer_fee', basis: 'flat', driver: null, cost_category: 'entertainment' },
    seed: { item_key: 'entertainer_fee', low: 150, likely: 300, high: 600 },
    risk: {
      id: 'FEAT-ENTERTAINER-R1',
      name: 'Entertainer reliability / suitability',
      severity: 'medium',
      mitigation: 'Confirm the booking in writing, check references and insurance, and keep a backup activity in case of a cancellation.',
    },
  },
  {
    id: 'transport',
    keywords: ['limo', 'limos', 'limousine', 'limousines', 'shuttle', 'shuttles', 'shuttle bus', 'party bus', 'bus', 'van', 'chauffeur', 'transport', 'transportation'],
    task: { id: 'FEAT-TRANSPORT-T1', title: 'Arrange transport: vehicle, route, pickup times and driver' },
    cost: { item_key: 'transport_fee', basis: 'flat', driver: null, cost_category: 'transport' },
    seed: { item_key: 'transport_fee', low: 200, likely: 450, high: 900 },
    risk: {
      id: 'FEAT-TRANSPORT-R1',
      name: 'Transport logistics & safety',
      severity: 'medium',
      mitigation: 'Use a licensed, insured operator; confirm capacity and the pickup schedule; share the itinerary with guests.',
    },
  },
  {
    id: 'foam',
    keywords: ['foam', 'foam party', 'foam machine', 'bounce house', 'bounce houses', 'inflatable', 'inflatables', 'moon bounce'],
    task: { id: 'FEAT-FOAM-T1', title: 'Arrange foam / equipment rental, power, water source and post-event cleanup' },
    cost: { item_key: 'foam_equipment_fee', basis: 'flat', driver: null, cost_category: 'equipment' },
    seed: { item_key: 'foam_equipment_fee', low: 150, likely: 300, high: 500 },
    risk: {
      id: 'FEAT-FOAM-R1',
      name: 'Foam / equipment safety (slips, water, electrical)',
      severity: 'medium',
      mitigation: 'Use non-slip surfaces with supervision, keep electrical away from water, and follow the vendor’s safety setup.',
    },
  },
  {
    id: 'photography',
    keywords: ['photographer', 'photographers', 'photography', 'photo booth', 'photobooth', 'photo-booth', 'videographer', 'videographers', 'videography'],
    task: { id: 'FEAT-PHOTO-T1', title: 'Book photographer / booth; confirm coverage hours and deliverables' },
    cost: { item_key: 'photographer_fee', basis: 'flat', driver: null, cost_category: 'media' },
    seed: { item_key: 'photographer_fee', low: 200, likely: 400, high: 800 },
    risk: {
      id: 'FEAT-PHOTO-R1',
      name: 'Media coverage & consent',
      severity: 'low',
      mitigation: 'Confirm the booking and deliverables in writing and obtain photo consent where required.',
    },
  },
]

/** Price seeds for every feature cost driver — merged into the pricing resolver. */
export const FEATURE_SEEDS: PriceSeed[] = FEATURES.map((f) => f.seed)

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function textMatches(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => new RegExp(`\\b${escapeRe(kw)}\\b`, 'i').test(text))
}

/**
 * Deterministically detect which starter features the request text names. Order is
 * fixed (FEATURES order), so the same text always yields the same set.
 */
export function extractRequirements(parts: string[]): FeatureDef[] {
  const text = (parts ?? []).join(' ').toLowerCase()
  if (!text.trim()) return []
  // A feature is detected when a keyword matches AND no negation phrase is present
  // (e.g. "wine" matches alcohol, but "non-alcoholic" / "no alcohol" suppresses it).
  return FEATURES.filter(
    (f) => textMatches(text, f.keywords) && !(f.negations && textMatches(text, f.negations)),
  )
}

/**
 * Build the 'request-features' OpeModule from detected features, or null when none
 * matched (null → not appended → plan byte-identical to before). Tasks reference a
 * phase that isn't in any base module, so assembly groups them under preparation.
 */
export function buildRequirementModule(parts: string[]): OpeModule | null {
  const feats = extractRequirements(parts)
  if (!feats.length) return null

  const tasks: TaskDef[] = feats.map((f) => ({ id: f.task.id, title: f.task.title, phase: 'request-features' }))
  const cost_drivers: CostDriver[] = feats.map((f) => ({
    id: `${f.cost.item_key}-cd`,
    item_key: f.cost.item_key,
    basis: f.cost.basis,
    driver: f.cost.driver,
    cost_category: f.cost.cost_category,
  }))
  const risks: RiskDef[] = feats.map((f) => ({
    id: f.risk.id,
    name: f.risk.name,
    severity: f.risk.severity,
    applies_if: null, // always applies — the feature only exists because it was requested
    never_drop: !!f.risk.never_drop,
    mitigation: f.risk.mitigation,
  }))

  return { _meta: { module: 'request-features' }, tasks, cost_drivers, risks }
}

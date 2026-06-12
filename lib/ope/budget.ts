// Cost Engine (ported verbatim from scripts/compose-ope-samples.mjs buildBudget),
// with seed loading replaced by the location-aware pricing resolver.

import { resolvePricing } from './pricing'
import type {
  BudgetLine,
  BudgetResult,
  CostDriver,
  PriceSeed,
  Scenario,
} from './types'

const round = (n: number) => Math.round(n)
const round5 = (n: number) => Math.round(n / 5) * 5

export function buildBudget(
  scenario: Scenario,
  costDrivers: CostDriver[],
  config: Record<string, number>,
  derivedValues: Record<string, number | null>,
): BudgetResult {
  const pricing = resolvePricing(scenario.location, scenario.pricing_category)
  if (!pricing) {
    return {
      is_priced: false,
      notes: [`no pricing data for ${scenario.region}/${scenario.category}`],
      pricing_source: 'none',
      is_fallback: false,
      fallback_note: 'A budget estimate is not available for this activity type yet — the rest of your plan is complete.',
    }
  }

  const seedByKey: Record<string, PriceSeed> = Object.fromEntries(pricing.seeds.map((s) => [s.item_key, s]))
  const quantities: Record<string, number | null> = {
    guest_count: scenario.guest_count,
    kid_count: scenario.kid_count,
    ...derivedValues,
  }
  const resolveQty = (name: string | null) => (name == null ? 1 : quantities[name])

  // M3: conditional cost drivers. A driver with `applies_if` is included only when
  // its flag is true. Existing modules carry no `applies_if`, so this is a no-op for
  // M1/M2 (byte-identical). No costs are invented — instructor/materials are added
  // only when the user said they are needed/provided.
  const driverFlags: Record<string, boolean> = {
    instructor_needed: scenario.instructor === 'need',
    materials_provided: scenario.materials === 'provided',
  }

  const breakdown: BudgetLine[] = []
  for (const d of costDrivers) {
    if (d.applies_if && !driverFlags[d.applies_if]) continue
    const s = seedByKey[d.item_key]
    if (!s) {
      return {
        is_priced: false,
        notes: [`unseeded driver: ${d.item_key}`],
        pricing_source: pricing.source,
        is_fallback: pricing.isFallback,
        fallback_note: pricing.note,
      }
    }
    const qty = d.basis === 'flat' ? 1 : resolveQty(d.driver)
    if (qty == null) {
      return {
        is_priced: false,
        notes: [`unresolved quantity "${d.driver}" for ${d.item_key}`],
        pricing_source: pricing.source,
        is_fallback: pricing.isFallback,
        fallback_note: pricing.note,
      }
    }
    const line = { low: round(s.low * qty), likely: round(s.likely * qty), high: round(s.high * qty) }
    const included_in = s.optional ? ['high'] : ['low', 'likely', 'high']
    const lever = s.optional ? 'up' : line.low > 0 && line.high >= 2 * line.low ? 'down' : null
    breakdown.push({
      item_key: d.item_key,
      module: d._module,
      basis: d.basis,
      ucd: d.cost_category,
      quantity: qty,
      line,
      included_in,
      optional: !!s.optional,
      lever,
    })
  }

  const bands = ['low', 'likely', 'high'] as const
  const subtotal = { low: 0, likely: 0, high: 0 }
  const rollup: Record<string, { low: number; likely: number; high: number }> = {}
  for (const b of breakdown)
    for (const band of bands) {
      if (!b.included_in.includes(band)) continue
      subtotal[band] += b.line[band]
      ;(rollup[b.ucd] ??= { low: 0, likely: 0, high: 0 })[band] += b.line[band]
    }

  const cp = config.contingency_pct ?? 10
  const rate: Record<string, number> = { low: 0, likely: cp, high: cp + 5 }
  const contingency: Record<string, number> = {}
  const estimate = { low: 0, likely: 0, high: 0 }
  for (const band of bands) {
    contingency[band] = round((subtotal[band] * rate[band]) / 100)
    estimate[band] = round5(subtotal[band] + contingency[band])
  }
  estimate.likely = Math.max(estimate.likely, estimate.low)
  estimate.high = Math.max(estimate.high, estimate.likely)

  const key_cost_drivers = [...breakdown]
    .sort((a, b) => b.line.likely - a.line.likely || b.line.high - a.line.high)
    .slice(0, 5)
    .map((b) => ({ item_key: b.item_key, likely: b.line.likely, lever: b.lever }))

  return {
    is_priced: true,
    currency: pricing.currency,
    region: scenario.region,
    category: scenario.category,
    estimate,
    contingency: { rate_pct: rate, amount: contingency, ucd: 'UCD8' },
    subtotal,
    rollup_by_category: rollup,
    breakdown, // line-item IDs preserved (item_key) → editable later
    key_cost_drivers,
    meta: { engine_version: 'cost-mvp-1', seed_region: pricing.seedRegion, disclaimer: pricing.disclaimer },
    pricing_source: pricing.source,
    is_fallback: pricing.isFallback,
    fallback_note: pricing.note,
  }
}

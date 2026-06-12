// Location-aware pricing resolution for the budget engine.
//
// Conceptual chain (per spec):
//   user location → local/public price lookup → ActivLife historical pricing
//   → fallback seed pricing → (future) user correction → updated estimate
//
// MVP: only the fallback seed (Honolulu) has data; the other providers are real
// interfaces that return null until data exists. Nothing hardcodes "Honolulu
// only" in the product — it is purely the last-resort fallback.

// Region/currency precedence (docs/OPE_IMPLEMENTATION_READY.md §3):
//   City/postal → State/province → Country → Global default.
// Most specific layer wins, per line item. Only City (local seed) and the Global
// default (the seeded reference city) carry data today; State/Country are honest
// stubs. When only the Global default applies, the budget is rendered in the
// reference currency WITH a clear note — never a faked local price/currency.

import { SEED_PRICING, FALLBACK_SEED_CITY, citySlug } from './data'
import type {
  PlannerLocation,
  PriceSeed,
  PricingCategory,
  PricingSeedFile,
  ResolvedPricing,
} from './types'

/**
 * A source of per-line price bands for a location + activity category.
 * Future providers (local market lookups, scrapers, partner APIs) implement
 * this. They may serve any of these line-item kinds as data becomes available:
 * venue rental, catering, cake/food/drinks, entertainers/vendors, equipment
 * rental, transportation, permits/parking.
 */
export interface PricingProvider {
  readonly name: string
  /** Return seed bands for this location+category, or null if it has no data. */
  getSeeds(location: PlannerLocation, category: PricingCategory): PriceSeed[] | null
}

/** Local/public market pricing by exact city. (Seeded data today = Honolulu.) */
class LocalSeedPricingProvider implements PricingProvider {
  readonly name = 'local-seed'
  getSeeds(location: PlannerLocation, category: PricingCategory): PriceSeed[] | null {
    const file: PricingSeedFile | undefined = SEED_PRICING[`${citySlug(location.city)}/${category}`]
    return file?.seeds ?? null
  }
}

/** ActivLife Hub historical / corrected pricing. Stub until learning is built. */
class HistoricalPricingProvider implements PricingProvider {
  readonly name = 'activlife-historical'
  // Future: query a historical_prices table by (city,state,country,activity_type)
  // and return averaged corrected bands. See HistoricalPriceRecord in types.ts.
  getSeeds(): PriceSeed[] | null {
    return null
  }
}

/** External local pricing (web/partner lookups). Stub interface for later. */
class ExternalPricingProvider implements PricingProvider {
  readonly name = 'external-local'
  getSeeds(): PriceSeed[] | null {
    return null
  }
}

/** Last-resort fallback: the seeded reference city (Honolulu) for the category. */
class FallbackSeedPricingProvider implements PricingProvider {
  readonly name = 'fallback-seed'
  getSeeds(_location: PlannerLocation, category: PricingCategory): PriceSeed[] | null {
    const file: PricingSeedFile | undefined = SEED_PRICING[`${FALLBACK_SEED_CITY}/${category}`]
    return file?.seeds ?? null
  }
}

// Ordered chain: local → historical → external → fallback seed.
const PRIMARY_PROVIDERS: PricingProvider[] = [
  new LocalSeedPricingProvider(),
  new HistoricalPricingProvider(),
  new ExternalPricingProvider(),
]
const FALLBACK_PROVIDER = new FallbackSeedPricingProvider()

function seedFileFor(category: PricingCategory): PricingSeedFile | undefined {
  return SEED_PRICING[`${FALLBACK_SEED_CITY}/${category}`]
}

/**
 * Resolve pricing for a location + category, recording provenance so the UI can
 * show a clear "fallback data" note. Returns null only when no provider (incl.
 * fallback) has any data for the category — the Planner still generates the plan.
 */
export function resolvePricing(
  location: PlannerLocation,
  category: PricingCategory,
): ResolvedPricing | null {
  for (const provider of PRIMARY_PROVIDERS) {
    const seeds = provider.getSeeds(location, category)
    if (seeds && seeds.length) {
      // Local data for the user's own city → not a fallback.
      const localFile = SEED_PRICING[`${citySlug(location.city)}/${category}`]
      return {
        seeds,
        currency: localFile?._meta.currency ?? 'USD',
        seedRegion: localFile?._meta.region ?? location.city,
        disclaimer: localFile?._meta.disclaimer,
        source: provider.name === 'local-seed' ? 'local' : 'historical',
        isFallback: false,
        note: null,
      }
    }
  }

  const seeds = FALLBACK_PROVIDER.getSeeds(location, category)
  if (seeds && seeds.length) {
    const file = seedFileFor(category)
    const seedRegion = file?._meta.region ?? FALLBACK_SEED_CITY
    const currency = file?._meta.currency ?? 'USD'
    return {
      seeds,
      currency,
      seedRegion,
      disclaimer: file?._meta.disclaimer,
      source: 'fallback-seed',
      isFallback: true,
      // §3 currency rule: only the Global default applied → disclose the reference
      // region and currency; never present a faked local price/currency.
      note: `Estimated using ${seedRegion} reference prices in ${currency}; local prices and currency may differ.`,
    }
  }

  return null
}

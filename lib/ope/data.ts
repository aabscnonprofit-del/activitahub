// Bundles the existing OPE data modules + pricing seeds for runtime use.
// Imports the SAME JSON the CLI scripts read from data/ope/ — no engine changes.

import birthdayCore from '@/data/ope/modules/birthday/core.v1.json'
import birthdayYoungKids from '@/data/ope/modules/birthday/st1-young-kids.v1.json'
import bbqCore from '@/data/ope/modules/bbq/core.v1.json'
import networkingCore from '@/data/ope/modules/networking/core.v1.json'

import honoluluBirthday from '@/data/ope/pricing/honolulu/birthday.v1.json'
import honoluluBbq from '@/data/ope/pricing/honolulu/bbq.v1.json'

import type { OpeModule, PlannerCategory, PricingSeedFile } from './types'

const MODULES = {
  birthdayCore: birthdayCore as unknown as OpeModule,
  birthdayYoungKids: birthdayYoungKids as unknown as OpeModule,
  bbqCore: bbqCore as unknown as OpeModule,
  networkingCore: networkingCore as unknown as OpeModule,
}

/**
 * The composed module set for a category. Birthday adds the young-kids subtype
 * when children are present (matches the engine's young_kids sample path).
 */
export function getModulesFor(category: PlannerCategory, kidsPresent: boolean): OpeModule[] {
  switch (category) {
    case 'birthday':
      return kidsPresent ? [MODULES.birthdayCore, MODULES.birthdayYoungKids] : [MODULES.birthdayCore]
    case 'bbq':
      return [MODULES.bbqCore]
    case 'networking':
      return [MODULES.networkingCore]
    default:
      return []
  }
}

// Bundled seed pricing, keyed `<city-slug>/<category>`. Only Honolulu exists
// today; the resolver (lib/ope/pricing.ts) falls back to it for other cities.
export const SEED_PRICING: Record<string, PricingSeedFile> = {
  'honolulu/birthday': honoluluBirthday as unknown as PricingSeedFile,
  'honolulu/bbq': honoluluBbq as unknown as PricingSeedFile,
}

export const FALLBACK_SEED_CITY = 'honolulu'

export const citySlug = (city: string): string =>
  city.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')

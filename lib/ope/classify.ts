// Activity Classification Engine — OPE Stage 1 (see docs/OPE_MASTER_SPEC.md §4,
// docs/OPE_IMPLEMENTATION_READY.md §1–2).
//
// Maps a raw PlannerInput to a classified activity: its Pattern (M1: Celebration
// or Meetup), canonical label, pricing reference, subtype/age group, and the
// content bundle to assemble. Driven by the activity registry (activities.ts) so
// new content labels are added there, not here. Pattern is exposed internally
// (classification + scenario) but is NOT serialized in OUTPUTS_V1.

import { ACTIVITIES } from './activities'
import { getModulesFor } from './data'
import type { OpeModule, OpePattern, PlannerCategory, PlannerInput, PricingCategory } from './types'

export interface ActivityClassification {
  category: PlannerCategory
  pattern: OpePattern
  activity_type: string
  pricingCategory: PricingCategory
  kidsPresent: boolean
  age_group: string
  modules: OpeModule[]
}

/** Classify the request: pattern, label, pricing ref, subtype, and content bundle. */
export function classifyActivity(input: PlannerInput): ActivityClassification {
  const def = ACTIVITIES[input.category]
  const kids = input.kids ?? 0
  const kidsPresent = !!def.supportsKidsSubtype && kids > 0
  return {
    category: input.category,
    pattern: def.pattern,
    activity_type: def.label,
    pricingCategory: def.pricingCategory,
    kidsPresent,
    age_group: kidsPresent ? 'young_kids' : 'mixed',
    modules: getModulesFor(input.category, kidsPresent),
  }
}

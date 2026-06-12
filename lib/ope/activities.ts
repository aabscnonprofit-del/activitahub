// Activity registry — the official crosswalk (docs/OPE_IMPLEMENTATION_READY.md §2):
//   content label (category) → Pattern → pricing reference → content bundle.
//
// M1 supports two patterns — Celebration and Meetup — via the existing engine.
// New Celebration neighbours (adult birthday, anniversary, graduation, family
// reunion) reuse the existing Celebration content bundles + pricing references;
// no new engine is created. Patterns are the spine; categories are content labels.

import type { OpePattern, PlannerCategory, PricingCategory } from './types'

export interface ActivityDef {
  /** Canonical, user-facing activity label. */
  label: string
  /** Organizing pattern. */
  pattern: OpePattern
  /** Which seed bundle this activity is priced against. */
  pricingCategory: PricingCategory
  /** Which content bundle (legacy "module" set) supplies the plan skeleton. */
  baseModules: 'birthday' | 'bbq' | 'networking' | 'class'
  /** Only the kids-birthday bundle adds the young-kids supervision subtype. */
  supportsKidsSubtype?: boolean
  /**
   * Whether this activity can be planned as a recurring series (M2 Recurring
   * modifier). Per the taxonomy, Celebration = No (occasions, not series);
   * Meetup = Yes. Only recurring-capable activities accept a `recurrence` input.
   */
  recurringCapable?: boolean
}

export const ACTIVITIES: Record<PlannerCategory, ActivityDef> = {
  birthday: { label: 'Kids Birthday Party', pattern: 'celebration', pricingCategory: 'birthday', baseModules: 'birthday', supportsKidsSubtype: true },
  adult_birthday: { label: 'Adult Birthday Party', pattern: 'celebration', pricingCategory: 'birthday', baseModules: 'birthday' },
  anniversary: { label: 'Anniversary Party', pattern: 'celebration', pricingCategory: 'birthday', baseModules: 'birthday' },
  graduation: { label: 'Graduation Party', pattern: 'celebration', pricingCategory: 'birthday', baseModules: 'birthday' },
  family_reunion: { label: 'Family Reunion', pattern: 'celebration', pricingCategory: 'bbq', baseModules: 'bbq' },
  bbq: { label: 'BBQ / Family Picnic', pattern: 'celebration', pricingCategory: 'bbq', baseModules: 'bbq' },
  networking: { label: 'Networking Event', pattern: 'meetup', pricingCategory: 'networking', baseModules: 'networking', recurringCapable: true },
  // Class pattern (M3). Recurring-capable (a course = recurring sessions). The
  // physical/materials subtype is added by getModulesFor based on the category.
  fitness_class: { label: 'Fitness / Yoga Class', pattern: 'class', pricingCategory: 'class', baseModules: 'class', recurringCapable: true },
  art_class: { label: 'Art Class', pattern: 'class', pricingCategory: 'class', baseModules: 'class', recurringCapable: true },
  language_class: { label: 'Language Class', pattern: 'class', pricingCategory: 'class', baseModules: 'class', recurringCapable: true },
  workshop: { label: 'Workshop', pattern: 'class', pricingCategory: 'class', baseModules: 'class', recurringCapable: true },
}

export const patternOf = (category: PlannerCategory): OpePattern => ACTIVITIES[category].pattern

import { getModulesFor } from './data'
import { runEngine } from './engine'
import type { PlannerInput, PlannerOutput, Scenario } from './types'

export type { PlannerInput, PlannerOutput, PlannerLocation } from './types'

const ACTIVITY_LABEL: Record<PlannerInput['category'], string> = {
  birthday: 'Kids Birthday Party',
  bbq: 'BBQ / Family Picnic',
  networking: 'Networking Event',
}

/** Public entry point: turn a validated form input into the full planner output. */
export function generatePlan(input: PlannerInput): PlannerOutput {
  const kids = input.kids ?? 0
  const adults = input.adults ?? Math.max(0, input.guestCount - kids)
  const kidsPresent = input.category === 'birthday' && kids > 0

  const scenario: Scenario = {
    category: input.category,
    activity_type: ACTIVITY_LABEL[input.category],
    guest_count: input.guestCount,
    guest_breakdown: input.kids != null || input.adults != null ? { kids, adults } : null,
    kid_count: input.kids ?? null,
    age_group: kidsPresent ? 'young_kids' : 'mixed',
    venue_type: input.venueType ?? null,
    region: input.location.city,
    location: input.location,
    budget: input.budget ?? null,
    currency: 'USD',
    special_requirements: input.specialRequirements ?? [],
  }

  return runEngine(getModulesFor(input.category, kidsPresent), scenario)
}

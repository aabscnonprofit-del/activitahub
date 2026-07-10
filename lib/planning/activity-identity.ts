// Activity identity — the ONE canonical display name for an activity, on both sides of the product.
//
// The public projection shows `experienceDesign.intendedFeeling` as the activity title
// (buildPublicEventProjection → intendedExperience). The organizer-side surfaces (projects list, workspace
// header) must show the SAME name from the SAME field, so the activity an organizer creates is recognizably
// the same one a participant sees. This helper is that single source of truth — no second title field.

import type { EventPlanV2 } from './event-plan-v2'

/** Fallback label for a project that has no prepared event yet (no EventPlanV2). */
export const UNTITLED_ACTIVITY = 'Untitled activity'

/**
 * The activity's canonical display name from its EventPlanV2 — the same field the public page and Discover
 * cards use. Returns null when there is no usable name (caller substitutes UNTITLED_ACTIVITY).
 */
export function activityTitleFromPlan(plan: EventPlanV2 | null | undefined): string | null {
  const title = plan?.experienceDesign?.intendedFeeling
  return typeof title === 'string' && title.trim().length > 0 ? title.trim() : null
}

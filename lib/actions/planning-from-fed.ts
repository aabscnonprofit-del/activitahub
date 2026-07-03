'use server'

import { generateFromIdeaAction, type GenerateFromIdeaResult } from './planner'
import { buildFutureEventDescription, type EventDetails, type EventLocation } from '../domain/future-event-description'

/**
 * ADAPTER SEAM (TRANSIENT; currently unused by UI) — approved Future Event Description → legacy Planning.
 *
 * The smallest additive backend entry point for the future "approved FED → legacy Planning" continuation. It
 * builds the legacy FutureEventDescription (the `description` = the client-approved FED string, plus the
 * operational EventDetails + location the legacy Planning path still requires) and runs the EXISTING legacy
 * Planning path (`generateFromIdeaAction`) **unchanged**. It adds no behavior of its own and changes no
 * existing action or contract.
 *
 * It is completely additive: it is wired to no UI and no caller. It exists so a later slice can route the
 * approved FED into Planning without introducing new plumbing.
 *
 * REMOVAL TRIGGER: delete during the Planning migration, when Planning consumes the approved FED directly and
 * collects operational details under the Planning axioms (no legacy FutureEventDescription shape).
 */
export async function planFromApprovedFedAction(args: {
  approvedFutureEventDescription: string
  clientRequest: string
  details: EventDetails
  location: EventLocation
  projectId?: string
}): Promise<GenerateFromIdeaResult> {
  const fed = buildFutureEventDescription({
    clientRequest: args.clientRequest,
    description: (args.approvedFutureEventDescription ?? '').trim(),
    details: args.details,
    location: args.location,
  })
  return generateFromIdeaAction(fed, args.projectId)
}

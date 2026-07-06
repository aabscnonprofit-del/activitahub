// Participant View — the PURE projection + types (no I/O, no server/marketplace imports, so it is safe to
// import anywhere). Reuses the public-safe buildPublicEventProjection (which omits budget / staffing /
// resources / logistics / safety / feasibility). Exposes NO organizer-only data and NO participant contact info.

import { buildPublicEventProjection, type PublicEventProjection } from '@/lib/planning/public-event-projection'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

/** One scheduled occurrence, participant-safe (arrival time + location). */
export interface ParticipantViewOccurrence {
  startsAt: string
  endsAt: string | null
  location: string | null
}

/** The Participant View read model — only participant-permitted information. */
export interface ParticipantViewData {
  projectId: string
  event: PublicEventProjection | null
  occurrences: ParticipantViewOccurrence[]
  organizerName: string | null
  leadOrganizerName: string | null
}

/**
 * Compose the Participant View from the project's plan, occurrences, and public organizer contacts. Pure: the
 * prepared event is the public-safe projection; the schedule is date + location only; contacts are public
 * organizer names. Exposes NO organizer-only data. (Access is validated by the shared resolver in the loader.)
 */
export function buildParticipantView(
  projectId: string,
  plan: EventPlanV2 | null,
  occurrences: ParticipantViewOccurrence[],
  organizerName: string | null,
  leadOrganizerName: string | null,
): ParticipantViewData {
  return { projectId, event: plan ? buildPublicEventProjection(plan) : null, occurrences, organizerName, leadOrganizerName }
}

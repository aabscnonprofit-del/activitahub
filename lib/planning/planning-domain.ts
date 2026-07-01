// Planning Domain — Stage 5e of the Planning Layer Migration.
//
// Per docs/IMPLEMENTATION_CONTRACT.md, docs/PROJECT_STATE_MODEL_PRINCIPLE.md, and the accepted Stage 5e
// clarification: Project State is composed of multiple independent domains. The PLANNING DOMAIN holds the
// durable, editable planning inputs (the intention + planning parameters) and is the recompute source of
// truth. The FED is only the startup handoff that seeds the initial Planning Domain — it is NOT the
// persistent source of truth. PlannerInput is never reconstructed (Decision A).
//
// PURE module. The FED produced here is a TRANSIENT engine input built from the durable Planning Domain.

import type { FutureEventDescription } from '@/lib/domain/future-event-description'

/** The durable, editable planning inputs of a Project — a domain of Project State. */
export interface PlanningDomain {
  /** What the client originally asked for (intention). */
  clientRequest: string
  /** The approved "what should happen" / desired experience. */
  description: string
  /** Planning parameters (planned guest count, venue, schedule cues, activities, recurrence, ...). */
  details: FutureEventDescription['details']
  location: FutureEventDescription['location']
}

/** Seed the initial Planning Domain from the startup FED handoff (creation only). */
export function planningDomainFromFed(fed: FutureEventDescription): PlanningDomain {
  return { clientRequest: fed.clientRequest, description: fed.description, details: fed.details, location: fed.location }
}

/**
 * Build the TRANSIENT engine input (FED) from the durable Planning Domain for a recompute. The FED is not
 * persisted; the Planning Domain is the source of truth.
 */
export function planningDomainToFed(domain: PlanningDomain): FutureEventDescription {
  return { clientRequest: domain.clientRequest, description: domain.description, details: domain.details, location: domain.location }
}

/** The independent domains of Project State. Only the Planning Domain drives a planning recompute. */
export type ProjectDomain =
  | 'planning' | 'budget' | 'registration' | 'payments' | 'communication'
  | 'documents' | 'media' | 'reviews' | 'timeline'

/**
 * Domain routing: a change triggers Planning Engine V2 recompute ONLY when it occurs in the Planning Domain.
 * Every other domain (payments, registration, media, reviews, communication, documents, budget overlays,
 * timeline) updates independently and NEVER invokes Planning Engine.
 */
export function triggersRecompute(domain: ProjectDomain): boolean {
  return domain === 'planning'
}

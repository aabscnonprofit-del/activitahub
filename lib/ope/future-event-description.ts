// Future Event Description — the explicit Discovery → OPE hand-off object.
//
// Per docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md: Discovery PRODUCES the Future Event
// Description; OPE CONSUMES it. This type is the authoritative interface between the two
// modules. v1 is intentionally minimal — clientRequest, description, details, location —
// and carries NO Concept object (Concept is no longer a primary architectural object).
//
// `description` is the approved "what should happen" (implementation-independent). During
// migration, OPE converts this FED into its existing internal input
// (`approvedWhatShouldHappen`) as a TEMPORARY compatibility layer; the long-term interface
// is Discovery → FutureEventDescription → OPE — NOT approvedWhatShouldHappen.
//
// Type-only imports below are erased at compile time, so this module pulls no runtime
// dependency from the OPE core (safe to import from a client component).

import type { IdeaDetails } from './plan-from-idea'
import type { PlannerLocation } from './types'

export interface FutureEventDescription {
  /** The client's original request, in their own words (Client Request). */
  clientRequest: string
  /** The approved description of what should happen (implementation-independent). */
  description: string
  /** Operational details the client confirmed/completed. */
  details: IdeaDetails
  /** Where the event takes place. */
  location: PlannerLocation
}

/**
 * Discovery's producer: assemble the Future Event Description handed to OPE. Pure; trims
 * the free-text fields and never invents content.
 */
export function buildFutureEventDescription(args: {
  clientRequest: string
  description: string
  details: IdeaDetails
  location: PlannerLocation
}): FutureEventDescription {
  return {
    clientRequest: (args.clientRequest ?? '').trim(),
    description: (args.description ?? '').trim(),
    details: args.details,
    location: args.location,
  }
}

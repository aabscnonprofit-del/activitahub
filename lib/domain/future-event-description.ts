// Future Event Description — the neutral domain contract describing a future event.
//
// Stage 6.0 of the Planning Layer Migration: extracted from the legacy Planning Layer (formerly
// lib/ope/future-event-description.ts) into a neutral DOMAIN module. This is the canonical,
// implementation-independent description of a future event — produced by Discovery and consumed by Planning
// Engine V2 (the input it plans from; it also seeds a Project's Planning Domain).
//
// It belongs to the DOMAIN, not the legacy planner: it has ZERO dependency on lib/ope, PlannerInput,
// generatePlan, plan-from-idea, or any legacy OPE type/structure. All types below are self-contained.
//
// CANONICAL (Phase 0.2 — Single FED Declaration): this is the SINGLE canonical Future Event Description —
// the Discovery → Planning hand-off the product uses. The FED-like types in lib/discovery/types.ts are
// dormant OPE-V2 compatibility types to be reconciled later; this domain FED is the one in force.

/** Recurring cadence for a recurring event. */
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly'

/** A recurring-series modifier. */
export interface EventRecurrence {
  frequency: RecurrenceFrequency
  /** null/absent = ongoing (no end); a number = a bounded series. */
  sessions?: number | null
}

/** Where the event takes place. */
export interface EventLocation {
  city: string
  state?: string | null
  country: string
  postalCode?: string | null
}

/**
 * Operational details the client confirmed for the event. `category` is a free-form label carried for the
 * producer; Planning Engine V2 is intention-first and does not read it (no legacy category taxonomy is
 * enshrined here).
 */
export interface EventDetails {
  category: string
  guestCount: number
  adults?: number | null
  kids?: number | null
  venueType?: 'backyard_home' | 'public_park' | null
  budget?: number | null
  requirements?: string[]
  instructor?: 'have' | 'need' | null
  materials?: 'provided' | 'byo' | null
  recurrence?: EventRecurrence | null
}

/** The Future Event Description — the Discovery → Planning hand-off contract. */
export interface FutureEventDescription {
  /** The client's original request, in their own words. */
  clientRequest: string
  /** The approved description of what should happen (implementation-independent). */
  description: string
  /** Operational details the client confirmed/completed. */
  details: EventDetails
  /** Where the event takes place. */
  location: EventLocation
}

/**
 * Producer: assemble the Future Event Description. Pure; trims the free-text fields and never invents
 * content.
 */
export function buildFutureEventDescription(args: {
  clientRequest: string
  description: string
  details: EventDetails
  location: EventLocation
}): FutureEventDescription {
  return {
    clientRequest: (args.clientRequest ?? '').trim(),
    description: (args.description ?? '').trim(),
    details: args.details,
    location: args.location,
  }
}

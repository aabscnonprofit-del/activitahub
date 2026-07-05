// Planning Engine V2 — conceptual output types (Stage 1 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md and the approved "Planning Engine V2 Product
// Specification". These types represent the APPROVED conceptual outputs of Planning Engine
// V2 (experience design, structure/itinerary, logistics, resources, staffing, participant
// suitability, safety, contingency, an honest cost estimate, a feasibility statement, and
// traceability). They are intention-first by construction.
//
// They DELIBERATELY contain NO legacy PlannerInput concepts: no fixed category enum, no
// PlannerInput, no category-template costing. The event is described by what the client
// wants to happen, not by a templated event type.
//
// Stage 1 introduces these as an inert representation: nothing in production consumes them.
// This file defines TYPES ONLY — it contains no planning logic.

/**
 * A link from a plan element back to the client's original intention, so every element is
 * justifiable against what the client actually asked for (Spec §5 — traceability; no orphan
 * elements). `servesIntention` is a short statement of which part of the client's desire this
 * element fulfils; `derivedFrom` quotes/paraphrases the originating words when available.
 */
export interface IntentionTrace {
  servesIntention: string
  derivedFrom?: string
}

/** Whether a plan element is a direct expression of the client's request or a safety/feasibility necessity. */
export type ElementOrigin = 'client_intention' | 'safety_or_feasibility'

/**
 * An explicitly-marked assumption (Spec §4 — "Unknown information remains unknown; required
 * assumptions must be explicitly marked as assumptions"). The engine never silently invents a
 * fact: anything it had to assume to proceed is recorded here, with the reason it was needed.
 */
export interface Assumption {
  statement: string
  reason: string
}

/** The intended feeling and experiential arc that fulfils the client's intention (Spec §6 — experience design). */
export interface ExperienceDesign {
  /** The feeling/character the event should have, in the client's own terms. */
  intendedFeeling: string
  /** The experiential arc the event should follow. */
  arc: string
  trace: IntentionTrace
}

/** The overall shape/concept of the event (Spec §3.2 — event concept & structure). */
export interface EventStructure {
  concept: string
  trace: IntentionTrace
}

/**
 * How an operational plan item becomes due during execution — the Planning-owned ACTIVATION concept
 * (decomposed, deliberately NOT a single "condition" blob). v1 producers default to `manual` (the organizer
 * confirms it during execution, with no scheduled time); the other kinds are for authored / future plans.
 * Absolute scheduling is the Occurrence's responsibility, never Planning's.
 */
export interface OperationalTrigger {
  kind: 'manual' | 'relative_time' | 'after_item' | 'external_event'
}

/**
 * RELATIVE timing for an operational item — offsets from the event start and/or a duration, NEVER absolute
 * clock times (the Occurrence binds a concrete instance to absolute times). All fields optional; present only
 * when the plan expresses timing.
 */
export interface RelativeTiming {
  offsetFromStartMinutes?: number
  expectedDurationMinutes?: number
  deadlineOffsetMinutes?: number
}

/** A single moment/activity in the itinerary, with humane timing and pacing (Spec §3.3/§3.4). */
export interface ItineraryMoment {
  /** Stable executable identity — a language-independent internal key (Planning Enrichment Phase 1). Optional
   *  for backward compatibility: plans produced before enrichment (and their frozen Approved Snapshots) have
   *  none; new plans always set it. Not user-facing and not localized. */
  id?: string
  name: string
  purpose: string
  /** When/sequence and how long, expressed for the participants — not a fixed schema. */
  timing?: string
  pacing?: string
  /** Operational activation for execution monitoring — the decomposed ACTIVATION concept (Planning-owned).
   *  New plans default to `manual`; absent on legacy plans (resolve via operationalTrigger()). */
  trigger?: OperationalTrigger
  /** RELATIVE timing (offsets/durations, never absolute — the Occurrence binds absolute times). Optional. */
  temporal?: RelativeTiming
  /** Ids of items that must precede this one — the PREREQUISITE / eligibility concept. Optional. */
  prerequisiteIds?: string[]
  origin: ElementOrigin
  trace: IntentionTrace
}

/** Something that must physically happen for a moment to become real (Spec §3.5 — logistics). */
export interface LogisticItem {
  /** Stable executable identity — a language-independent internal key (Planning Enrichment Phase 1). Optional
   *  for backward compatibility (see ItineraryMoment.id). Not user-facing and not localized. */
  id?: string
  description: string
  /** Human-readable name of the moment this logistic serves (kept for display). */
  forMoment?: string
  /** Stable id of the moment this logistic serves — the machine-readable companion to `forMoment`
   *  (Increment 1). Optional; present only when a matching moment exists. */
  forMomentId?: string
  /** Operational activation for execution monitoring (Planning-owned). New plans default to `manual`;
   *  absent on legacy plans (resolve via operationalTrigger()). */
  trigger?: OperationalTrigger
  origin: ElementOrigin
  trace: IntentionTrace
}

/** A resource the designed experience requires (Spec §3.6). Conceptual — not a priced budget line. */
export interface ResourceNeed {
  label: string
  forMoment?: string
  origin: ElementOrigin
  trace: IntentionTrace
}

/** A person/role needed to deliver the experience, only as warranted (Spec §3.7 — staffing). */
export interface RoleNeed {
  role: string
  reason: string
  trace: IntentionTrace
}

/** Tailoring to the actual attendees — accessibility, dietary, comfort, age-appropriateness (Spec §3.8). */
export interface SuitabilityConsideration {
  consideration: string
  accommodation: string
  trace: IntentionTrace
}

/** A risk to the people or the experience, and how it is safeguarded (Spec §3.9 — safety & duty of care). */
export interface SafetyConsideration {
  risk: string
  safeguard: string
}

/** A fallback for a fragile moment (Spec §3.10 — contingency planning). */
export interface Contingency {
  ifThisFails: string
  fallback: string
}

/**
 * An honest cost ESTIMATE derived from the real resource/role needs of the designed
 * experience — a range, never a sale price (Spec §3.11; Budget later turns this into price).
 */
export interface CostEstimate {
  low: number
  likely: number
  high: number
  currency: string
  /** How the estimate was derived (which needs it reflects) — for transparency, never invention. */
  basis: string
}

/** The engine's honest judgement about whether it can responsibly plan this (Spec §3.12 / §6). */
export type FeasibilityVerdict = 'planned' | 'uncertain' | 'needs_human_decision' | 'out_of_scope'

export interface FeasibilityStatement {
  verdict: FeasibilityVerdict
  /** What is confident, what is uncertain, and what is left to the human to decide. */
  notes: string
}

/**
 * The complete Event Plan produced by Planning Engine V2 — a prepared, reviewable design for
 * realizing the client's intention (Spec §6). Implementation-independent: the organizer sees
 * "their event, prepared", never internal entities.
 */
export interface EventPlanV2 {
  experienceDesign: ExperienceDesign
  structure: EventStructure
  itinerary: ItineraryMoment[]
  logistics: LogisticItem[]
  resources: ResourceNeed[]
  staffing: RoleNeed[]
  suitability: SuitabilityConsideration[]
  safety: SafetyConsideration[]
  contingencies: Contingency[]
  costEstimate: CostEstimate
  feasibility: FeasibilityStatement
  /** Every assumption the engine had to make to proceed (Spec §4); empty if none were needed. */
  assumptions: Assumption[]
  /** The client's original words, preserved for end-to-end traceability (Spec §5). */
  originalIntention: string
}

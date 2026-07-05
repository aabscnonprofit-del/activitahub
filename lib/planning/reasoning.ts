// Planning Engine V2 — deterministic reasoning/composition (Stage 2 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md and the approved "Planning Engine V2 Product Specification".
//
// Turns the intention signals (intention-signals.ts) + the FED's confirmed details into a complete,
// reviewable EventPlanV2. It reasons like an experienced organizer: start from the intention, design
// the experience, then make it real — never from a category template, never with a language model.
//
// DETERMINISTIC: fixed mappings, fixed iteration order, no randomness/clock/hidden state.
// NEVER invents stated facts: unknown headcount stays unknown; anything assumed is recorded in
// `assumptions`. Every produced element carries traceability back to the intention.

import type { FutureEventDescription } from '@/lib/domain/future-event-description'
import type {
  Assumption, Contingency, CostEstimate, ElementOrigin, EventPlanV2, ExperienceDesign,
  FeasibilityStatement, IntentionTrace, ItineraryMoment, LogisticItem, ResourceNeed,
  RoleNeed, SafetyConsideration, SuitabilityConsideration,
} from './event-plan-v2'
import { extractSignals, type Element, type IntentionSignals, type Quality } from './intention-signals'

// Nominal planning-estimate units (NOT market prices) — fixed for determinism; refined by Budget.
const UNIT_RESOURCE = 150
const UNIT_ROLE = 200
const FALLBACK_HEADCOUNT = 1

const QUALITY_WORD: Record<Quality, string> = {
  relaxing: 'relaxing', celebratory: 'celebratory', intimate: 'intimate', formal: 'formal',
  somber: 'solemn and respectful', energetic: 'energetic', scenic: 'scenic and beautiful',
  wellness: 'restorative', professional: 'professional',
}

// Canonical event flow: the order moments appear in when their element is present.
const ELEMENT_ORDER: readonly Element[] = [
  'sightseeing', 'class', 'sessions', 'networking', 'ceremony', 'reception', 'activities', 'dining', 'music', 'transport',
]

function momentName(el: Element, somber: boolean, relaxing: boolean): string {
  switch (el) {
    case 'sightseeing': return 'Scenic time'
    case 'class': return 'The class'
    case 'sessions': return 'Sessions / program'
    case 'networking': return 'Networking'
    case 'ceremony': return somber ? 'The service' : 'The ceremony'
    case 'reception': return somber ? 'Gathering' : 'Reception'
    case 'activities': return 'Activities'
    case 'dining': return relaxing ? 'A relaxed meal' : 'The meal'
    case 'music': return 'Music'
    case 'transport': return 'Journey home'
  }
}

function elementResource(el: Element): string | null {
  switch (el) {
    case 'sightseeing': return 'A scenic location with the views the client wanted'
    case 'class': return 'A suitable space and any class equipment'
    case 'sessions': return 'A venue with seating and AV for the program'
    case 'networking': return 'An open space suitable for people to mingle'
    case 'ceremony': return 'A setting appropriate for the ceremony'
    case 'reception': return 'A reception/gathering space'
    case 'activities': return 'Materials for the planned activities'
    case 'dining': return 'A dining setting matching the desired ambiance'
    case 'music': return 'Music / sound provision'
    case 'transport': return 'Transport for the journey (e.g. the requested vehicle)'
  }
}

function elementLogistic(el: Element): string | null {
  switch (el) {
    case 'sightseeing': return 'Identify and confirm access to the scenic setting'
    case 'class': return 'Secure the space and prepare equipment'
    case 'sessions': return 'Secure the venue, schedule the program, set up AV'
    case 'networking': return 'Allocate time and space for people to connect'
    case 'ceremony': return 'Confirm the setting and the order of the ceremony'
    case 'reception': return 'Confirm the gathering space and its setup'
    case 'activities': return 'Prepare and supervise the activities'
    case 'dining': return 'Reserve a dining setting matching the desired ambiance'
    case 'music': return 'Arrange the music/sound'
    case 'transport': return 'Arrange the transport requested for the journey'
  }
}

function trace(servesIntention: string, derivedFrom?: string): IntentionTrace {
  return derivedFrom ? { servesIntention, derivedFrom } : { servesIntention }
}

/** Compose the complete EventPlanV2 from the FED. Pure + deterministic. */
export function composeEventPlan(fed: FutureEventDescription, signals: IntentionSignals): EventPlanV2 {
  const assumptions: Assumption[] = []
  const somber = signals.tone === 'somber'
  const relaxing = signals.qualities.includes('relaxing')
  const elderly = signals.traits.includes('elderly')
  const children = signals.traits.includes('children')
  const headcount = fed.details?.guestCount ?? null

  // ── Itinerary (the sequence of moments, built first so logistics/resources can reference it) ──
  const pacing = elderly ? 'Gentle, unhurried pace with rest between moments'
    : children ? 'Short, supervised segments'
    : undefined
  const presentElements = ELEMENT_ORDER.filter((el) => signals.elements.includes(el))
  const itinerary: ItineraryMoment[] = presentElements.map((el, i) => {
    const name = momentName(el, somber, relaxing)
    const seq = presentElements.length === 1 ? 'the focus of the event'
      : i === 0 ? 'first' : i === presentElements.length - 1 ? 'finally' : 'then'
    const moment: ItineraryMoment = {
      // Stable executable identity — deterministic, derived from the internal Element key (Enrichment Phase 1).
      id: `itinerary:${el}`,
      name,
      purpose: `Delivers the "${el}" the client asked for, as ${seq} of the experience`,
      timing: seq,
      origin: 'client_intention' as ElementOrigin,
      trace: trace(`The client asked for ${el}`, signals.matched[`element:${el}`]),
    }
    if (pacing) moment.pacing = pacing
    return moment
  })
  if (presentElements.length > 1) {
    assumptions.push({ statement: 'The order of moments is a suggested sequence, not a fixed schedule.', reason: 'The client did not state an explicit order; a sensible flow was reasoned.' })
  }
  const momentNames = new Set(itinerary.map((m) => m.name))

  // ── Logistics + resources (one per present element, referencing the matching moment) ──
  const logistics: LogisticItem[] = presentElements.map((el) => {
    const name = momentName(el, somber, relaxing)
    const item: LogisticItem = {
      // Stable executable identity — deterministic, derived from the internal Element key (Enrichment Phase 1).
      id: `logistic:${el}`,
      description: elementLogistic(el) as string,
      origin: 'client_intention',
      trace: trace(`Makes the "${el}" moment real`, signals.matched[`element:${el}`]),
    }
    if (momentNames.has(name)) item.forMoment = name
    return item
  })
  const resources: ResourceNeed[] = presentElements.map((el) => {
    const name = momentName(el, somber, relaxing)
    const r: ResourceNeed = {
      label: elementResource(el) as string,
      origin: 'client_intention',
      trace: trace(`Required to deliver the "${el}" moment`, signals.matched[`element:${el}`]),
    }
    if (momentNames.has(name)) r.forMoment = name
    return r
  })

  // ── Staffing (only as the experience warrants) ──
  const staffing: RoleNeed[] = []
  if (signals.elements.includes('sessions')) {
    staffing.push({ role: 'Event coordinator', reason: 'A multi-session program needs coordination', trace: trace('Coordinates the requested program', signals.matched['element:sessions']) })
    staffing.push({ role: 'AV technician', reason: 'Sessions require working audio/visual', trace: trace('Supports the sessions the client asked for', signals.matched['element:sessions']) })
  }
  if (signals.elements.includes('class') && fed.details?.instructor === 'need') {
    staffing.push({ role: 'Instructor', reason: 'The client indicated an instructor is needed', trace: trace('Leads the class the client asked for', signals.matched['element:class']) })
  }
  if (headcount != null && headcount >= 50 && !signals.elements.includes('sessions')) {
    staffing.push({ role: 'Event coordinator', reason: `A larger group (${headcount}) needs on-the-day coordination`, trace: trace('Keeps a larger event running smoothly') })
  }

  // ── Participant suitability ──
  const suitability: SuitabilityConsideration[] = []
  if (elderly) suitability.push({ consideration: 'Older participants', accommodation: 'Accessible routes, comfortable seating, gentle pace, minimal walking', trace: trace('The event is for older participants', signals.matched['trait:elderly']) })
  if (children) suitability.push({ consideration: 'Children present', accommodation: 'Age-appropriate activities and adequate adult supervision', trace: trace('Children attend', signals.matched['trait:children']) })

  // ── Safety & duty of care ──
  const safety: SafetyConsideration[] = []
  if (elderly) safety.push({ risk: 'Mobility and health of older participants', safeguard: 'Accessible access, seating, shade, and an unhurried pace' })
  if (children) safety.push({ risk: 'Child safety', safeguard: 'Supervision ratios and a hazard check of the space' })
  if (signals.qualities.includes('scenic') || signals.matched['element:sightseeing'] || /beach|outdoor|park/.test(signals.source)) {
    safety.push({ risk: 'Outdoor exposure (sun, heat, footing)', safeguard: 'Shade, water, and weather-appropriate timing' })
  }

  // ── Contingencies (fallbacks for fragile moments) ──
  const contingencies: Contingency[] = []
  if (signals.qualities.includes('scenic') || signals.matched['element:sightseeing'] || signals.recurring) {
    contingencies.push({ ifThisFails: 'Weather disrupts an outdoor moment', fallback: 'A sheltered or indoor alternative for the same experience' })
  }
  if (signals.elements.includes('transport')) contingencies.push({ ifThisFails: 'The arranged transport is unavailable', fallback: 'A pre-identified backup vehicle/service' })
  if (signals.elements.includes('dining')) contingencies.push({ ifThisFails: 'The chosen dining setting falls through', fallback: 'An alternative venue with a similar ambiance' })

  // ── Experience design & structure ──
  const feelingWords = signals.qualities.length ? signals.qualities.map((q) => QUALITY_WORD[q]).join(', ') : 'true to the client’s request'
  const experienceDesign: ExperienceDesign = {
    intendedFeeling: `The event should feel ${feelingWords}.`,
    arc: itinerary.length
      ? `An experience that moves through: ${itinerary.map((m) => m.name).join(' → ')}.`
      : 'A single meaningful gathering true to the request.',
    trace: trace('Expresses the experience the client described', signals.matched[`quality:${signals.qualities[0]}`]),
  }
  const structure = {
    concept: itinerary.length
      ? `A ${signals.tone === 'neutral' ? '' : signals.tone + ' '}event built around: ${presentElements.join(', ')}.`
      : 'A single gathering shaped by the client’s stated intention.',
    trace: trace('The shape of the event follows the elements the client asked for'),
  }

  // ── Honest cost estimate (derived from the real needs; nominal, refined by Budget) ──
  const hc = headcount ?? FALLBACK_HEADCOUNT
  if (headcount == null) assumptions.push({ statement: 'Headcount is unspecified; a minimal headcount was used for the rough estimate.', reason: 'The client did not state a number of attendees.' })
  const base = resources.length * UNIT_RESOURCE + staffing.length * UNIT_ROLE
  const scaled = base + (resources.length * UNIT_RESOURCE * Math.max(0, hc - 1) * 0.1)
  const likely = Math.round(scaled)
  const costEstimate: CostEstimate = {
    low: Math.round(scaled * 0.8),
    likely,
    high: Math.round(scaled * 1.3),
    currency: 'USD',
    basis: `Nominal planning estimate from ${resources.length} resource need(s) and ${staffing.length} role(s)${headcount != null ? ` for ${headcount} attendee(s)` : ''}; to be priced in Budget. Unit values are placeholders, not market prices.`,
  }
  assumptions.push({ statement: 'Currency assumed to be USD.', reason: 'No currency was stated; the location implies USD. Confirm in Budget.' })

  // ── Feasibility ──
  const feasibility: FeasibilityStatement = {
    verdict: signals.elements.length === 0 && signals.qualities.length === 0 ? 'needs_human_decision' : 'planned',
    notes: signals.elements.length === 0 && signals.qualities.length === 0
      ? 'The request did not yield enough planning signal; a human decision is needed before planning.'
      : `Planned from the client’s intention. ${headcount == null ? 'Headcount is unknown (see assumptions). ' : ''}The cost figure is a rough estimate to be priced in Budget.`,
  }

  return {
    experienceDesign,
    structure,
    itinerary,
    logistics,
    resources,
    staffing,
    suitability,
    safety,
    contingencies,
    costEstimate,
    feasibility,
    assumptions,
    originalIntention: fed.clientRequest ?? '',
  }
}

/** Convenience: extract signals and compose in one deterministic step. */
export function reasonEventPlan(fed: FutureEventDescription): EventPlanV2 {
  return composeEventPlan(fed, extractSignals(fed))
}

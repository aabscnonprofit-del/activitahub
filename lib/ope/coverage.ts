// Coverage / Complexity Gate — OPE Stage 1 routing (see docs/OPE_MASTER_SPEC.md §4,
// docs/OPE_GAP_ANALYSIS.md §4, docs/OPE_STRESS_TEST.md).
//
// Purpose: STOP the engine from producing confident, wrong plans for activities it
// cannot credibly plan. Before any composition runs, this gate inspects the request
// and returns one of four states. There is NO silent category fallback: an event the
// gate cannot support is refused/handed off, never force-mapped to birthday/bbq.
//
// Supported MVP set:
//   - kids birthday              (category 'birthday')
//   - BBQ / family picnic        (category 'bbq')
//   - simple networking event    (category 'networking') ONLY if a budget is given
//                                 (fixed) — we cannot price networking yet, so an
//                                 unpriced networking plan is only produced when the
//                                 user has explicitly supplied a budget target.
//
// This gate does NOT add new categories, vendors, staffing, or monitoring. It only
// decides whether OPE should plan, refuse, or hand off.

import { ACTIVITIES, patternOf } from './activities'
import type { PlannerInput } from './types'

export type CoverageStatus =
  | 'plan_ready'
  | 'unsupported'
  | 'needs_human_review'
  | 'needs_certified_organizer'
  | 'unsupported_modifier'

export interface CoverageDecision {
  status: CoverageStatus
  reason: string
  recommended_next_step: string
  /** Engine confidence it can produce a reliable plan for this request (0–1). */
  confidence: number
  missing_capabilities: string[]
}

// Thresholds beyond which the self-serve planner should not produce a DIY plan.
const SELF_SERVE_MAX_GUESTS = 60
const HIGH_BUDGET = 5000
const MINORS_AT_SCALE = 30

const NEXT_ORGANIZER = 'Hand this event to a certified organizer who can plan and run it end to end.'
const NEXT_REVIEW = 'This needs a human check before planning — request review or a certified organizer.'
const NEXT_UNSUPPORTED =
  'This activity type is not supported by the planner yet. We will not generate a plan that could be wrong.'

interface DomainRule {
  match: RegExp
  status: CoverageStatus
  reason: string
  missing: string[]
  next: string
  confidence: number
  /**
   * M3: this rule describes a now-supported Class domain (fitness/education/class
   * cadence). It is SKIPPED when the user explicitly chose a Class category — the
   * category is authoritative. For every non-Class pattern the rule still applies,
   * so free-text "yoga"/"workshop" inside a networking event stays unsupported
   * (M1/M2 byte-identical; no auto-conversion to Class).
   */
  classDomain?: boolean
}

// Ordered: first match wins. Money-handling and high-stakes first, then unsupported
// activity domains, then recurring/series. Matched against the user's special
// requirements (the only free-text signal the engine has today).
const DOMAIN_RULES: DomainRule[] = [
  {
    match: /\b(fundraiser|fundraising|donation|donations|donate|auction|raffle|sponsor|sponsors|sponsorship|gala|proceeds)\b/,
    status: 'needs_human_review',
    reason:
      'This event collects or handles money (donations, tickets, auction, sponsorship), which the planner does not handle.',
    missing: ['revenue_collection', 'ticketing_donations', 'financial_reconciliation'],
    next: NEXT_REVIEW,
    confidence: 0.2,
  },
  {
    match: /\b(wedding|bride|groom|ceremony|reception|vows|nuptials)\b/,
    status: 'needs_certified_organizer',
    reason: 'Weddings are high-stakes, multi-vendor events beyond the self-serve planner.',
    missing: ['category:wedding', 'vendor_management', 'staffing', 'large_event_logistics'],
    next: NEXT_ORGANIZER,
    confidence: 0.15,
  },
  {
    match: /\b(tournament|bracket|brackets|referee|referees|league|championship|playoff|playoffs|fixtures)\b/,
    status: 'unsupported',
    reason:
      'Competitive sports events (brackets, referees, registration, medical cover) are not a supported activity type yet.',
    missing: ['category:sports_tournament', 'staffing:referees_medics', 'competition_format'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
  },
  {
    match: /\b(cleanup|clean-up|litter|waiver|waivers)\b/,
    status: 'unsupported',
    reason:
      'Volunteer / cleanup events (liability waivers, supplies, disposal, permits) are not a supported activity type yet.',
    missing: ['category:volunteer', 'liability_waivers', 'supplies_logistics'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
  },
  {
    match: /\b(hiking|hike|trail|trails|trek|trekking|climb|climbing|kayak|kayaking|camping|backpacking)\b/,
    status: 'unsupported',
    reason:
      'Outdoor adventure activities (route safety, permits, transport) are not a supported activity type yet.',
    missing: ['category:outdoor_adventure', 'route_safety', 'permits'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
  },
  {
    match: /\b(workshop|seminar|training|lecture|curriculum|syllabus|lesson|lessons|easel|easels|pottery|painting)\b/,
    status: 'unsupported',
    reason:
      'Classes and educational sessions (curriculum, materials, registration, instructor) are not a supported activity type yet.',
    missing: ['category:education', 'curriculum_materials', 'registration', 'instructor_staffing'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
    classDomain: true,
  },
  {
    match: /\b(yoga|pilates|zumba|workout)\b/,
    status: 'unsupported',
    reason: 'Fitness classes (recurring sessions, instructor, waivers) are not a supported activity type yet.',
    missing: ['category:fitness_class', 'recurring_scheduling', 'instructor_staffing'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
    classDomain: true,
  },
  {
    // M2: recurrence itself is now a supported modifier on recurring-capable
    // patterns, so the pure cadence words no longer auto-refuse. Only Community
    // (club) and Class remain unsupported here.
    match: /\b(club)\b|\bclass\b/,
    status: 'unsupported',
    reason:
      'Recurring or series events (clubs, weekly/monthly meetups, classes) are not modeled yet — the planner only handles single events.',
    missing: ['recurring_scheduling'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
    classDomain: true,
  },
]

// Class-specific gating keywords (only evaluated for Class categories). Ordered.
interface ClassGateRule {
  match: RegExp
  status: CoverageStatus
  reason: string
  missing: string[]
  next: string
  confidence: number
}
const CLASS_GATE_RULES: ClassGateRule[] = [
  {
    match: /\b(therapy|therapeutic|physio|physiotherapy|medical|clinical|rehab|rehabilitation|counsel(?:l)?ing|psych)\b/,
    status: 'needs_human_review',
    reason: 'Medical or therapeutic classes need professional oversight the planner does not provide.',
    missing: ['medical_oversight', 'clinical_compliance'],
    next: NEXT_REVIEW,
    confidence: 0.2,
  },
  {
    match: /\b(scuba|diving|firearm|firearms|gun|shooting|driving|aviation|pilot|licen[sc]e|licen[sc]ed|certification[- ]required)\b/,
    status: 'unsupported',
    reason: 'Regulated or licensed classes require licensing the planner does not model yet.',
    missing: ['regulatory_licensing'],
    next: NEXT_UNSUPPORTED,
    confidence: 0.1,
  },
  {
    match: /\b(aerial|trapeze|full[- ]contact|sparring|rock climbing|climbing|skydiv|parkour|combat)\b/,
    status: 'needs_certified_organizer',
    reason: 'High-risk physical classes need a certified organizer to handle safety and liability.',
    missing: ['high_risk_safety', 'liability', 'staffing'],
    next: NEXT_ORGANIZER,
    confidence: 0.15,
  },
]

// A class with a meaningful number of children but no supervision data is gated:
// we never invent supervision assumptions.
const CLASS_MINORS_THRESHOLD = 8

/** Decide whether OPE should plan this request, refuse it, or hand it off. */
export function evaluateCoverage(input: PlannerInput): CoverageDecision {
  const signal = (input.specialRequirements ?? []).join(' | ').toLowerCase()
  const pattern = patternOf(input.category)

  // 1. Unsupported / handoff domains detected from the request's free-text signals.
  //    Class-domain rules (fitness/education/class cadence) are skipped only when the
  //    user explicitly chose a Class category — never an auto-conversion of free text.
  for (const rule of DOMAIN_RULES) {
    if (pattern === 'class' && rule.classDomain) continue
    if (rule.match.test(signal)) {
      return {
        status: rule.status,
        reason: rule.reason,
        recommended_next_step: rule.next,
        confidence: rule.confidence,
        missing_capabilities: rule.missing,
      }
    }
  }

  // 2. Structural complexity gates (size / budget / minors at scale).
  if (input.guestCount > SELF_SERVE_MAX_GUESTS) {
    return {
      status: 'needs_certified_organizer',
      reason: `An event of about ${input.guestCount} guests is larger than the self-serve planner safely covers (up to ${SELF_SERVE_MAX_GUESTS}).`,
      recommended_next_step: NEXT_ORGANIZER,
      confidence: 0.2,
      missing_capabilities: ['large_event_logistics', 'vendor_management', 'staffing'],
    }
  }
  if (input.budget != null && input.budget > HIGH_BUDGET) {
    return {
      status: 'needs_certified_organizer',
      reason: `A budget over ${HIGH_BUDGET} indicates a higher-stakes event beyond self-serve planning.`,
      recommended_next_step: NEXT_ORGANIZER,
      confidence: 0.2,
      missing_capabilities: ['large_event_logistics', 'vendor_management'],
    }
  }
  if ((input.kids ?? 0) > MINORS_AT_SCALE) {
    return {
      status: 'needs_human_review',
      reason: `Supervising more than ${MINORS_AT_SCALE} children is beyond the planner's safety guidance.`,
      recommended_next_step: NEXT_REVIEW,
      confidence: 0.25,
      missing_capabilities: ['minor_supervision_at_scale'],
    }
  }

  // 3. Modifier compatibility (M2 Recurring). Recurrence is only offered on
  //    recurring-capable activities (Meetup). If it is supplied for a one-time
  //    activity (any Celebration), refuse with a clear fix — do NOT silently ignore.
  if (input.recurrence != null && !ACTIVITIES[input.category].recurringCapable) {
    return {
      status: 'unsupported_modifier',
      reason:
        'This activity is normally planned as a one-time event. Remove recurrence or choose a recurring-capable activity.',
      recommended_next_step:
        'Remove the recurrence option, or pick an activity that supports a recurring series.',
      confidence: 0.2,
      missing_capabilities: [`recurring:${input.category}`],
    }
  }

  // 4. Pattern-based support. Missing inputs (e.g. a networking budget, a venue, an
  //    instructor) are handled by the Clarification loop, not refused here —
  //    UNKNOWN → ASK, not escalate.

  // Class (M3): gate medical/regulated/high-risk classes, and children-heavy
  // classes without supervision data, before producing a plan.
  if (pattern === 'class') {
    for (const rule of CLASS_GATE_RULES) {
      if (rule.match.test(signal)) {
        return {
          status: rule.status,
          reason: rule.reason,
          recommended_next_step: rule.next,
          confidence: rule.confidence,
          missing_capabilities: rule.missing,
        }
      }
    }
    if ((input.kids ?? 0) >= CLASS_MINORS_THRESHOLD) {
      return {
        status: 'needs_human_review',
        reason: `A class with ${input.kids} children needs supervision arrangements the planner does not model — a person should review it.`,
        recommended_next_step: NEXT_REVIEW,
        confidence: 0.25,
        missing_capabilities: ['minor_supervision', 'child_safeguarding'],
      }
    }
    return {
      status: 'plan_ready',
      reason: 'Supported class within self-serve planning limits.',
      recommended_next_step: 'Review your generated plan below.',
      confidence: 0.7,
      missing_capabilities: [],
    }
  }

  if (pattern === 'meetup') {
    return {
      status: 'plan_ready',
      reason: 'Simple networking event with a fixed budget — supported (plan generated without a computed price estimate).',
      recommended_next_step: 'Review your generated plan below.',
      confidence: 0.55,
      missing_capabilities: ['budget_pricing:networking'],
    }
  }
  if (pattern === 'celebration') {
    return {
      status: 'plan_ready',
      reason: 'Supported activity within self-serve planning limits.',
      recommended_next_step: 'Review your generated plan below.',
      confidence: 0.8,
      missing_capabilities: [],
    }
  }

  // Defensive: a pattern not supported in M1 (cannot occur through the validated form).
  return {
    status: 'unsupported',
    reason: 'This activity type is not supported by the planner.',
    recommended_next_step: NEXT_UNSUPPORTED,
    confidence: 0.1,
    missing_capabilities: ['category:unknown'],
  }
}

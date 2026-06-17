// Deterministic free-text → PlannerInput parser (LLM-free). This is the MANDATORY
// fallback for the AI Understanding layer (lib/ai/request-understanding.ts): given a
// natural-language event request, it extracts only what is explicitly stated and
// assembles a validated PlannerInput. It never invents values — a missing field stays
// empty, and a request with no derivable category/headcount yields input = null.
//
// It feeds the UNCHANGED deterministic engine (generatePlan); it does not touch the
// engine, pricing, budget, staffing, resource, or readiness logic.

import type { PlannerInput, PlannerLocation, PlannerCategory, RecurrenceFrequency } from './types'
import { plannerInputSchema } from './validation'

/** The fields AI / the parser may extract from a request (no plan generation). */
export interface TextExtraction {
  category: PlannerCategory | null
  guestCount: number | null
  adults: number | null
  kids: number | null
  venueType: 'backyard_home' | 'public_park' | null
  budget: number | null
  timeframe: string | null
  recurrenceFrequency: RecurrenceFrequency | null
  specialRequirements: string[]
  desiredOutcome: string | null
}

/** Categories the engine can run as a recurring series. */
const RECURRING = new Set<PlannerCategory>([
  'networking', 'fitness_class', 'art_class', 'language_class', 'workshop',
])

/** Map a timeframe phrase to a recurrence frequency, or null (one-time/unknown). */
export function deriveRecurrence(text: string | null): RecurrenceFrequency | null {
  if (!text) return null
  const t = text.toLowerCase()
  if (/biweekly|every other week|every two weeks|fortnight/.test(t)) return 'biweekly'
  if (/weekly|every week|every (?:sun|mon|tue|wed|thu|fri|sat)/.test(t)) return 'weekly'
  if (/monthly|every month/.test(t)) return 'monthly'
  return null
}

function detectCategory(t: string): PlannerCategory | null {
  if (/\byoga\b|fitness class|fitness bootcamp|pilates|zumba|spin class|workout class/.test(t)) return 'fitness_class'
  if (/art class|art workshop|painting class|drawing class|pottery|craft workshop/.test(t)) return 'art_class'
  if (/language class|language exchange class|spanish class|french class|english class|german class/.test(t)) return 'language_class'
  if (/anniversary/.test(t)) return 'anniversary'
  if (/graduation/.test(t)) return 'graduation'
  if (/reunion/.test(t)) return 'family_reunion'
  if (/\bbbq\b|barbecue|bar-?b-?q|cookout|grill out|picnic/.test(t)) return 'bbq'
  if (/networking|business mixer|\bmixer\b|meetup|entrepreneurs/.test(t)) return 'networking'
  if (/workshop/.test(t)) return 'workshop'
  if (/birthday/.test(t)) {
    return /\bkid|\bchild|children|\bson\b|\bdaughter\b/.test(t) ? 'birthday' : 'adult_birthday'
  }
  return null
}

const intFrom = (m: RegExpMatchArray | null): number | null => {
  if (!m) return null
  const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/[,\s]/g, '')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

/** Extract the structured fields from a free-text request (deterministic, no AI). */
export function extractFromText(text: string): TextExtraction {
  const t = (text || '').toLowerCase()

  const kids = intFrom(t.match(/(\d+)\s*(?:kids|children|child)/))
  const adults = intFrom(t.match(/(\d+)\s*adults?/))
  let guestCount =
    intFrom(t.match(/(\d+)\s*(?:people|guests?|participants?|attendees?|persons?|pax|players?|members?|employees?|students?|professionals?)/)) ??
    intFrom(t.match(/\bfor\s+(\d+)\b/))
  if (guestCount == null && (adults != null || kids != null)) guestCount = (adults ?? 0) + (kids ?? 0)

  const venueType: TextExtraction['venueType'] =
    /\bpark\b|public park|\boutdoors?\b|outdoor/.test(t) ? 'public_park'
      : /backyard|back yard|\bgarden\b|at home|my house|our house|at our place/.test(t) ? 'backyard_home'
        : null

  const budget = intFrom(t.match(/\$\s*([\d,]+)|budget(?:\s+of)?\s*\$?\s*([\d,]+)|([\d,]+)\s*(?:dollars|usd|bucks)/))

  const recurrenceFrequency = deriveRecurrence(t)
  let timeframe: string | null = recurrenceFrequency
  if (!timeframe) {
    const tm = t.match(/\b(next month|this weekend|next week|tomorrow|next \w+day|in \d+ (?:weeks?|months?))\b/)
    timeframe = tm ? tm[1] : null
  }

  return {
    category: detectCategory(t),
    guestCount,
    adults,
    kids,
    venueType,
    budget,
    timeframe,
    recurrenceFrequency,
    specialRequirements: [], // free-text constraints are left to the AI layer
    desiredOutcome: null,
  }
}

/**
 * Assemble a validated PlannerInput from an extraction + a location. Returns null when
 * the category or a usable headcount is missing (never invents them). Recurrence is
 * applied only for recurring-capable categories.
 */
export function buildPlannerInput(ext: TextExtraction, location: PlannerLocation): PlannerInput | null {
  if (!ext.category) return null
  const guestCount = ext.guestCount ?? (ext.adults != null || ext.kids != null ? (ext.adults ?? 0) + (ext.kids ?? 0) : null)
  if (guestCount == null || guestCount < 1) return null

  const special: string[] = []
  if (ext.desiredOutcome?.trim()) special.push(`Outcome: ${ext.desiredOutcome.trim()}`.slice(0, 120))
  for (const r of ext.specialRequirements) {
    const v = (r ?? '').trim()
    if (v) special.push(v.slice(0, 120))
  }
  const recurring = !!ext.recurrenceFrequency && RECURRING.has(ext.category)
  if (ext.timeframe && !recurring) special.push(`Timeframe: ${ext.timeframe}`.slice(0, 120))

  const candidate: PlannerInput = {
    category: ext.category,
    guestCount,
    ...(ext.adults != null ? { adults: ext.adults } : {}),
    ...(ext.kids != null ? { kids: ext.kids } : {}),
    venueType: ext.venueType,
    budget: ext.budget,
    specialRequirements: special.slice(0, 20),
    location,
    ...(recurring ? { recurrence: { frequency: ext.recurrenceFrequency as RecurrenceFrequency } } : {}),
  }

  const parsed = plannerInputSchema.safeParse(candidate)
  return parsed.success ? (parsed.data as PlannerInput) : null
}

/** Deterministic understanding: free text → { extraction, input }. The fallback path. */
export function parseEventText(
  text: string,
  location: PlannerLocation,
): { extraction: TextExtraction; input: PlannerInput | null } {
  const extraction = extractFromText(text)
  return { extraction, input: buildPlannerInput(extraction, location) }
}

/**
 * Merge an AI extraction onto the deterministic one with **deterministic precedence**:
 * a value the deterministic parser found (i.e. one explicitly stated in the text) always
 * wins; AI only fills fields the deterministic parser left empty. AI can never override
 * an explicitly stated value. Pure.
 */
export function mergeTextExtraction(det: TextExtraction, ai: TextExtraction): TextExtraction {
  const pick = <T>(d: T | null, a: T | null): T | null => (d != null ? d : a)
  const timeframe = pick(det.timeframe, ai.timeframe)
  return {
    category: pick(det.category, ai.category),
    guestCount: pick(det.guestCount, ai.guestCount),
    adults: pick(det.adults, ai.adults),
    kids: pick(det.kids, ai.kids),
    venueType: pick(det.venueType, ai.venueType),
    budget: pick(det.budget, ai.budget),
    timeframe,
    recurrenceFrequency: pick(det.recurrenceFrequency, ai.recurrenceFrequency),
    // The deterministic parser does not attempt these soft fields, so AI fills them.
    specialRequirements: det.specialRequirements.length ? det.specialRequirements : ai.specialRequirements,
    desiredOutcome: pick(det.desiredOutcome, ai.desiredOutcome),
  }
}

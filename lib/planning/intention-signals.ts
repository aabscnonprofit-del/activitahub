// Planning Engine V2 — deterministic intention signals (Stage 2 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md and the approved "Planning Engine V2 Product Specification".
//
// This module reasons over the approved Future Event Description WITHOUT a language model. It does
// NOT interpret language (that is Discovery's job, already done) — it detects fixed, known planning
// SIGNALS from the FED's text and confirmed details, so the reasoning layer can plan from the
// client's intention rather than from a legacy event category.
//
// DETERMINISTIC by construction: fixed keyword tables iterated in fixed order; no randomness, no
// clock, no hidden state. The same FED always yields the same signals.
//
// It contains NO legacy PlannerInput concept and imports only the FED type (the approved input).

import type { FutureEventDescription } from '@/lib/ope/future-event-description'

/** Experience qualities the client expressed. Fixed vocabulary — intention, not category. */
export type Quality =
  | 'relaxing' | 'celebratory' | 'intimate' | 'formal' | 'somber' | 'energetic'
  | 'scenic' | 'wellness' | 'professional'

/** Concrete experience elements the client asked for (or that the request structurally implies). */
export type Element =
  | 'dining' | 'transport' | 'ceremony' | 'reception' | 'sessions' | 'networking'
  | 'class' | 'activities' | 'sightseeing' | 'music'

/** Participant characteristics that affect suitability/safety. */
export type Trait = 'elderly' | 'children'

export type Tone = 'celebratory' | 'somber' | 'professional' | 'relaxed' | 'neutral'

export interface IntentionSignals {
  /** Normalized source text used for detection and traceability. */
  source: string
  qualities: Quality[]
  elements: Element[]
  traits: Trait[]
  tone: Tone
  recurring: boolean
  /** For each detected signal, the exact phrase that matched — used for traceability. */
  matched: Record<string, string>
}

// ── Fixed keyword tables (order is part of the deterministic contract) ────────────────
const QUALITY_PHRASES: ReadonlyArray<readonly [Quality, readonly string[]]> = [
  ['somber', ['funeral', 'memorial', 'remembrance', 'mourning', 'grief', 'passing away', 'condolence', 'wake', 'celebration of life', 'in memory']],
  ['relaxing', ['relax', 'calm', 'quiet', 'peaceful', 'unwind', 'serene', 'restful', 'leisurely', 'gentle']],
  ['scenic', ['beautiful view', 'beautiful', 'views', 'scenery', 'scenic', 'sunset', 'ocean', 'beach', 'waterfront', 'vista']],
  ['wellness', ['yoga', 'fitness', 'wellness', 'meditation', 'mindful', 'workout', 'pilates']],
  ['professional', ['conference', 'startup', 'networking', 'business', 'professional', 'summit', 'seminar', 'keynote', 'panel', 'speakers']],
  ['formal', ['formal', 'elegant', 'black tie', 'black-tie', 'gala', 'wedding']],
  ['celebratory', ['celebrate', 'celebration', 'party', 'birthday', 'wedding', 'anniversary', 'festive', 'graduation']],
  ['intimate', ['intimate', 'private', 'just us', 'close family', 'small gathering']],
  ['energetic', ['energetic', 'lively', 'dance', 'active']],
]

const ELEMENT_PHRASES: ReadonlyArray<readonly [Element, readonly string[]]> = [
  ['transport', ['limousine', 'limo', 'ride home', 'chauffeur', 'car service', 'shuttle', 'drive home']],
  ['dining', ['dinner', 'lunch', 'meal', 'dining', 'restaurant', 'brunch', 'banquet']],
  ['ceremony', ['ceremony', 'vows', 'service', 'wedding']],
  ['sessions', ['conference', 'talks', 'sessions', 'presentations', 'keynote', 'panel', 'speakers', 'workshop']],
  ['networking', ['networking', 'mixer', 'meet other']],
  ['class', ['yoga', 'class', 'lesson', 'instructor', 'workshop']],
  ['reception', ['reception', 'party', 'gathering']],
  ['activities', ['games', 'activities', 'entertainment', 'crafts']],
  ['sightseeing', ['views', 'sightsee', 'scenic', 'sunset', 'beach', 'tour']],
  ['music', ['music', 'live band', 'dj']],
]

const TRAIT_PHRASES: ReadonlyArray<readonly [Trait, readonly string[]]> = [
  ['elderly', ['elderly', 'senior', 'grandmother', 'grandfather', 'grandparent', 'my parents', '70 year', '70-year', 'about 70', 'age 70', '75 year', '80 year']],
  ['children', ['kids', 'kid', 'children', 'child', 'toddler', 'little ones']],
]

const RECURRENCE_PHRASES: readonly string[] = ['every sunday', 'every monday', 'every week', 'each week', 'weekly', 'every morning', 'recurring', 'every saturday']

function firstMatch(text: string, phrases: readonly string[]): string | null {
  for (const p of phrases) if (text.includes(p)) return p
  return null
}

/**
 * Extract deterministic planning signals from the approved Future Event Description. Reasons over
 * `clientRequest` + `description` (the intention) and `details.recurrence` (a confirmed fact).
 */
export function extractSignals(fed: FutureEventDescription): IntentionSignals {
  const source = `${fed.clientRequest ?? ''} ${fed.description ?? ''}`.toLowerCase()
  const matched: Record<string, string> = {}

  const qualities: Quality[] = []
  for (const [q, phrases] of QUALITY_PHRASES) {
    const m = firstMatch(source, phrases)
    if (m) { qualities.push(q); matched[`quality:${q}`] = m }
  }
  // A somber occasion is never also celebratory/energetic, regardless of incidental words.
  const somber = qualities.includes('somber')
  const filteredQualities = somber ? qualities.filter((q) => q !== 'celebratory' && q !== 'energetic') : qualities

  const elements: Element[] = []
  for (const [el, phrases] of ELEMENT_PHRASES) {
    const m = firstMatch(source, phrases)
    if (m) { elements.push(el); matched[`element:${el}`] = m }
  }

  const traits: Trait[] = []
  for (const [t, phrases] of TRAIT_PHRASES) {
    const m = firstMatch(source, phrases)
    if (m) { traits.push(t); matched[`trait:${t}`] = m }
  }

  const recurrenceMatch = firstMatch(source, RECURRENCE_PHRASES)
  const recurring = fed.details?.recurrence != null || recurrenceMatch != null
  if (recurrenceMatch) matched['recurring'] = recurrenceMatch

  const tone: Tone =
    somber ? 'somber'
    : filteredQualities.includes('professional') ? 'professional'
    : filteredQualities.includes('celebratory') ? 'celebratory'
    : filteredQualities.includes('relaxing') ? 'relaxed'
    : 'neutral'

  return { source, qualities: filteredQualities, elements, traits, tone, recurring, matched }
}

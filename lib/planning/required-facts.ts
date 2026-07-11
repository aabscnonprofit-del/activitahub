// Required operational facts — the information the CURRENT architecture still needs before it can
// plan, established by the accepted Details-step architecture verification:
//
//   * guestCount — always (Planning Engine V2 reasoning + the Organizer Capacity Gate read it).
//   * instructor — for class-type activities only (Planning Engine V2 adds the Instructor staffing role).
//
// These are captured CONVERSATIONALLY through the existing Discovery pipeline — a natural follow-up
// asked ONLY when a fact is still unknown — never through the removed structured Details form. The
// readers below are pure + deterministic (no AI, no I/O) so capture is reliable and testable; they
// parse whatever the visitor stated in their idea or their discovery answers. When a fact is genuinely
// unstated they return null, which is what keeps the Discovery conversation going until it is supplied.

import type { PlannerCategory } from '@/lib/ope/types'

/** Activities whose plan reasoning consumes `instructor` (Planning Engine V2, lib/planning/reasoning.ts). */
export const CLASS_CATEGORIES: ReadonlySet<PlannerCategory> = new Set<PlannerCategory>([
  'fitness_class', 'art_class', 'language_class', 'workshop',
])

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, dozen: 12, couple: 2, pair: 2,
}

const TENS = 'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety'
const ONES = 'one|two|three|four|five|six|seven|eight|nine'

/** Map an English number-word (incl. simple compounds like "twenty five") to an integer, or null. */
function wordToNumber(text: string): number | null {
  const t = (text || '').toLowerCase()
  const compound = t.match(new RegExp(`\\b(${TENS})[\\s-](${ONES})\\b`))
  if (compound) return NUMBER_WORDS[compound[1]] + NUMBER_WORDS[compound[2]]
  for (const [w, n] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) return n
  }
  return null
}

const HEADCOUNT_NOUNS =
  'people|guests?|participants?|attendees?|persons?|pax|players?|members?|employees?|students?|professionals?|kids?|children|adults?|folks?|of us|of them'

/**
 * Read a headcount stated anywhere in `text`: noun-anchored digits ("20 guests"), a lead-in
 * ("for 20", "around 20", "about 20"), or number-words ("twenty guests", "a dozen kids"). Returns
 * null when no headcount is stated.
 */
export function readHeadcount(text: string): number | null {
  const t = (text || '').toLowerCase()
  const intOf = (m: RegExpMatchArray | null): number | null => {
    if (!m) return null
    const n = parseInt((m[1] ?? '').replace(/[,\s]/g, ''), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const digit =
    intOf(t.match(new RegExp(`(\\d+)\\s*(?:${HEADCOUNT_NOUNS})`))) ??
    intOf(t.match(/\b(?:for|about|around|roughly|approximately|~)\s*(\d+)\b/))
  if (digit != null) return digit
  const worded = t.match(
    new RegExp(`\\b(?:for|about|around|roughly|approximately)?\\s*([a-z]+(?:[\\s-][a-z]+)?)\\s*(?:${HEADCOUNT_NOUNS})\\b`),
  )
  if (worded) {
    const n = wordToNumber(worded[1])
    if (n != null) return n
  }
  return null
}

/**
 * Read a headcount from a SHORT direct answer to "how many?" — a bare number or number-word,
 * optionally with a lead-in ("about 20", "~15", "just 8", "twenty", "a dozen"). Because it is scoped
 * to a single answer, reading a bare integer as the count is safe. Returns null when the answer holds
 * no count.
 */
export function readBareCount(answer: string): number | null {
  const t = (answer || '').toLowerCase().trim()
  if (!t) return null
  const m = t.match(/\b(\d{1,6})\b/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n > 0) return n
  }
  return wordToNumber(t)
}

const INSTRUCTOR_NOUN = 'instructor|teacher|coach|trainer|facilitator|guide|tutor|leader'
const SELF_LED =
  /\b(?:i'?ll teach|i will teach|teach it myself|lead it myself|run it myself|bring(?:ing)? my own|my own (?:instructor|teacher|coach)|already have (?:an? )?(?:instructor|teacher|coach|trainer)|we(?:'| a)?ve? got (?:an? )?(?:instructor|teacher|coach)|we have (?:an? )?(?:instructor|teacher|coach|someone)|have (?:my|our) own)\b/

/**
 * Read whether the visitor will HAVE their own instructor or NEED one, from anywhere in `text`.
 * Checks the "need" phrasing (incl. negations like "don't have an instructor") first. Returns null
 * when nothing about an instructor is stated.
 */
export function readInstructor(text: string): 'have' | 'need' | null {
  const t = (text || '').toLowerCase()
  const needNearNoun = new RegExp(
    `\\b(?:need|want|require|looking for|hire|find|provide|include|bring in|don'?t have|do not have|without|no)\\b[^.?!]*\\b(?:${INSTRUCTOR_NOUN})\\b`,
  )
  const nounNeedsAfter = new RegExp(`\\b(?:${INSTRUCTOR_NOUN})\\b[^.?!]*\\b(?:needed|required|to hire|to find)\\b`)
  if (needNearNoun.test(t) || nounNeedsAfter.test(t)) return 'need'
  if (SELF_LED.test(t)) return 'have'
  return null
}

/**
 * Read the instructor answer from a SHORT reply to "have your own, or include one?": yes/no and
 * bare have/need phrasing that need not repeat the instructor noun. Negation/"need" is checked first.
 * Returns null when the answer is not about the instructor.
 */
export function readInstructorAnswer(answer: string): 'have' | 'need' | null {
  const t = (answer || '').toLowerCase().trim()
  if (!t) return null
  if (/\b(?:need|want|require|hire|find|looking|provide|include|don'?t have|do not have|without|none|no|nope|nah)\b/.test(t)) return 'need'
  if (/\b(?:have|has|got|own|myself|ourselves|teach|lead|run|yes|yeah|yep|already|we do|i do|sorted|covered)\b/.test(t)) return 'have'
  return null
}

/**
 * The first required operational fact still missing before planning may proceed, or null when all
 * required facts are known. Order: guestCount (always), then instructor (class-type activities only).
 * Asking one at a time keeps Discovery a natural conversation.
 */
export function missingRequiredFact(
  category: PlannerCategory | null,
  guestCount: number | null,
  instructor: 'have' | 'need' | null,
): 'guests' | 'instructor' | null {
  if (guestCount == null) return 'guests'
  if (category != null && CLASS_CATEGORIES.has(category) && instructor == null) return 'instructor'
  return null
}

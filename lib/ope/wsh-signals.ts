// P-B — "What should happen" (WSH) → typed planning signals (deterministic, no LLM).
//
// G2 found WSH was only a gate/approval artifact: the plan derived entirely from the
// structured PlannerInput and changing WSH alone never changed the plan. This layer
// closes that gap WITHOUT redesigning the engine and WITHOUT making WSH the primary
// input. It reads an approved WSH narrative, extracts a small set of TYPED planning
// signals, and ENRICHES the PlannerInput before generatePlan:
//
//   WSH → extractPlanningSignals() → typed fields → enrichInputWithWsh() → generatePlan()
//
// Rules (enforced here):
//   1. Structured organizer-entered fields ALWAYS win.
//   2. WSH may FILL a missing field (venueType / budget / guestCount).
//   3. WSH may ADD typed planning signals (specialRequirements — additive).
//   4. WSH NEVER overwrites an explicit organizer choice.
//   5. No AI dependency — pure regex/keyword detection.
//   6. Deterministic: same WSH → same signals (fixed order).
//
// Requirement phrases are chosen to line up with the engine's existing feature
// keywords (lib/ope/features.ts), so a WSH that calls for photography / a bar /
// transport / an entertainer / inflatables lights up the matching feature module
// (task + priced cost line + risk). Signals with no feature module (lodging, dining,
// indoor, child-friendly) still surface as typed special requirements in the plan.

export interface PlanningSignals {
  /** Filled only if the WSH clearly implies an outdoor (park/beach) or at-home venue. */
  venueType: 'backyard_home' | 'public_park' | null
  /** A budget figure stated in the WSH, or null. */
  budget: number | null
  /** A headcount stated in the WSH, or null. */
  guestCount: number | null
  /** Canonical, deduped requirement phrases the WSH introduces (additive). */
  requirements: string[]
}

/** One detectable signal: a matcher, optional suppressor, and the phrase it contributes. */
interface SignalDef {
  id: string
  match: RegExp
  /** If present, the signal is suppressed (e.g. an explicit "no alcohol"). */
  suppress?: RegExp
  /** The canonical requirement phrase added when matched (kept short, ≤120 chars). */
  requirement: string
}

// Order is fixed → deterministic output. Phrases embed the feature keywords from
// features.ts where a feature module exists, so the engine prices/risks them.
const SIGNALS: SignalDef[] = [
  { id: 'photography', match: /\bphoto\b|photos|photographer|photography|photo ?booth|videograph/i, requirement: 'Photography coverage' },
  { id: 'entertainment', match: /\bdj\b|entertainer|entertainment|live music|\bband\b|performer|magician|\bclown|face ?paint|karaoke/i, requirement: 'Entertainment (DJ / performer)' },
  { id: 'transportation', match: /transport|transportation|shuttle|\bbus\b|\blimo\b|limousine|chauffeur|party bus|valet/i, requirement: 'Transportation' },
  { id: 'inflatable', match: /\bfoam\b|foam party|bounce house|inflatable|moon bounce|water slide/i, requirement: 'Inflatable / foam setup' },
  // Alcohol: affirmative bar service, UNLESS the WSH states a restriction. A "dry / no
  // alcohol" WSH yields a phrase that both surfaces the restriction AND (via the feature
  // negation list) keeps the alcohol module suppressed.
  { id: 'alcohol', match: /open bar|\bbar service\b|cocktails?|champagne|\bwine\b|\bbeer\b|spirits|liquor|bartender/i, suppress: /no alcohol|without alcohol|alcohol-?free|non-?alcoholic|\bdry event\b|sober|no bar/i, requirement: 'Bar service (cocktails)' },
  { id: 'no_alcohol', match: /no alcohol|without alcohol|alcohol-?free|non-?alcoholic|\bdry event\b|sober\b|no bar/i, requirement: 'No alcohol (dry event)' },
  { id: 'lodging', match: /overnight|lodging|\bhotel\b|accommodation|cabins?|stay the night|multi-?day|weekend getaway|sleepover/i, requirement: 'Overnight lodging / accommodation' },
  { id: 'dining', match: /restaurant|fine dining|dinner reservation|catered dinner|private chef|multi-?course|sit-?down dinner/i, requirement: 'Dining / restaurant booking' },
  { id: 'child_friendly', match: /child-?friendly|kid-?friendly|kids? activities|family-?friendly|for the (?:kids|children)|children will/i, requirement: 'Child-friendly activities' },
  { id: 'indoor', match: /\bindoors?\b|ballroom|banquet hall|function hall|conference room|reception hall/i, requirement: 'Indoor venue' },
]

const intFrom = (m: RegExpMatchArray | null): number | null => {
  if (!m) return null
  const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/[,\s]/g, '')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Extract typed planning signals from a WSH narrative. Deterministic, no AI. Returns
 * empty/null fields when the WSH says nothing about them (never invents values).
 */
export function extractPlanningSignals(wsh: string): PlanningSignals {
  const t = (wsh || '').toLowerCase()
  if (!t.trim()) return { venueType: null, budget: null, guestCount: null, requirements: [] }

  // Venue: outdoor/water/park → public_park; at-home/backyard → backyard_home.
  const venueType: PlanningSignals['venueType'] =
    /\bbeach|ocean|seaside|shore\b|\bpark\b|public park|\boutdoors?\b|outdoor|botanical|trail|campground|campsite/.test(t) ? 'public_park'
      : /backyard|back yard|\bgarden\b|at home|my house|our house|at our place|living room/.test(t) ? 'backyard_home'
        : null

  const budget = intFrom(t.match(/\$\s*([\d,]+)|budget(?:\s+of)?\s*\$?\s*([\d,]+)|([\d,]+)\s*(?:dollars|usd|bucks)/))

  const guestCount =
    intFrom(t.match(/(\d+)\s*(?:people|guests?|participants?|attendees?|persons?|pax|players?|members?|employees?|students?|professionals?)/)) ??
    intFrom(t.match(/\bfor\s+(\d+)\b/))

  const requirements: string[] = []
  for (const s of SIGNALS) {
    if (!s.match.test(t)) continue
    if (s.suppress && s.suppress.test(t)) continue
    requirements.push(s.requirement)
  }

  return { venueType, budget, guestCount: guestCount ?? null, requirements }
}

/** Case-insensitive dedupe that preserves first-seen casing/order. */
function dedupe(parts: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const v = (p ?? '').trim()
    if (!v) continue
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v.slice(0, 120))
  }
  return out
}

/**
 * Enrich a PlannerInput with the typed signals from an approved WSH, honoring the rules:
 * organizer-entered fields win; WSH only fills MISSING venue/budget/guestCount and only
 * ADDS requirements (organizer requirements are kept and placed first). Pure — returns a
 * new object; never mutates the input. A blank/absent WSH returns the input unchanged.
 */
export function enrichInputWithWsh<T extends {
  guestCount: number
  venueType?: 'backyard_home' | 'public_park' | null
  budget?: number | null
  specialRequirements?: string[]
}>(input: T, wsh: string | null | undefined): T {
  if (!wsh || !wsh.trim()) return input
  const s = extractPlanningSignals(wsh)

  const next: T = { ...input }
  // Fill ONLY when the organizer left the field empty (rules 1, 2, 4).
  if ((next.venueType ?? null) == null && s.venueType) next.venueType = s.venueType
  if ((next.budget ?? null) == null && s.budget != null) next.budget = s.budget
  if (!(typeof next.guestCount === 'number' && next.guestCount > 0) && s.guestCount && s.guestCount > 0) {
    next.guestCount = s.guestCount
  }
  // Additive (rule 3): organizer requirements first, then WSH signals; deduped, capped at 20.
  next.specialRequirements = dedupe([...(input.specialRequirements ?? []), ...s.requirements]).slice(0, 20)
  return next
}

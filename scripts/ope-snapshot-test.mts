// OPE output-compatibility + coverage-gate snapshot test.
//
// 1. Regenerates a fixed set of cases and compares them byte-for-byte against the
//    committed fixture scripts/__fixtures__/ope-golden.json (regression).
// 2. Asserts coverage invariants:
//      - 'supported' cases  -> status 'plan_ready'  AND a non-null plan.
//      - 'refusal'  cases   -> status != 'plan_ready' AND plan === null
//                              (NO silent category fallback).
//
//   Run:    npx tsx scripts/ope-snapshot-test.mts        (or: npm run test:ope)
//   Update: npx tsx scripts/ope-snapshot-test.mts --update   (only when an output
//           change is intended AND explained — see ADR_001 / ADR_002).
//
// Exit 0 = matches snapshot and all invariants hold. Exit 1 = drift or invariant fail.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { generatePlan } from '../lib/ope/index'
import { applyRecurring } from '../lib/ope/modifiers'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

type Expect = 'supported' | 'refusal' | 'clarify'
const CASES: { name: string; expect: Expect; input: PlannerInput }[] = [
  // ── Supported (must still produce a plan) ───────────────────────────────────
  {
    name: 'birthday/honolulu/kids (priced-local)', expect: 'supported',
    input: {
      category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
      specialRequirements: ['superhero theme', 'nut allergy'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: '96815' },
    },
  },
  {
    name: 'birthday/berlin/kids (fallback-seed)', expect: 'supported',
    input: {
      category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
      specialRequirements: ['superhero theme', 'nut allergy'],
      location: { city: 'Berlin', state: null, country: 'Germany', postalCode: null },
    },
  },
  {
    name: 'birthday/honolulu/no-kids (no subtype)', expect: 'supported',
    input: {
      category: 'birthday', guestCount: 15, adults: 15, kids: 0, venueType: 'backyard_home', budget: 500,
      specialRequirements: [],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'bbq/honolulu (priced-local)', expect: 'supported',
    input: {
      category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
      specialRequirements: ['vegetarian options'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'adult_birthday/honolulu (Celebration neighbour, priced)', expect: 'supported',
    input: {
      category: 'adult_birthday', guestCount: 30, adults: 30, kids: 0, venueType: 'backyard_home', budget: 800,
      specialRequirements: ['cocktails'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'family_reunion/honolulu (Celebration neighbour, bbq pricing)', expect: 'supported',
    input: {
      category: 'family_reunion', guestCount: 40, adults: 30, kids: 10, venueType: 'public_park', budget: 1200,
      specialRequirements: ['multi-generational'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'networking/lisbon (fixed budget, unpriced plan)', expect: 'supported',
    input: {
      category: 'networking', guestCount: 40, adults: 40, kids: 0, venueType: null, budget: 300,
      specialRequirements: ['accessibility', 'multiple languages'],
      location: { city: 'Lisbon', state: null, country: 'Portugal', postalCode: null },
    },
  },

  // ── Clarification (supported pattern, missing high-value info → ASK, no plan) ─
  {
    name: 'networking/no-budget (clarify: ask budget)', expect: 'clarify',
    input: {
      category: 'networking', guestCount: 40, adults: 40, kids: 0, venueType: null, budget: null,
      specialRequirements: ['name tags', 'AV'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'adult_birthday/no-venue (clarify: ask venue)', expect: 'clarify',
    input: {
      category: 'adult_birthday', guestCount: 25, adults: 25, kids: 0, venueType: null, budget: 700,
      specialRequirements: [],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },

  // ── M2: Recurring modifier (Meetup only) ────────────────────────────────────
  {
    name: 'networking/weekly recurring (ongoing)', expect: 'supported',
    input: {
      category: 'networking', guestCount: 40, adults: 40, kids: 0, venueType: null, budget: 600,
      specialRequirements: ['name tags', 'AV'], recurrence: { frequency: 'weekly', sessions: null },
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'networking/monthly recurring (12 sessions)', expect: 'supported',
    input: {
      category: 'networking', guestCount: 30, adults: 30, kids: 0, venueType: null, budget: 400,
      specialRequirements: ['name tags'], recurrence: { frequency: 'monthly', sessions: 12 },
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'networking/weekly recurring + no budget (clarify)', expect: 'clarify',
    input: {
      category: 'networking', guestCount: 40, adults: 40, kids: 0, venueType: null, budget: null,
      specialRequirements: ['name tags'], recurrence: { frequency: 'weekly', sessions: null },
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },

  // ── M3: Class pattern (explicit Class categories only) ──────────────────────
  {
    name: 'fitness_class/one-time (priced)', expect: 'supported',
    input: {
      category: 'fitness_class', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: null,
      specialRequirements: ['yoga'], instructor: 'need', materials: 'provided',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'fitness_class/weekly recurring (priced series)', expect: 'supported',
    input: {
      category: 'fitness_class', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: null,
      specialRequirements: ['yoga'], instructor: 'have', materials: 'provided',
      recurrence: { frequency: 'weekly', sessions: 8 },
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'art_class/workshop (priced, materials subtype)', expect: 'supported',
    input: {
      category: 'art_class', guestCount: 15, adults: 15, kids: 0, venueType: null, budget: null,
      specialRequirements: ['workshop', 'painting'], instructor: 'have', materials: 'provided',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'language_class (priced, byo materials)', expect: 'supported',
    input: {
      category: 'language_class', guestCount: 10, adults: 10, kids: 0, venueType: null, budget: null,
      specialRequirements: ['spanish'], instructor: 'need', materials: 'byo',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'fitness_class/missing-instructor (clarify)', expect: 'clarify',
    input: {
      category: 'fitness_class', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: null,
      specialRequirements: ['yoga'], instructor: null, materials: 'provided',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'fitness_class/missing-materials (clarify)', expect: 'clarify',
    input: {
      category: 'art_class', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: null,
      specialRequirements: ['painting'], instructor: 'have', materials: null,
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },

  // ── Refusal / handoff (must NOT produce a plan, no force-mapping) ───────────
  {
    name: 'wedding (needs_certified_organizer)', expect: 'refusal',
    input: {
      category: 'birthday', guestCount: 120, adults: 120, kids: 0, venueType: null, budget: 25000,
      specialRequirements: ['wedding ceremony', 'catering', 'live band'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'soccer tournament (unsupported)', expect: 'refusal',
    input: {
      category: 'bbq', guestCount: 80, adults: 60, kids: 20, venueType: 'public_park', budget: 2000,
      specialRequirements: ['soccer tournament', 'brackets', 'referees', 'first aid'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'charity fundraiser (needs_human_review)', expect: 'refusal',
    input: {
      category: 'networking', guestCount: 100, adults: 100, kids: 0, venueType: null, budget: 5000,
      specialRequirements: ['charity fundraiser', 'donations', 'auction', 'sponsors'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'beach cleanup (unsupported)', expect: 'refusal',
    input: {
      category: 'bbq', guestCount: 35, adults: 25, kids: 10, venueType: 'public_park', budget: 200,
      specialRequirements: ['beach cleanup', 'gloves', 'bags', 'waivers'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'hiking club (unsupported)', expect: 'refusal',
    input: {
      category: 'networking', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: 50,
      specialRequirements: ['hiking club', 'trail safety', 'recurring'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'yoga class (unsupported)', expect: 'refusal',
    input: {
      category: 'networking', guestCount: 15, adults: 15, kids: 0, venueType: 'public_park', budget: 80,
      specialRequirements: ['weekly yoga class', 'bring mat', 'recurring'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'book club (unsupported)', expect: 'refusal',
    input: {
      category: 'networking', guestCount: 10, adults: 10, kids: 0, venueType: null, budget: 50,
      specialRequirements: ['monthly book club', 'recurring'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'workshop (unsupported)', expect: 'refusal',
    input: {
      category: 'networking', guestCount: 20, adults: 20, kids: 0, venueType: null, budget: 400,
      specialRequirements: ['workshop', 'materials', 'handouts'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'art class (unsupported)', expect: 'refusal',
    input: {
      category: 'networking', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: 250,
      specialRequirements: ['art class', 'easels', 'paint supplies'],
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'birthday + recurrence (unsupported_modifier, not silently ignored)', expect: 'refusal',
    input: {
      category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
      specialRequirements: ['superhero theme'], recurrence: { frequency: 'weekly', sessions: null },
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  // M3 Class gating
  {
    name: 'class/kids-heavy (needs_human_review)', expect: 'refusal',
    input: {
      category: 'fitness_class', guestCount: 14, adults: 4, kids: 10, venueType: null, budget: null,
      specialRequirements: ['kids yoga'], instructor: 'have', materials: 'provided',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'class/high-risk (needs_certified_organizer)', expect: 'refusal',
    input: {
      category: 'fitness_class', guestCount: 10, adults: 10, kids: 0, venueType: null, budget: null,
      specialRequirements: ['aerial silks'], instructor: 'have', materials: 'provided',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
  {
    name: 'class/regulated (unsupported)', expect: 'refusal',
    input: {
      category: 'fitness_class', guestCount: 8, adults: 8, kids: 0, venueType: null, budget: null,
      specialRequirements: ['scuba diving'], instructor: 'need', materials: 'provided',
      location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
    },
  },
]

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'ope-golden.json')
const REFUSAL = new Set(['unsupported', 'needs_human_review', 'needs_certified_organizer', 'unsupported_modifier'])

const results = CASES.map((c) => ({ name: c.name, expect: c.expect, result: generatePlan(c.input) }))
const current = JSON.stringify(results, null, 2) + '\n'

if (process.argv.includes('--update')) {
  writeFileSync(FIXTURE, current)
  console.log('OPE snapshot UPDATED:', FIXTURE)
  process.exit(0)
}

// ── Invariant checks (semantics, independent of the byte snapshot) ────────────
const failures: string[] = []
for (const { name, expect, result } of results) {
  if (expect === 'supported') {
    if (result.status !== 'plan_ready') failures.push(`${name}: expected plan_ready, got ${result.status}`)
    if (result.plan == null) failures.push(`${name}: expected a plan, got null`)
  } else if (expect === 'clarify') {
    if (result.status !== 'needs_clarification') failures.push(`${name}: expected needs_clarification, got ${result.status}`)
    if (result.plan !== null) failures.push(`${name}: clarification must NOT carry a plan`)
    if (!result.questions || result.questions.length === 0) failures.push(`${name}: clarification must carry at least one question`)
  } else {
    if (result.status === 'plan_ready') failures.push(`${name}: expected refusal, got plan_ready`)
    if (!REFUSAL.has(result.status)) failures.push(`${name}: unexpected status ${result.status}`)
    if (result.plan !== null) failures.push(`${name}: refusal must NOT carry a plan (no silent fallback)`)
  }
}

// ── Unit check: Recurring modifier per-session/series math (no priced recurring
//    activity exists in M2 content, so exercise the transform directly) ─────────
{
  const fake = {
    section_b_your_plan: { recurrence: undefined },
    section_c_budget: { is_priced: true, estimate: { low: 100, likely: 200, high: 300 } },
  } as unknown as PlannerOutput
  applyRecurring(fake, { frequency: 'weekly', sessions: 10 })
  const r = fake.section_b_your_plan.recurrence
  const c = fake.section_c_budget
  if (r?.cadence_label !== 'Repeats weekly') failures.push(`applyRecurring: cadence_label wrong (${r?.cadence_label})`)
  if (c.per_session !== true) failures.push('applyRecurring: per_session not set')
  if (c.series_total?.likely !== 2000) failures.push(`applyRecurring: series_total.likely wrong (${c.series_total?.likely})`)

  const fake2 = {
    section_b_your_plan: { recurrence: undefined },
    section_c_budget: { is_priced: true, estimate: { low: 100, likely: 200, high: 300 } },
  } as unknown as PlannerOutput
  applyRecurring(fake2, { frequency: 'monthly', sessions: null })
  if (fake2.section_c_budget.series_total !== null) failures.push('applyRecurring: ongoing series_total should be null')
}

// ── Byte regression against the committed fixture ─────────────────────────────
const expected = readFileSync(FIXTURE, 'utf8')
const byteOk = current === expected
if (!byteOk) {
  const a = expected.split('\n'), b = current.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      failures.push(`snapshot drift at line ${i + 1}: expected "${a[i] ?? '<eof>'}" / actual "${b[i] ?? '<eof>'}"`)
      break
    }
  }
}

if (failures.length) {
  console.error('OPE snapshot/coverage FAILED:')
  for (const f of failures) console.error('  - ' + f)
  console.error('If an output change is intended, explain it and re-run with --update (see ADR_002).')
  process.exit(1)
}

const supported = results.filter((r) => r.expect === 'supported').length
const clarify = results.filter((r) => r.expect === 'clarify').length
const refusals = results.filter((r) => r.expect === 'refusal').length
console.log(
  `OPE snapshot OK — ${results.length} cases match byte-for-byte; ` +
    `${supported} supported -> plan_ready, ${clarify} -> needs_clarification, ${refusals} unsupported -> safe handoff (no fallback).`,
)
process.exit(0)

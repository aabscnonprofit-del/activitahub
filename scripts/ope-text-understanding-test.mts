// OPE AI Understanding V1 — deterministic free-text → PlannerInput test.
//
// AI is OFF in tests (no key), so this exercises the MANDATORY deterministic parser
// (parseEventText) which is also the AI fallback. It proves: extraction succeeds,
// fallback succeeds, and the UNCHANGED engine accepts every built PlannerInput.
//
//   Run:  npx tsx scripts/ope-text-understanding-test.mts   (or: npm run test:ope-text)

import { parseEventText, extractFromText, mergeTextExtraction, buildPlannerInput, type TextExtraction } from '../lib/ope/request-text'
import { understandEventText } from '../lib/ai/request-understanding'
import { generatePlan } from '../lib/ope/index'
import type { PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

type Expect = {
  category: string | null
  guestCount?: number | null
  venueType?: 'backyard_home' | 'public_park' | null
  budget?: number | null
  recurrence?: 'weekly' | 'biweekly' | 'monthly' | null
  buildable: boolean // whether a PlannerInput can be assembled (no invented values)
}

const CASES: { text: string; expect: Expect }[] = [
  { text: 'BBQ for 40 people in a park next month.', expect: { category: 'bbq', guestCount: 40, venueType: 'public_park', buildable: true } },
  { text: 'Yoga class every Sunday for 15 participants.', expect: { category: 'fitness_class', guestCount: 15, recurrence: 'weekly', buildable: true } },
  { text: "Children's birthday for 12 kids.", expect: { category: 'birthday', guestCount: 12, buildable: true } },
  { text: 'Networking event for local entrepreneurs.', expect: { category: 'networking', guestCount: null, buildable: false } },
  { text: 'Art workshop for 10 adults.', expect: { category: 'art_class', guestCount: 10, buildable: true } },
  { text: 'Backyard barbecue for 25 guests with a $500 budget.', expect: { category: 'bbq', guestCount: 25, venueType: 'backyard_home', budget: 500, buildable: true } },
  { text: 'Adult birthday party for 30 people at home.', expect: { category: 'adult_birthday', guestCount: 30, venueType: 'backyard_home', buildable: true } },
  { text: 'Spanish class for 8 students, weekly.', expect: { category: 'language_class', guestCount: 8, recurrence: 'weekly', buildable: true } },
  { text: 'Graduation party for 50 guests.', expect: { category: 'graduation', guestCount: 50, buildable: true } },
  { text: 'Family reunion picnic for 60 people in the park.', expect: { category: 'family_reunion', guestCount: 60, venueType: 'public_park', buildable: true } },
  { text: 'Monthly meetup for 20 tech professionals.', expect: { category: 'networking', guestCount: 20, recurrence: 'monthly', buildable: true } },
  { text: 'Pottery workshop for 12 people.', expect: { category: 'art_class', guestCount: 12, buildable: true } },
  { text: '25th anniversary celebration for 40 guests.', expect: { category: 'anniversary', guestCount: 40, buildable: true } },
  { text: 'Corporate networking mixer for 80 attendees with AV setup.', expect: { category: 'networking', guestCount: 80, buildable: true } },
  { text: 'Kids birthday party for 15 children in our backyard, superhero theme.', expect: { category: 'birthday', guestCount: 15, venueType: 'backyard_home', buildable: true } },
  { text: 'Painting class for 10 adults every other week.', expect: { category: 'art_class', guestCount: 10, recurrence: 'biweekly', buildable: true } },
  { text: 'Cookout for 35 people, vegetarian options needed.', expect: { category: 'bbq', guestCount: 35, buildable: true } },
  { text: 'Fitness bootcamp for 20 participants in the park weekly.', expect: { category: 'fitness_class', guestCount: 20, venueType: 'public_park', recurrence: 'weekly', buildable: true } },
  { text: 'Birthday celebration for 18 adults at a restaurant.', expect: { category: 'adult_birthday', guestCount: 18, venueType: null, buildable: true } },
  { text: 'Language exchange meetup for 12 people monthly.', expect: { category: 'networking', guestCount: 12, recurrence: 'monthly', buildable: true } },
  { text: 'Graduation BBQ for 45 guests in the park.', expect: { category: 'graduation', guestCount: 45, venueType: 'public_park', buildable: true } },
  { text: 'A party.', expect: { category: null, guestCount: null, buildable: false } }, // ambiguous → category not invented
]

// Every status generatePlan can legitimately return (engine accepts the input).
const VALID_STATUS = new Set([
  'plan_ready', 'needs_clarification', 'unsupported',
  'needs_human_review', 'needs_certified_organizer', 'unsupported_modifier',
])

console.log(`AI Understanding — ${CASES.length} natural-language requests (AI OFF → deterministic fallback):\n`)
for (const { text, expect } of CASES) {
  const { extraction, input } = parseEventText(text, LOC)
  const tag = text.length > 48 ? text.slice(0, 45) + '…' : text
  console.log(`• ${tag}`)
  console.log(`    extraction: category=${extraction.category} guests=${extraction.guestCount} adults=${extraction.adults} kids=${extraction.kids} venue=${extraction.venueType} budget=${extraction.budget} recur=${extraction.recurrenceFrequency}`)
  console.log(`    PlannerInput: ${input ? `category=${input.category} guestCount=${input.guestCount}${input.recurrence ? ` recurrence=${input.recurrence.frequency}` : ''}` : 'null (insufficient — not invented)'}`)

  check(`  [${tag}] category`, extraction.category === expect.category, `got ${extraction.category}`)
  if (expect.guestCount !== undefined) check(`  [${tag}] guestCount`, extraction.guestCount === expect.guestCount, `got ${extraction.guestCount}`)
  if (expect.venueType !== undefined) check(`  [${tag}] venueType`, extraction.venueType === expect.venueType, `got ${extraction.venueType}`)
  if (expect.budget !== undefined) check(`  [${tag}] budget`, extraction.budget === expect.budget, `got ${extraction.budget}`)
  if (expect.recurrence !== undefined) check(`  [${tag}] recurrence`, extraction.recurrenceFrequency === expect.recurrence, `got ${extraction.recurrenceFrequency}`)
  check(`  [${tag}] buildable=${expect.buildable}`, (input !== null) === expect.buildable)

  if (input) {
    const res = generatePlan(input)
    check(`  [${tag}] engine accepts input → ${res.status}`, VALID_STATUS.has(res.status), `status ${res.status}`)
  }
}

// Precedence: deterministic (explicitly-stated) values win; AI may only fill gaps.
console.log('\nMerge precedence — deterministic wins, AI fills only missing fields:')
{
  // Deterministic found everything; a "hallucinating" AI tries to override each field.
  const det = extractFromText('BBQ for 40 guests in the park with a $500 budget')
  const aiOverride: TextExtraction = {
    category: 'networking', guestCount: 999, adults: 5, kids: 5, venueType: 'backyard_home',
    budget: 99, timeframe: 'monthly', recurrenceFrequency: 'monthly',
    specialRequirements: ['ignored'], desiredOutcome: 'ignored',
  }
  const m = mergeTextExtraction(det, aiOverride)
  check('precedence: det category wins (bbq)', m.category === 'bbq')
  check('precedence: det guestCount wins (40)', m.guestCount === 40)
  check('precedence: det venueType wins (public_park)', m.venueType === 'public_park')
  check('precedence: det budget wins (500)', m.budget === 500)
  check('precedence: AI cannot override stated values', !(m.category === 'networking' || m.guestCount === 999 || m.budget === 99))

  // Deterministic missing → AI fills the gaps (and only the gaps).
  const det2 = extractFromText('Networking event') // category networking; guestCount null; rest null
  const aiFill: TextExtraction = {
    category: 'birthday', guestCount: 30, adults: null, kids: null, venueType: 'public_park',
    budget: 800, timeframe: null, recurrenceFrequency: null,
    specialRequirements: ['name tags'], desiredOutcome: 'meet local founders',
  }
  const m2 = mergeTextExtraction(det2, aiFill)
  check('fill: det category still wins (networking)', m2.category === 'networking')
  check('fill: AI fills missing guestCount (30)', m2.guestCount === 30)
  check('fill: AI fills missing venueType', m2.venueType === 'public_park')
  check('fill: AI fills missing budget (800)', m2.budget === 800)
  check('fill: AI fills desiredOutcome', m2.desiredOutcome === 'meet local founders')
  check('fill: AI fills specialRequirements when det empty', m2.specialRequirements.includes('name tags'))

  // Schema guard: a merged extraction that violates plannerInputSchema yields null.
  const bad: TextExtraction = {
    category: 'bbq', guestCount: 0, adults: null, kids: null, venueType: null,
    budget: null, timeframe: null, recurrenceFrequency: null, specialRequirements: [], desiredOutcome: null,
  }
  check('schema guard: invalid guestCount (0) → buildPlannerInput null', buildPlannerInput(bad, LOC) === null)
}

// Fallback: with AI disabled, understandEventText returns exactly the deterministic input.
console.log('\nFallback (AI disabled) — understandEventText === deterministic parse:')
let fbOk = true
for (const { text } of CASES) {
  const det = parseEventText(text, LOC).input
  const got = await understandEventText(text, LOC)
  if (JSON.stringify(got) !== JSON.stringify(det)) { fbOk = false; console.log(`  FAIL fallback mismatch: ${text}`) }
}
check('fallback returns the deterministic PlannerInput for every case', fbOk)
check('extractFromText is pure (same text → same extraction)',
  JSON.stringify(extractFromText(CASES[0].text)) === JSON.stringify(extractFromText(CASES[0].text)))

console.log('')
if (failures === 0) {
  console.log(`OPE AI Understanding V1 OK — ${CASES.length} requests parsed; extraction + deterministic fallback succeed; engine accepts every built input.`)
  process.exit(0)
} else {
  console.log(`OPE AI Understanding V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

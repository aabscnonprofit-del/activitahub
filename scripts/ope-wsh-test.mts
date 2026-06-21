// "What should happen" content test — proves OPE creates a request-specific DRAFT (not a
// reformatted concept) for vague/emotional requests: distinct per request, capturing what
// happens + what people experience + the intended outcome, and planning stays gated on it.
//
//   Run:  npx tsx scripts/ope-wsh-test.mts   (or: npm run test:wsh)

import { draftWhatShouldHappen, deriveWhatShouldHappen, recognizeScenario } from '../lib/ope/concept-funnel'
import { composeWhatShouldHappen } from '../lib/ai/concept-generation'
import { planFromIdeaCore } from '../lib/ope/plan-from-idea'
import type { PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// The five emotional requests + the request-specific signal each draft must carry.
const EMO: [string, string, RegExp][] = [
  ['memory', 'I want my son to remember this birthday forever.', /lasting memory|unforgettable|remember/i],
  ['team', 'I want my employees to stop avoiding each other.', /reconnect|one team|rapport/i],
  ['friends', 'I want people to make real friends.', /friendship|connection|continue after/i],
  ['princess', 'I want my daughter to feel like a princess.', /royalty|princess|admired|celebrated|special/i],
  ['inspired', 'I want wealthy people to leave inspired.', /inspired|new ideas|motivation|premium|exclusive/i],
]

const OLD_GENERIC = 'A relaxed, social event focused on comfort, food and conversation.'

// ── 1. Each emotional request → a request-specific draft (what happens + experience + outcome)
console.log('\n1 — each emotional request produces a request-specific "what should happen"')
const drafts: string[] = []
for (const [label, idea, signal] of EMO) {
  const d = draftWhatShouldHappen(idea)
  drafts.push(d)
  check(`[${label}] non-empty draft`, d.trim().length > 0)
  check(`[${label}] carries the request's outcome signal`, signal.test(d), d.slice(0, 80))
  check(`[${label}] has the 3-part structure (happens / experience / outcome)`, /what happens/i.test(d) && /experience/i.test(d) && /outcome/i.test(d))
  check(`[${label}] is NOT the old generic concept label`, !d.includes(OLD_GENERIC))
}

// ── 2. Drafts are DISTINCT (requests 2–5 must not be identical) ──────────────────────
console.log('\n2 — drafts are distinct across the unrelated requests')
check('all five drafts are unique', new Set(drafts).size === 5, `${new Set(drafts).size}/5 unique`)
// Explicit pairwise check for 2–5 (the four that used to be byte-identical).
const tail = drafts.slice(1)
let allDistinct = true
for (let i = 0; i < tail.length; i++) for (let j = i + 1; j < tail.length; j++) if (tail[i] === tail[j]) allDistinct = false
check('requests 2–5 are NOT identical to each other', allDistinct)

// ── 3. AI off → composeWhatShouldHappen === deterministic draft (fallback) ───────────
console.log('\n3 — AI disabled: composeWhatShouldHappen falls back to the deterministic draft')
{
  const idea = 'I want my daughter to feel like a princess.'
  const composed = await composeWhatShouldHappen(idea)
  check('composed equals deterministic fallback', composed === draftWhatShouldHappen(idea))
}

// ── 4. Gate — no Event Plan until an approved "what should happen" exists ─────────────
console.log('\n4 — planning gate still holds (a concept alone never substitutes)')
{
  const idea = 'I want my daughter to feel like a princess.'
  const blocked = await planFromIdeaCore({ idea, selectedConcept: null, approvedWhatShouldHappen: null, details: { category: 'birthday', guestCount: 8, kids: 8 }, location: LOC })
  check('no "what should happen" → blocked', !blocked.ok && blocked.error === 'what_should_happen_required', JSON.stringify(blocked))

  const wsh = deriveWhatShouldHappen(idea)
  check('deriveWhatShouldHappen returns the request-specific draft (not a concept)', !!wsh && /royalty|admired|celebrated/i.test(wsh!))
  const ok = await planFromIdeaCore({ idea, selectedConcept: null, approvedWhatShouldHappen: wsh, details: { category: 'birthday', guestCount: 8, kids: 8 }, location: LOC })
  check('approved "what should happen" → Event Plan generated', ok.ok === true, JSON.stringify(ok))
}

// ── 5. Recognition unchanged: itinerary is existing "what should happen"; BBQ still works ─
console.log('\n5 — recognition still works (itinerary + operational BBQ)')
{
  const itinerary = 'Airport pickup → hotel → dinner → paintball → sauna → airport transfer.'
  check('itinerary recognised as existing "what should happen"', recognizeScenario(itinerary).recognized === true)
  const recOk = await planFromIdeaCore({ idea: itinerary, selectedConcept: null, approvedWhatShouldHappen: deriveWhatShouldHappen(itinerary), details: { category: 'networking', guestCount: 6 }, location: LOC })
  check('itinerary → Event Plan generated', recOk.ok === true, JSON.stringify(recOk))

  const bbq = 'Plan a BBQ for 12 adults at Ala Moana Beach on Saturday from 2pm to 6pm with a $600 budget.'
  const bbqOk = await planFromIdeaCore({ idea: bbq, selectedConcept: null, approvedWhatShouldHappen: deriveWhatShouldHappen(bbq), details: { category: 'bbq', guestCount: 12 }, location: LOC })
  check('operationally clear BBQ → Event Plan generated', bbqOk.ok === true, JSON.stringify(bbqOk))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

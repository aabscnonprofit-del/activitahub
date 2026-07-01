// Planning Engine V2 — deterministic reasoning tests (Stage 2 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md. Verifies REASONING QUALITY without depending on exact
// wording: assertions are made on detected signals (booleans) and structural invariants. Proves:
//   * intention preserved          * deterministic output (identical FED -> identical EventPlanV2)
//   * no invented facts (assumptions explicit)   * traceability present   * internal consistency
//   * the engine ignores the legacy category (plans from intention, not category)
//
//   Run:  npx tsx scripts/planning-engine-v2-test.mts

import { planningEngineV2 } from '../lib/planning/planning-engine-v2'
import { extractSignals } from '../lib/planning/intention-signals'
import type { FutureEventDescription } from '../lib/domain/future-event-description'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const LOC = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }
function fed(clientRequest: string, category: string, guestCount: number, recurrence?: 'weekly' | null): FutureEventDescription {
  return {
    clientRequest,
    description: clientRequest, // approved "what should happen" mirrors the request for these tests
    details: { category, guestCount, ...(recurrence ? { recurrence } : {}) } as FutureEventDescription['details'],
    location: LOC,
  }
}

const CASES: Record<string, FutureEventDescription> = {
  parents_day: fed('I want to organize a memorable day for my parents on Waikiki. They are about 70 years old. I want them to have a relaxing day with beautiful views, a quiet dinner, and a limousine ride home.', 'anniversary', 2),
  wedding: fed('I want to plan a wedding for 120 guests.', 'anniversary', 120),
  funeral: fed('I need to organize a funeral for my grandmother.', 'family_reunion', 30),
  birthday: fed('A birthday party for my daughter who is turning 8, about 15 kids.', 'birthday', 15),
  beach_yoga: fed('Beach yoga every Sunday morning.', 'fitness_class', 12, 'weekly'),
  small_conference: fed('A small conference for 80 people about local startups.', 'networking', 80),
}

// ── Universal invariants (every case) ─────────────────────────────────────────────────
console.log('Universal invariants:')
for (const [key, f] of Object.entries(CASES)) {
  const a = planningEngineV2.plan(f)
  const b = planningEngineV2.plan(f)
  check(`${key}: deterministic (identical FED -> identical EventPlanV2)`, JSON.stringify(a) === JSON.stringify(b))
  check(`${key}: intention preserved (originalIntention === clientRequest)`, a.originalIntention === f.clientRequest)

  const tracedItinerary = a.itinerary.every((m) => m.name.length > 0 && m.trace.servesIntention.length > 0)
  const tracedResources = a.resources.every((r) => r.trace.servesIntention.length > 0)
  const tracedRoles = a.staffing.every((r) => r.reason.length > 0 && r.trace.servesIntention.length > 0)
  check(`${key}: traceability present on itinerary/resources/roles`, tracedItinerary && tracedResources && tracedRoles)

  const names = new Set(a.itinerary.map((m) => m.name))
  const logisticsConsistent = a.logistics.every((l) => l.forMoment == null || names.has(l.forMoment))
  const resourcesConsistent = a.resources.every((r) => r.forMoment == null || names.has(r.forMoment))
  const costOrdered = a.costEstimate.low <= a.costEstimate.likely && a.costEstimate.likely <= a.costEstimate.high
  check(`${key}: internally consistent (forMoment refs exist; cost low<=likely<=high)`, logisticsConsistent && resourcesConsistent && costOrdered)

  const assumptionsExplicit = a.assumptions.every((x) => x.statement.length > 0 && x.reason.length > 0)
  const validVerdict = ['planned', 'uncertain', 'needs_human_decision', 'out_of_scope'].includes(a.feasibility.verdict)
  check(`${key}: no invented facts (assumptions explicit; valid feasibility verdict)`, assumptionsExplicit && validVerdict)
}

// ── Reasoning quality at the signal level (wording-independent) ────────────────────────
console.log('\nReasoning quality (intention signals, not wording):')
const s = (k: string) => extractSignals(CASES[k])
check('parents_day: relaxing + scenic detected, participants elderly', s('parents_day').qualities.includes('relaxing') && s('parents_day').qualities.includes('scenic') && s('parents_day').traits.includes('elderly'))
check('wedding: ceremony element + celebratory quality', s('wedding').elements.includes('ceremony') && s('wedding').qualities.includes('celebratory'))
check('funeral: somber tone, NOT celebratory', s('funeral').tone === 'somber' && !s('funeral').qualities.includes('celebratory'))
check('birthday: children trait + celebratory quality', s('birthday').traits.includes('children') && s('birthday').qualities.includes('celebratory'))
check('beach_yoga: recurring + (wellness or class)', s('beach_yoga').recurring && (s('beach_yoga').qualities.includes('wellness') || s('beach_yoga').elements.includes('class')))
check('small_conference: sessions element + professional quality', s('small_conference').elements.includes('sessions') && s('small_conference').qualities.includes('professional'))

// ── The engine ignores the legacy category (plans from intention, not category) ────────
console.log('\nCategory-independence (intention-driven, not category-driven):')
const base = CASES.parents_day
const altCategory: FutureEventDescription = { ...base, details: { ...base.details, category: 'workshop' } as FutureEventDescription['details'] }
check('changing only details.category does NOT change the EventPlanV2', JSON.stringify(planningEngineV2.plan(base)) === JSON.stringify(planningEngineV2.plan(altCategory)))

// ── Intention is preserved across the distinct cases (the audit failure does not recur) ─
console.log('\nIntention not collapsed to one category model:')
const parentsArc = planningEngineV2.plan(CASES.parents_day).experienceDesign.arc
const funeralArc = planningEngineV2.plan(CASES.funeral).experienceDesign.arc
check('different intentions yield different experience designs', parentsArc !== funeralArc)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

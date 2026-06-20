// P-B test — WSH influences planning through typed planning signals.
//
// Proves the G2 gap is closed WITHOUT redesigning the engine:
//   A. Same PlannerInput + DIFFERENT WSH  → plan changes when WSH adds real signals.
//   B. Explicit PlannerInput value + conflicting WSH → PlannerInput WINS.
//   C. Legacy plan (no WSH / empty WSH) → still generates, byte-identical to before.
// Plus unit checks on extractPlanningSignals + enrichInputWithWsh (rules 1–6).
//
//   Run:  npx tsx scripts/ope-wsh-signals-test.mts   (or: npm run test:wsh-signals)

import { generatePlan, extractPlanningSignals, enrichInputWithWsh } from '../lib/ope'
import { mapRequestToApproaches, fillClarificationDefaults, type RequestLike } from '../lib/ope/request-plan'
import { plannerInputSchema } from '../lib/ope/validation'
import type { PlannerInput, PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const plan = (i: PlannerInput) => generatePlan(i)
const reqsOf = (p: ReturnType<typeof generatePlan>) =>
  p.plan?.section_a_what_you_told_us.special_requirements ?? []
const taskTitles = (p: ReturnType<typeof generatePlan>) => {
  const b = p.plan?.section_b_your_plan
  return [
    ...(b?.preparation_checklist ?? []),
    ...(b?.day_of_checklist ?? []),
    ...(b?.after_event_checklist ?? []),
  ].map((t) => t.task)
}
const riskNames = (p: ReturnType<typeof generatePlan>) =>
  (p.plan?.section_d_key_risks.risks ?? []).map((r) => r.name)

// Base input: an organizer's structured details. Adult birthday, 30 guests, venue set
// (so the engine returns a ready plan — not needs_clarification), no budget, no special
// requirements. A supported, priced category in Honolulu.
const base: PlannerInput = {
  category: 'adult_birthday', guestCount: 30, venueType: 'backyard_home', budget: null,
  specialRequirements: [], location: LOC,
}

// ── A. Same input, different WSH → plan changes when WSH adds meaningful signals ──────────
console.log('\nA. Same PlannerInput, different WSH → plan changes')

const wshNeutral = 'A warm, relaxed celebration where guests feel welcome. Intended outcome: a lovely evening.'
const wshRich = 'An elegant evening with an open bar and cocktails, a hired photographer to capture it, '
  + 'a DJ for dancing, and shuttle transport for guests. Intended outcome: a glamorous night to remember.'

const planNeutral = plan(enrichInputWithWsh(base, wshNeutral))
const planRich = plan(enrichInputWithWsh(base, wshRich))

check('neutral WSH adds no feature requirements', reqsOf(planNeutral).length === 0,
  JSON.stringify(reqsOf(planNeutral)))
check('rich WSH changes the plan vs neutral', JSON.stringify(planRich) !== JSON.stringify(planNeutral))
check('rich WSH surfaces typed requirements',
  ['Bar service (cocktails)', 'Photography coverage', 'Entertainment (DJ / performer)', 'Transportation']
    .every((r) => reqsOf(planRich).includes(r)),
  JSON.stringify(reqsOf(planRich)))
check('rich WSH adds the alcohol feature task',
  taskTitles(planRich).some((t) => /bar service|alcohol licensing/i.test(t)))
check('rich WSH adds the photography feature task',
  taskTitles(planRich).some((t) => /photographer|booth/i.test(t)))
check('rich WSH adds the alcohol (high) risk',
  riskNames(planRich).some((r) => /alcohol service/i.test(r)))
check('rich WSH budget > neutral budget (priced feature lines added)',
  (planRich.plan?.section_c_budget.estimate?.likely ?? 0) > (planNeutral.plan?.section_c_budget.estimate?.likely ?? 0),
  `rich=${planRich.plan?.section_c_budget.estimate?.likely} neutral=${planNeutral.plan?.section_c_budget.estimate?.likely}`)

// A venue/outdoor signal in WSH (organizer left venue blank) → venue gets filled.
const noVenue: PlannerInput = { ...base, venueType: null }
const planBeach = plan(enrichInputWithWsh(noVenue, 'A relaxed gathering on the beach at sunset.'))
check('outdoor WSH fills blank venueType → public_park',
  planBeach.plan?.section_a_what_you_told_us.venue_type === 'public_park',
  String(planBeach.plan?.section_a_what_you_told_us.venue_type))

// ── B. Explicit PlannerInput value + conflicting WSH → PlannerInput wins ──────────────────
console.log('\nB. Explicit organizer value beats conflicting WSH')

const withVenueAndBudget: PlannerInput = { ...base, venueType: 'backyard_home', budget: 5000 }
const conflicting = 'Hold it at a public park outdoors with a $99 budget.'
const enrichedB = enrichInputWithWsh(withVenueAndBudget, conflicting)
check('organizer venueType wins (backyard_home, not public_park)', enrichedB.venueType === 'backyard_home',
  String(enrichedB.venueType))
check('organizer budget wins (5000, not 99)', enrichedB.budget === 5000, String(enrichedB.budget))

const withGuests: PlannerInput = { ...base, guestCount: 30 }
const enrichedGuests = enrichInputWithWsh(withGuests, 'A small dinner for 8 people.')
check('organizer guestCount wins (30, not 8)', enrichedGuests.guestCount === 30, String(enrichedGuests.guestCount))

// Additive, not destructive: organizer requirement is preserved AND comes first.
const withReq: PlannerInput = { ...base, specialRequirements: ['Vegan catering'] }
const enrichedReq = enrichInputWithWsh(withReq, 'Please hire a photographer.')
check('organizer requirement preserved', enrichedReq.specialRequirements?.includes('Vegan catering') ?? false)
check('organizer requirement stays first', enrichedReq.specialRequirements?.[0] === 'Vegan catering')
check('WSH requirement appended', enrichedReq.specialRequirements?.includes('Photography coverage') ?? false)

// ── C. Legacy plans continue to generate (no WSH / empty WSH = unchanged) ─────────────────
console.log('\nC. Legacy plans unchanged')

const legacy = plan(base)
check('empty WSH → input byte-identical', JSON.stringify(enrichInputWithWsh(base, '')) === JSON.stringify(base))
check('null WSH → input byte-identical', JSON.stringify(enrichInputWithWsh(base, null)) === JSON.stringify(base))
check('undefined WSH → input byte-identical', JSON.stringify(enrichInputWithWsh(base, undefined)) === JSON.stringify(base))
check('plan with empty-WSH enrichment == plan with raw input',
  JSON.stringify(plan(enrichInputWithWsh(base, ''))) === JSON.stringify(legacy))
check('neutral-WSH plan == legacy plan (no signals → no change)',
  JSON.stringify(planNeutral) === JSON.stringify(legacy))

// ── Unit: extractPlanningSignals determinism + suppression ────────────────────────────────
console.log('\nUnit: extractPlanningSignals')

const s1 = extractPlanningSignals(wshRich)
const s2 = extractPlanningSignals(wshRich)
check('deterministic (same WSH → identical signals)', JSON.stringify(s1) === JSON.stringify(s2))
check('extracts budget from "$1,200"', extractPlanningSignals('budget of $1,200').budget === 1200)
check('extracts headcount from "for 25 guests"', extractPlanningSignals('a party for 25 guests').guestCount === 25)

const dry = extractPlanningSignals('A sober, alcohol-free celebration — no bar, but we want wine glasses for toasting with juice.')
check('"alcohol-free" suppresses the bar feature', !dry.requirements.includes('Bar service (cocktails)'))
check('"alcohol-free" surfaces the no-alcohol restriction', dry.requirements.includes('No alcohol (dry event)'))
// And the engine must NOT add the alcohol feature for a dry event.
const dryPlan = plan(enrichInputWithWsh(base, 'A sober, alcohol-free celebration with no bar.'))
check('dry-event plan has no alcohol feature task', !taskTitles(dryPlan).some((t) => /alcohol licensing/i.test(t)))

// ── D. generateApproachesFromRequest path — request narrative as the signal source ───────
// Mirrors the action exactly: mapRequestToApproaches → enrichInputWithWsh(requestText) →
// generatePlan, where requestText = "notes. event_type" (no human-approved WSH on this path).
console.log('\nD. Request → approaches path covered by P-B (request narrative as signal source)')

// Replicate the action's enrich+revalidate + clarification-fill loop (deterministic, no DB).
function wshEnriched(input: PlannerInput, text: string): PlannerInput {
  const enriched = enrichInputWithWsh(input, text)
  const p = plannerInputSchema.safeParse(enriched)
  return p.success ? (p.data as PlannerInput) : input
}
function planApproach(input: PlannerInput) {
  let finalInput = input
  let result = generatePlan(finalInput)
  if (result.status === 'needs_clarification' && result.questions?.length) {
    const re = plannerInputSchema.safeParse(fillClarificationDefaults(finalInput, result.questions))
    if (re.success) { finalInput = re.data as PlannerInput; result = generatePlan(finalInput) }
  }
  return { finalInput, result }
}
const requestTextOf = (r: RequestLike) => [r.notes, r.event_type].filter(Boolean).join('. ')

// A. Rich narrative — beach, photographer, shuttle, dinner, budget. (notes > 120 chars, so
//    the raw-notes blob mapRequestToApproaches stores is truncated; P-B scans the FULL text.)
const richReq: RequestLike = {
  event_type: 'anniversary', city: 'Honolulu', country: 'USA',
  participant_count: 40, budget_cents: 500000, // structured budget = $5000
  notes: "We're celebrating our anniversary on the beach at sunset. We'd love a professional "
    + 'photographer to capture it, a shuttle bus to bring guests from the hotel, and a sit-down '
    + 'dinner reservation at a restaurant afterward. Budget around $6000.',
  desired_date: '2026-09-01',
}
const richText = requestTextOf(richReq)
const richApproaches = mapRequestToApproaches(richReq)
const enrichedRich = richApproaches.map((a) => wshEnriched(a, richText))

check('A: narrative budget signal is detected ($6000)', extractPlanningSignals(richText).budget === 6000)
check('A: every approach gets venueType filled from "beach" → public_park',
  enrichedRich.every((a) => a.venueType === 'public_park'))
check('A: approaches carry the typed photography / transport / dining requirements',
  enrichedRich.every((a) => {
    const r = a.specialRequirements ?? []
    return r.includes('Photography coverage') && r.includes('Transportation') && r.includes('Dining / restaurant booking')
  }), JSON.stringify(enrichedRich[0]?.specialRequirements))
const richPlanned = enrichedRich.map(planApproach).filter((x) => x.result.status === 'plan_ready')
check('A: at least one ready approach', richPlanned.length > 0)
check('A: a ready approach gains the photographer + transport feature tasks',
  richPlanned.some(({ result }) => {
    const b = result.plan?.section_b_your_plan
    const tasks = [...(b?.preparation_checklist ?? []), ...(b?.day_of_checklist ?? []), ...(b?.after_event_checklist ?? [])].map((t) => t.task)
    return tasks.some((t) => /photographer|booth/i.test(t)) && tasks.some((t) => /transport/i.test(t))
  }))

// B. Structured generated fields must NOT be overwritten by conflicting narrative values.
const conflictReq: RequestLike = {
  event_type: 'anniversary', city: 'Honolulu', country: 'USA',
  participant_count: 40, budget_cents: 500000, // structured: 40 guests, $5000
  notes: 'A small dinner for 8 people with a $99 budget, hire a photographer.',
  desired_date: '2026-09-01',
}
const conflictEnriched = mapRequestToApproaches(conflictReq).map((a) => wshEnriched(a, requestTextOf(conflictReq)))
check('B: structured budget wins (5000, not 99)', conflictEnriched.every((a) => a.budget === 5000),
  JSON.stringify(conflictEnriched.map((a) => a.budget)))
check('B: structured guestCount wins (40, not 8)', conflictEnriched.every((a) => a.guestCount === 40),
  JSON.stringify(conflictEnriched.map((a) => a.guestCount)))
check('B: narrative still ADDS the photography requirement (fill, not overwrite)',
  conflictEnriched.every((a) => (a.specialRequirements ?? []).includes('Photography coverage')))

// C. Existing behavior valid — a neutral request (no signal keywords) generates the SAME
//    approaches/plans as before P-B (enrichment is a no-op when the narrative has no signals).
const plainReq: RequestLike = {
  event_type: 'anniversary', city: 'Honolulu', country: 'USA',
  participant_count: 40, budget_cents: 500000,
  notes: 'We would like a lovely celebration for our friends and family.',
  desired_date: '2026-09-01',
}
const plainText = requestTextOf(plainReq)
const plainBase = mapRequestToApproaches(plainReq)
check('C: neutral narrative → enriched input byte-identical to mapped input',
  plainBase.every((a) => JSON.stringify(wshEnriched(a, plainText)) === JSON.stringify(a)))
check('C: neutral narrative → plans byte-identical to pre-P-B',
  plainBase.every((a) => JSON.stringify(planApproach(wshEnriched(a, plainText)).result) === JSON.stringify(planApproach(a).result)))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Scenario First test — proves OPE establishes a scenario (recognised OR created) before
// planning. Covers: a provided itinerary is RECOGNISED (not recreated); a vague request needs
// scenario CREATION; an operationally-clear brief recognises a standard scenario; and the
// planning gate refuses to plan with NO scenario but proceeds once one exists.
//
//   Run:  npx tsx scripts/ope-scenario-test.mts   (or: npm run test:scenario)

import { recognizeScenario, deriveWhatShouldHappen } from '../lib/ope/concept-funnel'
import { analyzeIdeaAction } from '../lib/actions/planner'
import { planFromIdeaCore } from '../lib/ope/plan-from-idea'
import type { PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// ── 1. Provided itinerary → scenario RECOGNISED (do not create) ──────────────────────
console.log('\n1 — itinerary: "Airport pickup → hotel → dinner → paintball → sauna → airport transfer"')
{
  const idea = 'Airport pickup → hotel → dinner → paintball → sauna → airport transfer.'
  const rec = recognizeScenario(idea)
  check('recognizeScenario → recognized', rec.recognized === true)
  check('source = provided', rec.source === 'provided', String(rec.source))
  const res = await analyzeIdeaAction(idea)
  check('analyze → scenario_recognized', res.ok && res.scenario.status === 'scenario_recognized', res.ok ? res.scenario.status : 'not ok')
  check('NO concept options created for a recognised scenario', res.ok && res.funnel.concept_options.length === 0)
}

// 1b — comma-separated itinerary also recognised
{
  const idea = 'Airport pickup, hotel, dinner, paintball, sauna, beer, airport transfer.'
  check('comma itinerary recognized', recognizeScenario(idea).recognized === true)
}

// ── 2. Vague request → scenario must be CREATED (concept options = candidate scenarios) ─
console.log('\n2 — vague: "I want a birthday for my son"')
{
  const idea = 'I want a birthday for my son.'
  check('recognizeScenario → NOT recognized', recognizeScenario(idea).recognized === false)
  const res = await analyzeIdeaAction(idea)
  check('analyze → scenario_needed', res.ok && res.scenario.status === 'scenario_needed', res.ok ? res.scenario.status : 'not ok')
  check('candidate scenarios offered (>=3 concept options)', res.ok && res.funnel.concept_options.length >= 3)
  check('status concept_selection_needed (create before plan)', res.ok && res.funnel.status === 'concept_selection_needed')
}

// ── 3. Operationally-clear brief → standard scenario recognised ──────────────────────
console.log('\n3 — operational: "Plan a BBQ for 12 adults at Ala Moana Beach Sat 2-6pm $600"')
{
  const idea = 'Plan a BBQ for 12 adults at Ala Moana Beach on Saturday from 2pm to 6pm with a $600 budget.'
  const res = await analyzeIdeaAction(idea)
  check('analyze → scenario_recognized (operational)', res.ok && res.scenario.status === 'scenario_recognized' && res.scenario.source === 'operational')
  check('no concept creation', res.ok && res.funnel.concept_options.length === 0)
}

// ── 4. Narrative scenario recognised ─────────────────────────────────────────────────
console.log('\n4 — narrative: "Old friends reconnect by the ocean and end the evening with fireworks"')
{
  const rec = recognizeScenario('Old friends reconnect by the ocean and end the evening with fireworks.')
  check('recognized as narrative', rec.recognized === true && rec.source === 'narrative')
}

// ── 5. GATE — no Event Plan before an approved "what should happen" ───────────────────
console.log('\n5 — gate: no Event Plan before an approved "what should happen"')
{
  const idea = 'I want a birthday for my son.'

  // (a) Nothing recorded → blocked.
  const noWsh = await planFromIdeaCore({
    idea, selectedConcept: null, approvedWhatShouldHappen: null,
    details: { category: 'birthday', guestCount: 10, kids: 10 }, location: LOC,
  })
  check('no "what should happen" → blocked (what_should_happen_required)', !noWsh.ok && noWsh.error === 'what_should_happen_required', JSON.stringify(noWsh))

  // (b) Concept Funnel ALONE is NOT approval: a selected concept with no recorded "what
  //     should happen" is still blocked (requirement 5).
  const analysis = await analyzeIdeaAction(idea)
  const chosen = analysis.ok ? analysis.funnel.concept_options[0] : null
  const conceptOnly = await planFromIdeaCore({
    idea, selectedConcept: chosen, approvedWhatShouldHappen: null,
    details: { category: 'birthday', guestCount: 10, kids: 10 }, location: LOC,
  })
  check('concept selected but NOT recorded as "what should happen" → still blocked', !conceptOnly.ok && conceptOnly.error === 'what_should_happen_required', JSON.stringify(conceptOnly))

  // (c) Concept turned into a recorded, approved "what should happen" → Event Plan generated.
  const wsh = deriveWhatShouldHappen(idea)
  check('a "what should happen" is produced from the concept', !!wsh && wsh.length > 0)
  const created = await planFromIdeaCore({
    idea, selectedConcept: chosen, approvedWhatShouldHappen: wsh,
    details: { category: 'birthday', guestCount: 10, kids: 10 }, location: LOC,
  })
  check('approved "what should happen" → Event Plan generated (ok)', created.ok === true, JSON.stringify(created))
  if (created.ok) {
    // Operational clarification happens AFTER "what should happen".
    check('engine ran AFTER "what should happen" (plan_ready or needs_clarification)', created.result.status === 'plan_ready' || created.result.status === 'needs_clarification', created.result.status)
  }

  // (d) Provided itinerary is recognised as existing "what should happen" → proceeds.
  const itinerary = 'Airport pickup → hotel → dinner → paintball → sauna → airport transfer.'
  const recWsh = deriveWhatShouldHappen(itinerary)
  check('itinerary IS an existing "what should happen"', !!recWsh && recWsh.length > 0)
  const recognized = await planFromIdeaCore({
    idea: itinerary, selectedConcept: null, approvedWhatShouldHappen: recWsh,
    details: { category: 'networking', guestCount: 6 }, location: LOC,
  })
  check('recognised "what should happen" → Event Plan generated (ok)', recognized.ok === true, JSON.stringify(recognized))
}

// ── 6. Emotional/creative requests still need CREATION (not falsely recognised) ──────
console.log('\n6 — emotional requests are NOT falsely recognised (still need creation)')
for (const idea of [
  'I want my daughter to feel like a princess.',
  'I want a yoga event for very rich people.',
  'I want an evening activity for elderly people in a retirement home.',
]) {
  check(`not recognized — ${idea.slice(0, 34)}…`, recognizeScenario(idea).recognized === false)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

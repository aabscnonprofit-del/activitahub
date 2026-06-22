// OPE Agent — DETERMINISTIC FALLBACK regression (assessRequest). This is the safety net used
// when the AI Agent is unavailable/invalid; it must never invent an outcome.
//
// Proves the deterministic verdict for the canonical cases:
//   - vague/emotional ("visit heaven", "best day of my life") → discovery_required, NO WSH
//   - "surprise my wife" → discovery_required OR interpretation_required, never plan-ready
//   - a concrete activity request → NOT discovery_required
//   Run:  npx tsx scripts/ope-agent-test.mts   (or: npm run test:agent)

import { assessRequest } from '../lib/ope/agent'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

console.log('A. Vague / emotional → discovery_required, no WSH, no plan')
for (const text of ['I want to visit heaven', 'I want the best day of my life']) {
  const v = assessRequest({ rawText: text })
  check(`"${text}" → discovery_required`, v.verdict === 'discovery_required', v.verdict)
  check(`"${text}" → mayDraftWsh false`, v.mayDraftWsh === false)
  check(`"${text}" → mayRunPlanner false`, v.mayRunPlanner === false)
  check(`"${text}" → discovery questions present`, Array.isArray(v.discoveryQuestions) && v.discoveryQuestions.length > 0)
}

console.log('\nB. "surprise my wife" → discovery or interpretation, but never plan-ready')
{
  const v = assessRequest({ rawText: 'I want to surprise my wife' })
  check('verdict ∈ {discovery_required, interpretation_required}',
    v.verdict === 'discovery_required' || v.verdict === 'interpretation_required', v.verdict)
  check('mayRunPlanner false (no plan without an approved WSH)', v.mayRunPlanner === false)
  check('not plan_ready / not sufficient_data', v.verdict !== 'plan_ready' && v.verdict !== 'sufficient_data')
}

console.log('\nC. Concrete activity request → NOT discovery_required')
for (const text of [
  'a birthday party for 20 kids in our backyard next Saturday',
  'birthday party for my daughter, 10 kids, in the park',
]) {
  const v = assessRequest({ rawText: text })
  check(`"${text}" → not discovery_required`, v.verdict !== 'discovery_required', v.verdict)
  check(`"${text}" → mayDraftWsh true`, v.mayDraftWsh === true)
}

console.log('\nD. Structured fields present → sufficient_data')
{
  const v = assessRequest({ rawText: 'something nice', fields: { category: 'birthday', guestCount: 12 } })
  check('verdict sufficient_data', v.verdict === 'sufficient_data', v.verdict)
  check('mayRunPlanner true', v.mayRunPlanner === true)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

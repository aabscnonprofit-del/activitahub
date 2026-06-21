// WSH Discovery-gate regression — vague/emotional requests must NOT reach WSH drafting.
//
// Threshold: category == null && anchors === 0 → Discovery required, no invented WSH.
//   Run:  npx tsx scripts/ope-wsh-discovery-gate-test.mts   (or: npm run test:wsh-gate)

import { analyzeIdeaAction } from '../lib/actions/planner'
import { recognizeScenario, assessConceptEntry } from '../lib/ope/concept-funnel'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const VAGUE = [
  'I want to visit heaven',
  'I want the best day of my life',
  'I want to surprise my wife',
  'I want to feel alive again',
]

console.log('A. Vague/emotional requests hit the Discovery gate (no fabricated WSH, no plan)')
for (const req of VAGUE) {
  // Why the gate fires: not a recognized scenario, and zero plannable anchor.
  const rec = recognizeScenario(req)
  const a = assessConceptEntry(req)
  check(`"${req}" — not recognized`, rec.recognized === false)
  check(`"${req}" — category=null & anchors=0`, a.category == null && a.anchors === 0,
    `category=${a.category} anchors=${a.anchors}`)

  // End-to-end: analyzeIdeaAction must return scenario_needed with NULL WSH (no invention).
  const res = await analyzeIdeaAction(req)
  check(`"${req}" — ok result`, res.ok === true)
  if (res.ok) {
    check(`"${req}" — status scenario_needed`, res.scenario.status === 'scenario_needed',
      res.scenario.status)
    check(`"${req}" — whatShouldHappen is NULL (no fabricated WSH)`,
      res.scenario.whatShouldHappen === null, JSON.stringify(res.scenario.whatShouldHappen))
  }
}

console.log('\nB. Control — a concrete request is NOT over-blocked')
const concrete = 'a birthday party for 20 kids in our backyard next Saturday'
const cRes = await analyzeIdeaAction(concrete)
check('concrete request: ok', cRes.ok === true)
if (cRes.ok) {
  check('concrete request: WSH is present (recognized or drafted, not gated)',
    cRes.scenario.whatShouldHappen !== null, JSON.stringify(cRes.scenario.status))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Planner discovery-flow regression — a vague request must surface a DISCOVERY state, not the
// generic "couldn't generate the plan" error.
//
// "I want to surprise my wife" → AI Organizer discovery_required (WSH null). analyzeIdeaAction
// must return scenario_needed + whatShouldHappen null + discoveryRequired + clarifying questions,
// and PlannerClient must render a discovery state on the idea step instead of advancing to plan.
//   Run:  npx tsx scripts/planner-discovery-test.mts   (or: npm run test:planner-discovery)

import { readFileSync } from 'node:fs'
import { analyzeIdeaAction } from '../lib/actions/planner'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

console.log('A. "I want to surprise my wife" → discovery state, no WSH, no generic error')
{
  const res = await analyzeIdeaAction('I want to surprise my wife')
  check('returns ok (not a failure/error result)', res.ok === true)
  if (res.ok) {
    check('status scenario_needed', res.scenario.status === 'scenario_needed', res.scenario.status)
    check('whatShouldHappen is null (no fabricated WSH)', res.scenario.whatShouldHappen === null,
      JSON.stringify(res.scenario.whatShouldHappen))
    check('discoveryRequired === true', res.scenario.discoveryRequired === true,
      String(res.scenario.discoveryRequired))
    check('discoveryQuestions is a non-empty array', Array.isArray(res.scenario.discoveryQuestions) && res.scenario.discoveryQuestions.length > 0,
      JSON.stringify(res.scenario.discoveryQuestions))
    // The fix: never questions-only — interpretation + concept directions must accompany.
    check('interpretation present', !!res.scenario.interpretation && res.scenario.interpretation.length > 0,
      JSON.stringify(res.scenario.interpretation))
    check('>= 2 concept directions (not questions-only)', Array.isArray(res.scenario.directions) && res.scenario.directions.length >= 2,
      JSON.stringify(res.scenario.directions))
  }
}

console.log('\nB. Control — a concrete request does NOT enter discovery')
{
  const res = await analyzeIdeaAction('a birthday party for 20 kids in our backyard next Saturday')
  check('returns ok', res.ok === true)
  if (res.ok) {
    check('not discoveryRequired', res.scenario.discoveryRequired !== true, String(res.scenario.discoveryRequired))
    check('has a WSH (recognised or drafted)', res.scenario.whatShouldHappen !== null, JSON.stringify(res.scenario.status))
  }
}

console.log('\nC. Multi-turn discovery — the Organizer remembers prior answers and converges')
{
  const idea = 'I want to surprise my wife'
  const first = await analyzeIdeaAction(idea)
  check('turn 1 is discovery (WSH null)', first.ok === true && first.scenario.whatShouldHappen === null)

  // The user answers; full history is sent back. The combined context must end discovery.
  const conversation = [
    { role: 'organizer' as const, content: first.ok ? (first.scenario.interpretation ?? '') : '' },
    { role: 'user' as const, content: 'It is our 10th wedding anniversary — an intimate dinner for 2, budget 300 dollars, this Saturday evening.' },
  ]
  const second = await analyzeIdeaAction(idea, conversation)
  check('turn 2 returns ok', second.ok === true)
  if (second.ok) {
    check('Organizer used the answer → discovery ended (WSH present)', second.scenario.whatShouldHappen !== null,
      JSON.stringify({ status: second.scenario.status, discoveryRequired: second.scenario.discoveryRequired }))
    check('no longer discoveryRequired', second.scenario.discoveryRequired !== true, String(second.scenario.discoveryRequired))
  }
}

console.log('\nD. PlannerClient renders a chat discovery conversation, does not advance on null WSH (source guardrail)')
{
  const src = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')
  check('has an append-only discovery conversation state', /DiscoveryMsg\[\] \| null/.test(src) && src.includes('setDiscovery('))
  check('seeds the conversation from the discovery scenario', src.includes('setDiscovery([organizerTurn(res.scenario)])'))
  check('has a multi-turn answer handler (submitAnswer) sending full history', src.includes('submitAnswer') && src.includes('toConversation(nextMsgs)'))
  check('renders interpretation + directions BEFORE questions', (() => {
    const dir = src.indexOf("tf('discovery.directionsLabel')")
    const q = src.indexOf("tf('discovery.questionsLabel')")
    return src.includes("tf('discovery.youMean')") && dir > -1 && q > -1 && dir < q
  })())
  // The null-WSH branch (in submitIdea) must NOT advance — it returns before setStep.
  const idx = src.indexOf('res.scenario.whatShouldHappen === null')
  const ret = src.indexOf('return', idx)
  const advance = src.indexOf("setStep('wsh')", idx)
  check('discovery branch returns before advancing', idx > -1 && ret > -1 && ret < advance)
}

console.log('\nE. License CTA removed from the planner page during discovery / before WSH / before plan')
{
  const page = readFileSync(new URL('../app/[locale]/plan-an-event/page.tsx', import.meta.url), 'utf8')
  check('no BuyEventLicenseButton on the planner page', !page.includes('BuyEventLicenseButton'))
  check('no early license panel (panel.body) on the page', !page.includes("tL('panel.body')"))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

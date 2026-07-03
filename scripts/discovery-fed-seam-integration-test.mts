// Discovery → Statement of Understanding → FED — backend seam integration test.
//
// Exercises ONLY the two published backend seams end to end at the action layer:
//   discoverAction (lib/actions/discovery.ts) → Statement of Understanding → describeFutureEventAction
//   (lib/actions/future-event-description.ts). No UI, planner, legacy planning, Planning/Workspace, or
//   product-flow code is imported. Runs WITHOUT an OpenAI key: both seams take their existing fail-safe
//   paths, so the whole path is deterministic — Discovery asks its one meaning-level clarification, then
//   (after an answer) stops with a Statement of Understanding; the FED seam with no key and no approval
//   reports generation_failed and fabricates nothing, while an approve + prior short-circuits to approved.
//
//   Run:  npx tsx scripts/discovery-fed-seam-integration-test.mts

import { discoverAction } from '../lib/actions/discovery'
import { describeFutureEventAction } from '../lib/actions/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const IDEA = 'I want my dad to feel honoured and celebrated by his oldest friends.'

// 1. Discovery seam returns a DiscoveryResult (first turn, no key → its one meaning-level clarification).
{
  const d1 = await discoverAction(IDEA)
  check('discovery: returns a DiscoveryResult status', d1.status === 'needs_clarification' || d1.status === 'understood')
  check('discovery: first turn asks one clarification (no key)', d1.status === 'needs_clarification' && d1.question.trim().length > 0)
}

// 2. Reaching a Statement of Understanding: after an answer, Discovery stops with a statement that feeds FED.
let statementOfUnderstanding = ''
{
  const d2 = await discoverAction(IDEA, 'a calm evening among his closest friends')
  check('discovery: after an answer → understood', d2.status === 'understood')
  if (d2.status === 'understood') statementOfUnderstanding = d2.statementOfUnderstanding
  check('discovery: statement of understanding is non-empty', statementOfUnderstanding.trim().length > 0)
}

// 3. FED seam consumes the Statement of Understanding and returns a FutureEventDescriptionResult.
{
  const f1 = await describeFutureEventAction(statementOfUnderstanding)
  check('fed: returns a FutureEventDescriptionResult status', f1.status === 'awaiting_approval' || f1.status === 'approved' || f1.status === 'generation_failed')
  check('fed: no key → generation_failed (ai_unavailable)', f1.status === 'generation_failed' && f1.reason === 'ai_unavailable')
  check('fed: no description fabricated on failure', !('futureEventDescription' in f1))
}

// 3b. The approval loop is reachable through the seam: approve + a prior description → approved (deterministic).
{
  const prior = 'A warm, unhurried evening where your dad is celebrated by his oldest friends.'
  const f2 = await describeFutureEventAction(statementOfUnderstanding, prior, { decision: 'approve' })
  check('fed: approve + prior → approved', f2.status === 'approved')
  check('fed: approved returns the reviewed description', f2.status === 'approved' && f2.futureEventDescription === prior)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

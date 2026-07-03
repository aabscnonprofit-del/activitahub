// Future Event Description action seam — the additive backend entry point for the future AUTHORITATIVE FED flow.
//
// Verifies the new seam (lib/actions/future-event-description.ts) delegates to the dedicated FED AI
// (describeFutureEvent) and returns the FutureEventDescriptionResult contract. Runs WITHOUT an OpenAI key, so
// behavior here is deterministic: with no decision, the FED AI is unavailable → generation_failed (never a
// fabricated description); an `approve` with a prior description short-circuits to `approved` (no AI call). It
// exercises ONLY the new seam and depends on no existing product code.
//
//   Run:  npx tsx scripts/fed-action-seam-test.mts

import { describeFutureEventAction } from '../lib/actions/future-event-description'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// No key, no decision → the FED AI is unavailable; the seam surfaces generation_failed and fabricates nothing.
{
  const r = await describeFutureEventAction('You want your dad to feel celebrated by his oldest friends.')
  check('no key → generation_failed (ai_unavailable)', r.status === 'generation_failed' && r.reason === 'ai_unavailable')
  check('no FED fabricated on failure', !('futureEventDescription' in r))
}

// Approve + prior description → the seam returns the approved description (STOP; no regeneration, no AI call).
{
  const prior = 'A warm, unhurried evening where your dad feels celebrated by his oldest friends.'
  const r = await describeFutureEventAction('You want your dad to feel celebrated by his oldest friends.', prior, { decision: 'approve' })
  check('approve + prior → approved', r.status === 'approved')
  check('approve → returns the reviewed description unchanged', r.status === 'approved' && r.futureEventDescription === prior)
}

// Contract: the seam always returns exactly one of the three FutureEventDescriptionResult states.
{
  const r = await describeFutureEventAction('   ')
  check('always returns a FutureEventDescriptionResult status', r.status === 'awaiting_approval' || r.status === 'approved' || r.status === 'generation_failed')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

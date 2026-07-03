// Discovery action seam — the additive backend entry point for the future AUTHORITATIVE Discovery flow.
//
// Verifies the new seam (lib/actions/discovery.ts) delegates to the dedicated Discovery AI (discoverIntent)
// and returns the DiscoveryResult contract. Runs WITHOUT an OpenAI key, so the module's fail-safe path
// applies and behavior here is deterministic: on the first turn Discovery returns its one meaning-level
// clarification (never a fabricated statement); once an answer is present, the one-question cap makes it stop
// with a Statement of Understanding. It exercises ONLY the new seam and depends on no existing product code.
//
//   Run:  npx tsx scripts/discovery-action-seam-test.mts

import { discoverAction } from '../lib/actions/discovery'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// First turn (no key) → the seam surfaces Discovery's single meaning-level clarification.
{
  const r = await discoverAction('I want a party for my dad')
  check('first turn → needs_clarification', r.status === 'needs_clarification')
  check('first turn → a non-empty clarification question', r.status === 'needs_clarification' && r.question.trim().length > 0)
}

// After an answer → the one-question cap stops Discovery with a Statement of Understanding.
{
  const r = await discoverAction('I want a party for my dad', 'a calm evening with his closest friends')
  check('after an answer → understood', r.status === 'understood')
  check('after an answer → a non-empty statement of understanding', r.status === 'understood' && r.statementOfUnderstanding.trim().length > 0)
}

// Contract: the seam always returns exactly one of the two DiscoveryResult states.
{
  const r = await discoverAction('   ')
  check('always returns a DiscoveryResult status', r.status === 'needs_clarification' || r.status === 'understood')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

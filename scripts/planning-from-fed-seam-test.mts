// approved FED → legacy Planning — adapter seam test.
//
// Proves the additive backend adapter (lib/actions/planning-from-fed.ts) is a real, callable backend entry
// point that reuses the existing legacy Planning path, WITHOUT touching UI. It calls the seam with an EMPTY
// approved Future Event Description: the reused legacy path (generateFromIdeaAction) checks its description
// gate FIRST — before any auth / database — so it returns `what_should_happen_required` deterministically,
// with no Next request context, Supabase, or sign-in required. This exercises the adapter → legacy-Planning
// delegation while changing nothing.
//
//   Run:  npx tsx scripts/planning-from-fed-seam-test.mts

import { planFromApprovedFedAction } from '../lib/actions/planning-from-fed'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Empty approved FED → the reused legacy Planning path returns its description gate (no runtime needed).
{
  const r = await planFromApprovedFedAction({
    approvedFutureEventDescription: '',
    clientRequest: 'I want a party for my dad',
    details: { category: 'birthday', guestCount: 10 },
    location: { city: 'Honolulu', country: 'USA' },
  })
  check('seam is callable without UI', typeof r === 'object' && r !== null && 'ok' in r)
  check('empty approved FED → what_should_happen_required (gate first, no auth/DB)', !r.ok && r.error === 'what_should_happen_required')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

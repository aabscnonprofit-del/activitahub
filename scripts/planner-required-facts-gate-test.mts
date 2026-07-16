// Required facts must NOT override AI readiness (Product Canon Ch. 9 / Ch. 12).
//
// The AI Organizer's verdict (decideRequest → mayDraftWsh) is authoritative for whether Discovery is
// required. Once the AI has judged the intent ready to draft, `analyzeIdeaAction` must NOT re-force
// Discovery merely because a deterministic operational fact (expected-attendance guestCount, or
// instructor) is still unknown — that was the legacy `missingRequiredFact` override (removed here).
// guestCount and instructor are still EXTRACTED and carried through the prefill/FED when the user
// stated them; when unstated they flow through as unknown and do not block Statement/FED/planning.
// (The pure capture logic is covered by required-facts-test.)
//
//   Run:  npx tsx scripts/planner-required-facts-gate-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const action = read('lib/actions/planner.ts')
const planner = read('components/planner/PlannerClient.tsx')

// ── Extraction is preserved (Req 3 / scenario D): facts are still read from the idea + latest answer
//    and carried in the prefill/FED when the user provided them. ───────────────────────────────────
check('imports the required-facts CAPTURE helpers',
  action.includes("from '@/lib/planning/required-facts'") &&
  ['readHeadcount', 'readBareCount', 'readInstructor', 'readInstructorAnswer'].every((f) => action.includes(f)))
check('headcount is still captured from idea + short answer',
  action.includes('ext.guestCount ?? readHeadcount(effective) ?? readBareCount(lastAnswer)'))
check('instructor is still captured from idea + short answer',
  action.includes('readInstructor(effective) ?? readInstructorAnswer(lastAnswer)'))
check('prefill still carries the captured guestCount + instructor',
  action.includes('guestCount: headcount') && /\n\s*instructor,\n/.test(action))
check('client still carries the captured instructor into the FED via applyPrefill',
  planner.includes('if (p.instructor) setInstructor(p.instructor)'))

// ── AI readiness is authoritative (Req 1 / Req 2 / Req 7): the deterministic gate no longer overrides.
check('the legacy deterministic override is gone (no missingRequiredFact call in the action)',
  !action.includes('missingRequiredFact('))
check('missingRequiredFact is no longer imported into the action',
  !action.includes('missingRequiredFact,'))
check('no deterministic missing-fact branch forces Discovery',
  !/const missing = missingRequiredFact\(/.test(action) && !action.includes('missingFact: missing'))
check('the ONLY forced-Discovery path is the AI verdict (!verdict.mayDraftWsh)',
  action.includes('if (!verdict.mayDraftWsh) {') &&
  (action.match(/discoveryRequired: true/g) ?? []).length === 1)

// ── No legacy form reintroduced (Req 4). ──────────────────────────────────────────────────────────
check('no Details step was reintroduced', !planner.includes("'details'") && !planner.includes("setStep('details')"))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

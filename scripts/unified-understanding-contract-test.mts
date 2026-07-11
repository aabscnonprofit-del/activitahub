// Unified Understanding — planner UI convergence contract test.
//
// Product Convergence (Project First): the organizer must experience ONE understanding step before Planning.
// This static, deterministic source analysis of components/planner/PlannerClient.tsx asserts the converged
// state — the single "what should happen" (WSH) understanding gate is present and the parallel Discovery/FED
// PREVIEW surfaces (a second, competing understanding artifact) are gone from the client — while confirming
// the accepted FED/Discovery ARCHITECTURE (the lib actions/engines) is preserved, not deleted. Reads source
// only; changes nothing.
//
//   Run:  npx tsx scripts/unified-understanding-contract-test.mts

import { readFileSync, existsSync } from 'node:fs'

const src = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. ONE understanding gate: the WSH step is present and reads as a single, clear approve-before-planning step.
check('single understanding step present (step === \'wsh\')', src.includes("step === 'wsh'"))
check('states what was understood (a draft of what should happen)', src.includes('What should happen') && /draft of what happens/i.test(src))
check('states it can be edited before approval', /edit it until it/i.test(src))
check('approval is one natural action + says what happens next (plan only after this)',
  src.includes('Approve & continue') && /we plan only after this/i.test(src))

// 2. NO duplicate understanding workflow remains visible in the client — the Discovery/FED preview surfaces
//    and their exclusive plumbing are gone (they were a second, competing understanding artifact).
check('no Discovery preview surface', !src.includes('Discovery (preview)') && !src.includes('seamDiscovery'))
check('no FED preview surface / bypass', !src.includes('Future Event Description (preview)') && !src.includes('seamFed') && !src.includes('Continue to Planning'))
check('no parallel FED planning-description branch in the client', !src.includes('fedPlanningDescription'))
check('client does not import the preview/bypass actions',
  !/\bdiscoverAction\b/.test(src) && !/\bdescribeFutureEventAction\b/.test(src) && !/\bplanFromApprovedFedAction\b/.test(src))

// 3. ONE planning path from the single understanding step (WSH → generateFromIdeaAction).
check('planning flows through the single generateFromIdeaAction path', src.includes('generateFromIdeaAction('))
// The WSH step IS the single understanding recap: it presents the draft as an editable field and
// approval leads straight into planning (the legacy category/details form is gone).
check('the understanding is presented as an editable draft (WSH step)', src.includes('value={whatShouldHappen}'))
check('WSH approval leads straight into planning (no legacy details form)',
  src.includes('onClick={() => void submitDetails()}') && !src.includes("setStep('details')"))

// 4. Architecture preserved — convergence removed UI duplication only; the FED/Discovery engines still exist.
check('Discovery action still present in lib (architecture preserved)', existsSync(new URL('../lib/actions/discovery.ts', import.meta.url)))
check('FED action still present in lib (architecture preserved)', existsSync(new URL('../lib/actions/future-event-description.ts', import.meta.url)))
check('approved-FED planning adapter still present in lib (architecture preserved)', existsSync(new URL('../lib/actions/planning-from-fed.ts', import.meta.url)))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

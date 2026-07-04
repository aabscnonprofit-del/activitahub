// FED-native Planning vertical — flow guard.
//
// A single higher-level guard over the COMPLETED primary FED path, so future edits cannot silently break
// the vertical. It is a static, deterministic source analysis of components/planner/PlannerClient.tsx (no
// browser, no rendering, no production change) that asserts every hand-off of the flow is still wired:
//
//   Idea → Discovery → FED preview → Continue to Planning → FED-native Planning Details
//        → Planning via planFromApprovedFedAction → result marked "Built from your approved FED"
//
// The granular button contract lives in planner-fed-preview-ui-contract-test.mts; this guard instead
// protects the end-to-end vertical as one unit and confirms the legacy WSH path still coexists.
//
//   Run:  npx tsx scripts/fed-native-planning-vertical-guard-test.mts

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. "Continue to Planning" CTA exists.
const ctaIdx = src.indexOf('Continue to Planning')
check('1. "Continue to Planning" CTA exists', ctaIdx !== -1)

// 2–3. The CTA handler sets fedPlanningDescription from the FED preview and moves to the details step.
const onClickIdx = ctaIdx !== -1 ? src.lastIndexOf('onClick=', ctaIdx) : -1
const handler = onClickIdx !== -1 ? src.slice(onClickIdx, ctaIdx) : ''
check('2. CTA sets fedPlanningDescription from seamFed.futureEventDescription',
  handler.includes('setFedPlanningDescription(seamFed.futureEventDescription)'))
check('3. CTA moves to the details step', handler.includes("setStep('details')"))

// 4. Details step summary speaks in FED terms for the FED path (gated on the selected FED).
check('4. details step shows "Approved Future Event Description" for the FED path',
  /fedPlanningDescription\.trim\(\)\s*\?\s*'Approved Future Event Description: '/.test(src))

// 5. Details step FED source note exists.
check('5. details step FED source note exists',
  src.includes('Using your approved Future Event Description'))

// 6. submitDetails branches to the Planning adapter when a FED is selected, passing the FED through.
check('6. submitDetails branches to planFromApprovedFedAction on the FED path',
  /fedPlanningDescription\.trim\(\)\s*\?\s*await planFromApprovedFedAction/.test(src))
check('6b. adapter receives approvedFutureEventDescription from the selected FED',
  src.includes('approvedFutureEventDescription: fedPlanningDescription'))

// 7. The legacy branch still calls generateFromIdeaAction when no FED is selected.
check('7. legacy branch calls generateFromIdeaAction when no FED is selected',
  src.includes(': await generateFromIdeaAction'))

// 8. The result is marked as built from the approved FED.
check('8. result source indicator "Built from your approved Future Event Description" exists',
  src.includes('Built from your approved Future Event Description'))

// 9. The legacy WSH path still coexists.
check("9. legacy 'wsh' path still exists", src.includes("step === 'wsh'"))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

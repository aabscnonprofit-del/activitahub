// PlannerClient — "Use this preview for planning" UI contract test.
//
// Static, deterministic source analysis of components/planner/PlannerClient.tsx (no browser execution,
// no rendering). It verifies the opt-in FED-preview action's contract: how it is gated, exactly what it
// does on click, what it must NOT do, and that the legacy WSH path is still present. It reads the source
// only — it changes nothing.
//
//   Run:  npx tsx scripts/planner-fed-preview-ui-contract-test.mts

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. PlannerClient imports describeFutureEventAction from the published FED seam.
check('imports describeFutureEventAction from the FED seam',
  /import\s*\{[^}]*\bdescribeFutureEventAction\b[^}]*\}\s*from\s*['"]@\/lib\/actions\/future-event-description['"]/.test(src))

// 2. The action exists.
const labelIdx = src.indexOf('Use this preview for planning')
check('contains the "Use this preview for planning" action', labelIdx !== -1)

// 3. Shown only when seamFed exists, status is awaiting_approval/approved, and the description is non-empty.
check('gated on seamFed existing', src.includes('{seamFed && ('))
check('gated on status awaiting_approval or approved',
  src.includes("seamFed.status === 'awaiting_approval' || seamFed.status === 'approved'"))
check('gated on non-empty futureEventDescription', src.includes('seamFed.futureEventDescription.trim()'))

// 4–5. Extract the button's opening tag (onClick + attributes, up to the label) and assert exactly what it does.
const onClickIdx = labelIdx !== -1 ? src.lastIndexOf('onClick=', labelIdx) : -1
const handler = onClickIdx !== -1 ? src.slice(onClickIdx, labelIdx) : ''
check('onClick stores the FED as the opt-in planning description',
  handler.includes('setFedPlanningDescription(seamFed.futureEventDescription)'))
check("onClick moves to the existing details step", handler.includes("setStep('details')"))
check('onClick does NOT call generateFromIdeaAction', !handler.includes('generateFromIdeaAction'))
check('onClick does NOT call planFromApprovedFedAction', !handler.includes('planFromApprovedFedAction'))
check('onClick does NOT call analyzeIdeaAction', !handler.includes('analyzeIdeaAction'))
check('onClick does NOT bypass details (no submitDetails / onGenerate)',
  !handler.includes('submitDetails') && !handler.includes('onGenerate'))

// 6. Opt-in path drops the legacy WSH dependency: the button does NOT write the legacy whatShouldHappen, and
//    the plan description prefers the FED when selected, else the legacy whatShouldHappen (paths coexist).
check('onClick does NOT touch the legacy whatShouldHappen', !handler.includes('setWhatShouldHappen'))
check('planning description prefers the selected FED, else legacy whatShouldHappen',
  src.includes('fedPlanningDescription.trim() || whatShouldHappen.trim()'))
check('details step shows a FED-source label', src.includes('From your Future Event Description'))
check('FED-source label is gated on the selected FED', /\{fedPlanningDescription\.trim\(\) &&/.test(src))

// 7. Planning routing: the opt-in FED path starts Planning through the published adapter seam; the legacy
//    path keeps generateFromIdeaAction. Both are existing published entry points — no backend contract change.
check('imports planFromApprovedFedAction from the planning adapter seam',
  /import\s*\{[^}]*\bplanFromApprovedFedAction\b[^}]*\}\s*from\s*['"]@\/lib\/actions\/planning-from-fed['"]/.test(src))
check('Planning is branched by the FED opt-in state', src.includes('fedPlanningDescription.trim()'))
check('opt-in FED path calls planFromApprovedFedAction (ternary true branch)',
  src.includes('? await planFromApprovedFedAction'))
check('legacy WSH path keeps generateFromIdeaAction (ternary false branch)',
  src.includes(': await generateFromIdeaAction'))
check('adapter call passes approvedFutureEventDescription from the selected FED',
  src.includes('approvedFutureEventDescription: fedPlanningDescription'))

// 8. Planning source indicator — shown in the result area only for the opt-in FED path.
check('result area has the Planning source indicator text',
  src.includes('Built from your approved Future Event Description'))
check('Planning source indicator is gated by fedPlanningDescription.trim()',
  /\{fedPlanningDescription\.trim\(\) &&[\s\S]{0,240}Built from your approved Future Event Description/.test(src))

// 9. The legacy WSH path is still present (and shows no such indicator).
check("legacy WSH path still present (step 'wsh')", src.includes("step === 'wsh'"))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

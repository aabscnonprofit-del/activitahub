// Human-friendly Project Status Labels — contract test.
//
// Static, deterministic source analysis of the Project Workspace page. Verifies raw technical values
// (project.status / project.current_step) are no longer rendered to the organizer; human-friendly labels
// are shown instead; the approved presentation, Publish and Budget are unchanged. Presentation only.
//
//   Run:  npx tsx scripts/human-friendly-status-labels-contract-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. No raw internal state rendered as a Field value.
check('Status field no longer renders raw project.status', !page.includes('value={project.status}'))
check('Current step field no longer renders raw project.current_step', !page.includes('value={project.current_step}'))
check('Fields render mapped labels (statusLabel / stepLabel)',
  page.includes('value={statusLabel}') && page.includes('value={stepLabel}'))

// 2. Human-friendly mappings.
check('status mapping: active → Active Project', page.includes("active: 'Active Project'"))
check('step mapping: discovery → Discovery', page.includes("discovery: 'Discovery'"))
check('step mapping: planning → Planning', /STEP_LABEL[\s\S]*planning: 'Planning'/.test(page))
check('step mapping: plan_ready → Planning Complete', page.includes("plan_ready: 'Planning Complete'"))
check('approved → "Approved Project" label (no raw internal state)',
  page.includes("approvedAt ? 'Approved Project'"))

// 3. Existing PLAN_STAGE kept for Related plan.
check('existing PLAN_STAGE kept', page.includes('const PLAN_STAGE'))
check('Related plan still uses PLAN_STAGE (planLabel)',
  page.includes('PLAN_STAGE[project.current_step]') && page.includes('value={planLabel}'))

// 4. Unchanged surfaces.
check('approval presentation unchanged (Project Approved + snapshot)',
  page.includes('Project Approved') && page.includes('Approved Project Snapshot'))
check('Publish unchanged', page.includes('<PublishPanel'))
check('Budget unchanged', page.includes('Budget Workspace') && page.includes('/budget`'))

// 5. Presentation only — no backend/action/mutation/state/schema.
check('presentation only — no action call / mutation / client state on the page',
  !page.includes('approveProjectAction(') && !page.includes('useState') &&
  !page.includes('.insert(') && !page.includes('.update('))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Project Workspace entry — UI contract test.
//
// Static, deterministic source analysis of the Project page (the Workspace entry the organizer reaches from
// the Planning handoff) and, for the handoff link only, PlannerClient.tsx. No browser, no rendering, no
// production change — it reads the source and asserts the entry experience is present and that the existing
// navigation, project route, and Planning handoff are unchanged.
//
//   Run:  npx tsx scripts/project-workspace-entry-contract-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')
const planner = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Project Workspace title exists.
check('Project Workspace title exists', page.includes('Project Workspace'))

// 2. Workspace introduction text exists (Planning complete + refine before approval).
check('workspace introduction says Planning is complete', page.includes('Planning is complete'))
check('workspace introduction frames refinement before approval', page.includes('before approval'))

// 3. Existing navigation still works.
check('back-to-Projects navigation present', page.includes('← Projects'))
check('budget module live link present', page.includes('/budget'))

// 4. Existing project route unchanged (data loading + modules + publish still intact).
check('project route still loads the project', page.includes('getProject(') && page.includes('getProjectPublishState('))
check('publish panel + module grid still rendered', page.includes('PublishPanel') && page.includes('Manage this event'))

// 5. Existing Planning handoff unchanged (planner still routes here).
check('planner handoff still offers "Continue to Project Workspace"', planner.includes('Continue to Project Workspace'))
check('planner handoff still targets the project route', planner.includes('/dashboard/projects/'))

// 6. Draft Project Overview (read-only) — labeled draft summary the organizer reviews before approval.
check('"Draft Project Overview" section exists', page.includes('Draft Project Overview'))
check('draft overview explains it is the draft created from Planning',
  page.includes('draft project created from Planning'))
check('draft overview states it is not yet approved / to review before approval',
  page.includes('not yet approved') && page.includes('before approval'))
check('overview reuses existing project summary fields', page.includes('Related plan') && page.includes('Related budget'))
check('overview is read-only — no editing/approval/execution control introduced on the page',
  !page.includes('<form') && !page.includes('onClick='))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

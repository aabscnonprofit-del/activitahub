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
// Prose wraps across lines in JSX; normalize whitespace for multi-line copy checks (structural checks use `page`).
const norm = page.replace(/\s+/g, ' ')

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

// 7. Review Checklist (read-only) — what must be reviewed/refined before Project approval.
check('"Review Checklist" section exists', page.includes('Review Checklist'))
check('checklist covers reviewing the draft project details', page.includes('Review the draft project details'))
check('checklist covers checking the related plan', page.includes('Check the related plan'))
check('checklist covers checking the budget status', page.includes('Check the budget status'))
check('checklist covers modules/vendors/participants/timeline when available',
  page.includes('vendors') && page.includes('participants') && page.includes('timeline') && page.includes('when available'))
check('checklist covers fixing missing/incorrect info before approval',
  page.includes('missing or incorrect information') && page.includes('before approval'))
check('checklist is read-only — no button/input/form control introduced (copy may mention approval)',
  !page.includes('<button') && !page.includes('<input') && !page.includes('<form'))

// 8. Module status — the "Manage this event" module grid is the single source (Module Status Overview
//    removed in IA cleanup #4; its ModuleStatusRow helper is gone).
check('duplicate "Module Status Overview" section removed', !page.includes('Module Status Overview'))
check('ModuleStatusRow helper removed', !page.includes('ModuleStatusRow'))
check('module grid remains the single module/integration-status surface',
  page.includes('Manage this event') && page.includes('modules.map(') && page.includes('Project integration planned'))

// 9. Budget Workspace entry — navigate into the existing Budget Workspace for this Draft Project.
check('"Budget Workspace" entry section exists', page.includes('Budget Workspace'))
check('budget entry copy explains it is part of reviewing the Draft Project before approval',
  page.includes('Budget preparation is part of reviewing the Draft Project before approval'))
check('budget entry links to the existing budget route', page.includes('/budget`'))
check('budget entry CTA is "Open Budget Workspace" when a budget exists', page.includes('Open Budget Workspace'))
check('budget entry CTA is "Budget Workspace available" when none exists', page.includes('Budget Workspace available'))
check('budget entry does not create a budget (no createBudget/insert on the page)',
  !page.includes('createBudget') && !page.includes('.insert('))

// 10. Approve Project — records approval via the owner-only ApproveProjectPanel (records approval only).
check('"Approve Project" section exists', page.includes('Approve Project'))
check('approve copy: records this Draft Project as the Approved Project',
  norm.includes('records this Draft Project as the Approved Project'))
check('approve copy: approval does not change Publish or start Execution',
  norm.includes('Approval does not change Publish or start Execution'))
check('approve section renders the ApproveProjectPanel', page.includes('<ApproveProjectPanel'))
check('approve panel receives the project approval timestamp',
  page.includes('initialApprovedAt={project.approved_at}'))
check('page itself does not mutate status/current_step for approval',
  !page.includes('setProjectStatus') && !page.includes('current_step =') && !page.includes('.status ='))

// 11. Single pre-approval review block — Review Checklist kept; duplicate Approval Readiness merged/removed.
check('single pre-approval review block: Review Checklist kept', page.includes('Review Checklist'))
check('duplicate "Approval Readiness" block removed', !page.includes('Approval Readiness'))
check('no readiness-state logic introduced',
  !page.includes('isReady') && !page.includes('computeReadiness') && !page.includes('canApprove') &&
  !page.includes('readinessState'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

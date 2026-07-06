// Organizer Workspace UI Slice 1 — contract test.
//
// Static source-analysis of the Project Workspace page: the live execution workspace loader is called for
// approved projects and rendered read-only (readiness / checklist / timeline / unbound), gated so a null
// workspace shows nothing new; existing page content is preserved; no mutation/action/UI-state is added.
//
//   Run:  npx tsx scripts/organizer-workspace-ui-slice-1-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Loader wired + called for approved projects only.
check('imports loadOrganizerExecutionWorkspace', page.includes("from '@/lib/organizer-workspace/load-execution-workspace'"))
check('loads the workspace for approved projects (null otherwise)',
  page.includes('approvedAt ? await loadOrganizerExecutionWorkspace(supabase, projectId) : null'))

// 2. Null workspace renders nothing new (gated).
check('workspace section gated on executionWorkspace (null → nothing new)', page.includes('{executionWorkspace && ('))

// 3. Renders readiness / checklist / timeline / unbound from the model.
check('renders readiness counts (pending/active/blocked/completed)',
  page.includes('executionWorkspace.readiness.pending') && page.includes('executionWorkspace.readiness.active') &&
  page.includes('executionWorkspace.readiness.blocked') && page.includes('executionWorkspace.readiness.completed'))
check('renders the interactive execution checklist component (with per-item readiness) from the workspace checklist',
  page.includes('<ExecutionChecklist') && page.includes('items={executionWorkspace.checklist}') && page.includes('readiness={executionWorkspace.itemReadiness}'))
check('renders occurrence-level progress / completion',
  page.includes('executionWorkspace.progress.completed') && page.includes('executionWorkspace.progress.total') && page.includes('executionWorkspace.progress.isComplete'))
check('renders the occurrence timeline when present (entries with absoluteStart)',
  page.includes('executionWorkspace.timeline.length > 0') && page.includes('executionWorkspace.timeline.map(') && page.includes('entry.absoluteStart'))
check('renders unbound items when present',
  page.includes('executionWorkspace.unbound.length > 0') && page.includes('executionWorkspace.unbound.map('))

// 4. Read-only, additive — no mutation / action / client state / edit controls introduced.
check('no mutation / action / client state added',
  !page.includes('useState') && !page.includes('.insert(') && !page.includes('.update(') && !page.includes('approveProjectAction('))
check('no edit controls in the workspace UI (no button/input/form/onClick)',
  !page.includes('<button') && !page.includes('<input') && !page.includes('<form') && !page.includes('onClick='))

// 5. Existing Project Workspace content preserved.
check('existing content preserved (Project Approved / Project Overview / Budget Workspace / PublishPanel)',
  page.includes('Project Approved') && page.includes('Project Overview') &&
  page.includes('Budget Workspace') && page.includes('<PublishPanel'))

// 6. No new route / no page redesign markers (still the same default export server component).
check('still a single server-component page (no new route/export)', page.includes('export default async function ProjectDetailsPage'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

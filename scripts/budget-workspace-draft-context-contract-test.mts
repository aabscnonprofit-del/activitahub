// Budget Workspace draft context — UI contract test.
//
// Static, deterministic source analysis of the Budget Workspace page. No browser, no rendering, no
// production change. It verifies the read-only Draft Project context block was added and that the existing
// Budget Workspace behavior (auth, project load, budget load, the BudgetWorkspaceClient) is unchanged.
//
//   Run:  npx tsx scripts/budget-workspace-draft-context-contract-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/budget/page.tsx', import.meta.url), 'utf8')
// Prose wraps across lines in JSX; normalize whitespace for copy checks (structural checks use `page`).
const norm = page.replace(/\s+/g, ' ')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Draft Project context block — title + copy.
check('"Draft Project Budget" context title exists', page.includes('Draft Project Budget'))
check('context: this budget belongs to the current Draft Project',
  norm.includes('This budget belongs to the current Draft Project'))
check('context: review and refine before approving the Project',
  norm.includes('Review and refine this budget before approving the Project'))
check('context: approved budget becomes the source of truth for Execution',
  norm.includes('the Approved Project Budget becomes the source of truth for Execution'))

// 2. Existing Budget Workspace behavior is unchanged.
check('still renders the existing BudgetWorkspaceClient', page.includes('<BudgetWorkspaceClient'))
check('still loads project + budget (auth-scoped)',
  page.includes('getProject(') && page.includes('listBudgetsForProject(') && page.includes('getBudgetAction('))
check('existing "Budget Workspace" heading preserved', page.includes('Budget Workspace'))

// 3. Read-only context — no editing/approval/calculation control introduced on the page itself.
check('context is read-only — no button/input/form/onClick introduced on the page',
  !page.includes('<button') && !page.includes('<input') && !page.includes('<form') && !page.includes('onClick='))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

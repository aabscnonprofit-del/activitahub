// Budget single entry (IA cleanup #1) — contract test.
//
// Static, deterministic source analysis of the Project Workspace page. Verifies the duplicate Budget entry
// point is removed: the dedicated Budget Workspace entry section is the SINGLE live Budget entry, and the
// legacy "Manage this event" module grid no longer carries a Budget tile / second /budget link.
// Presentation only.
//
//   Run:  npx tsx scripts/budget-single-entry-contract-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Exactly one live Budget entry (one /budget href) — the dedicated Budget Workspace entry.
const budgetHrefs = (page.match(/dashboard\/projects\/\$\{projectId\}\/budget/g) || []).length
check('exactly one /budget href on the page (single live Budget entry)', budgetHrefs === 1)

// 2. The legacy module grid no longer has a Budget tile.
check('module grid no longer contains a Budget tile', !page.includes("key: 'budget'"))
check('module grid Budget tile did not just get downgraded to a false placeholder', !page.includes("name: 'Budget'"))

// 3. The dedicated Budget Workspace entry is kept (the single primary entry).
check('dedicated Budget Workspace entry section kept',
  page.includes('Budget Workspace') && page.includes('Open Budget Workspace') && page.includes('Budget Workspace available'))
check('Budget Workspace entry still links to the budget route', page.includes('/budget`'))

// 4. Module grid itself is intact (only the Budget tile removed).
check('"Manage this event" module grid kept', page.includes('Manage this event') && page.includes('modules.map('))
check('other module tiles kept (Plans, Vendors, Participants, Files)',
  page.includes("name: 'Plans'") && page.includes("name: 'Vendors'") &&
  page.includes("name: 'Participants'") && page.includes("name: 'Files'"))

// 5. Presentation only — no logic/mutation/action/state change.
check('presentation only — no mutation / action / client state introduced',
  !page.includes('.insert(') && !page.includes('.update(') && !page.includes('.delete(') &&
  !page.includes('.upsert(') && !page.includes('useState') && !page.includes('approveProjectAction('))

// 6. Approval / snapshot / Publish untouched.
check('approval + snapshot presentation intact', page.includes('Project Approved') && page.includes('Approved Project Snapshot'))
check('Publish unchanged (PublishPanel kept)', page.includes('<PublishPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

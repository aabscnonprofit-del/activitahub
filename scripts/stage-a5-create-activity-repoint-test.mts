// Stage A5 — the primary "Create activity" enters the Project pipeline (planner), not the legacy editor.
// Legacy activity creation stays reachable under the Classic sidebar group. Navigation only; no new create flow,
// no new entity, no marketplace/occurrence change.
//
//   Run:  npx tsx scripts/stage-a5-create-activity-repoint-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const home = read('../app/[locale]/dashboard/page.tsx')
const sidebar = read('../components/layout/DashboardSidebar.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// The primary create quick-action.
const createLine = home.split('\n').find((l) => l.includes("tc('quick.createActivity')")) ?? ''

check('primary "Create activity" no longer links to the legacy /dashboard/activities editor',
  createLine.length > 0 && !createLine.includes('/dashboard/activities'))
check('primary "Create activity" links to the Project/planner creation route (/dashboard/plans/new)',
  createLine.includes('/dashboard/plans/new'))
check('reuses the existing planner pipeline — no second create flow / no bare-Project insert added',
  !/createProject\(|from\('projects'\)\s*\.insert|from\('activities'\)\s*\.insert/.test(home))

// Legacy activity creation remains reachable, only under Classic.
check('legacy activity creation still reachable via the Classic "Activities" sidebar item',
  sidebar.includes("key: 'activities'") && sidebar.includes('legacyItems') && sidebar.includes('>Classic<'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

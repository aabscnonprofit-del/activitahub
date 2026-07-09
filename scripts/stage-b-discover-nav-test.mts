// Stage B — the previously-orphaned Project discovery (/activities, Local Activities over `projects`) becomes
// reachable from the organizer's primary navigation. Pure navigation; reuses the existing page; no new
// entity/feature/route.
//
//   Run:  npx tsx scripts/stage-b-discover-nav-test.mts

import { readFileSync } from 'node:fs'

const sidebar = readFileSync(new URL('../components/layout/DashboardSidebar.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../app/[locale]/activities/page.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

check('sidebar has a Discover item → the Project discovery /activities', sidebar.includes("key: 'discover'") && sidebar.includes('/${locale}/activities'))
check('Discover is in the PRIMARY (Project) group', /primaryItems[\s\S]*?discover[\s\S]*?\]/.test(sidebar))
check('reuses the existing Project-based discovery page (listMarketplaceActivities over projects)', page.includes('listMarketplaceActivities'))
check('no new route / entity introduced', !sidebar.includes('dashboard/discover') && !/from\('|insert\(/.test(sidebar))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

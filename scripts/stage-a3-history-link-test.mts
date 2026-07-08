// Stage A3 — the organizer sidebar exposes History (the existing Participant History page).
// Pure navigation: reuses /me/history; literal label (no new i18n key); no logic/data change.
//
//   Run:  npx tsx scripts/stage-a3-history-link-test.mts

import { readFileSync } from 'node:fs'

const sidebar = readFileSync(new URL('../components/layout/DashboardSidebar.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

check('sidebar has a History nav item pointing to /me/history', sidebar.includes('/me/history') && /key: 'history'/.test(sidebar))
check('History uses a literal label (no new i18n key required)', sidebar.includes("label: 'History'"))
check('reuses the existing history route (no new dashboard route)', !sidebar.includes('dashboard/history'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Stage A4 — sidebar makes Projects primary; legacy kept as a clearly-separated "Classic" group.
// Navigation only: nothing removed; no logic/data change.
//
//   Run:  npx tsx scripts/stage-a4-sidebar-primary-test.mts

import { readFileSync } from 'node:fs'

const s = readFileSync(new URL('../components/layout/DashboardSidebar.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Two groups: Primary (Project workflow) rendered before the "Classic" (legacy) group.
check('a primaryItems group exists (Project workflow)', s.includes('const primaryItems'))
check('a legacyItems group exists (compatibility)', s.includes('const legacyItems'))
check('Projects + History + Profile are in the primary group', /primaryItems[\s\S]*?projects[\s\S]*?history[\s\S]*?profile[\s\S]*?\]/.test(s))
check('a "Classic" separator is rendered before legacy items', s.includes('>Classic<') && s.indexOf('primaryItems.map') < s.indexOf('legacyItems.map'))

// Nothing removed — every legacy destination is still present.
check('all legacy items still present (nothing removed)',
  ['activities', 'plans', 'calendar', 'bookings', 'requests', 'proposals', 'clients', 'venues', 'vendors', 'workers', 'workerProfile', 'analytics'].every((k) => s.includes(`key: '${k}'`)))
check('billing (+ admin) still trail; non-organizer still billing-only', s.includes('trailingItems') && s.includes('isOrganizer'))
check('no logic/data mutation introduced', !/\.insert\(|\.update\(|from\('/.test(s))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

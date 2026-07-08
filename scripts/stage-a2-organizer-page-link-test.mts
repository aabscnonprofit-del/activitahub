// Stage A2 — the organizer area exposes "View My Organizer Page".
// Pure navigation: reuses the existing public Organizer Page via organizerHref; no logic/data change.
//
//   Run:  npx tsx scripts/stage-a2-organizer-page-link-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/profile/page.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

check('profile links to the public Organizer Page via organizerHref', page.includes('organizerHref(locale, { id: user.id'))
check('link labeled "View my organizer page"', page.includes('View my organizer page'))
check('no logic/data mutation added', !/\.insert\(|\.update\(|\.upsert\(/.test(page))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Stage A1 — Project list exposes a "View Public Activity" navigation entry per Project.
// Pure navigation: reuses the existing Public Activity Space (/p/[projectId]); no logic/data change.
//
//   Run:  npx tsx scripts/stage-a1-project-public-link-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/page.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

check('projects list links each row to the Public Activity Space (/p/[projectId])', page.includes('href={`/${locale}/p/${p.id}`}'))
check('link is labeled "View public activity"', page.includes('View public activity'))
check('a Public activity column header exists', page.includes('>Public activity<'))
// Pure navigation — no new data reads / mutations / entities introduced in this slice.
check('no logic/data change (no new from()/insert/update in the list page)', !/\.insert\(|\.update\(|\.upsert\(/.test(page))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

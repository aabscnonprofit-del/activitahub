// Stage D — final integration: plan→Project-workspace bridge; single primary in-dashboard create entry.
// Integration only; reuses existing routes/components; no new entity/logic.
//
//   Run:  npx tsx scripts/stage-d-final-integration-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const planDetail = read('../app/[locale]/dashboard/plans/[id]/page.tsx')
const home = read('../app/[locale]/dashboard/page.tsx')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Phase 2 — the plan detail bridges into the Project workspace (reuses the plan's project_id).
check('plan detail links to the Project workspace via project_id', planDetail.includes('/dashboard/projects/${res.data.project_id}') && planDetail.includes('res.data.project_id &&'))

// Phase 3 — one primary create entry in the dashboard (openOpe/plan-an-event duplicate removed).
// Check for the actual href template (the comment mentions the route in prose — strip line comments first).
const homeCode = home.replace(/\/\/.*$/gm, '')
check('dashboard quick actions no longer duplicate create via /plan-an-event', !homeCode.includes('quick.openOpe') && !homeCode.includes('/plan-an-event'))
check('dashboard retains a single primary create ("Create activity" → planner)', home.includes("tc('quick.createActivity')") && home.includes('/dashboard/plans/new'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

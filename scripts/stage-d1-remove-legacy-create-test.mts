// Stage D1 — the last legacy create entry is eliminated. The "New activity" buttons in ActivitiesClient route
// into the single Project pipeline (/dashboard/plans/new); creating legacy `activities` is no longer possible.
// Viewing/editing existing legacy activities is unchanged. No new form/planner/logic.
//
//   Run:  npx tsx scripts/stage-d1-remove-legacy-create-test.mts

import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'

const ac = readFileSync(new URL('../components/dashboard/ActivitiesClient.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// The create trigger is gone; the "New activity" buttons now link to the Project pipeline.
check('no button opens the legacy create modal (no setFormMode create)', !ac.includes("setFormMode({ type: 'create' })"))
// The "New activity" buttons now route to the Create Activity choice screen (Quick Activity vs Plan with AI) —
// still the single Project pipeline, never the legacy create modal.
check('"New activity" buttons route to the Create Activity choice screen', (ac.match(/\/\$\{locale\}\/dashboard\/activities\/new/g) ?? []).length >= 2)
check('editing existing legacy activities is preserved', ac.includes("setFormMode({ type: 'edit'"))

// The legacy ACTIVITY create action is `createActivity` (distinct from vendor/client/venue creates, which also
// use a setFormMode('create') pattern but write different entities). It must exist in no component other than
// ActivitiesClient — where it now survives only as the UI-unreachable edit-path ternary.
const compDir = new URL('../components/dashboard/', import.meta.url)
const otherActivityCreate = readdirSync(compDir)
  .filter((f) => f.endsWith('.tsx') && f !== 'ActivitiesClient.tsx')
  .filter((f) => readFileSync(new URL(f, compDir), 'utf8').includes('createActivity'))
check('createActivity (legacy activity create) referenced by no component other than ActivitiesClient', otherActivityCreate.length === 0)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

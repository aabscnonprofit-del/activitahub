// Planning → Project → Budget → Workspace transition — convergence contract test (Product First, Stage 2).
//
// Static, deterministic source analysis. It asserts that a successful Plan hands the organizer a Project that
// ALREADY has its Budget (Workspace opens ready-to-use, no manual "create budget" step) — by REUSING the
// existing Budget generation, with no new Budget/Project model, no duplicate creation path, and no change to
// the accepted Budget/Project architecture. Reads source only; changes nothing.
//
//   Run:  npx tsx scripts/planning-creates-project-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const planner = read('../lib/actions/planner.ts')
const budget = read('../lib/actions/budget.ts')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Project is created automatically through the SINGLE canonical path (no duplicate project-creation path).
check('Project created via resolveProjectForPlan (single canonical entry)', planner.includes('resolveProjectForPlan(supabase'))
check('no second/duplicate Project creation path in the planner', !planner.includes(".from('projects').insert") && !planner.includes(".from('projects')\n"))

// 2. The plan is persisted before the Budget is derived from it.
check('plan persisted (persistEventPlanV2) before budget derivation', planner.includes('persistEventPlanV2(supabase, activeProjectId, 1, plan)'))

// 3. Budget is created AUTOMATICALLY on a successful ('planned') plan — REUSING the existing generation.
check('budget auto-created only for a successful (planned) plan', planner.includes("if (activeProjectId && plan.feasibility.verdict === 'planned') {"))
check('reuses the EXISTING createBudgetForProjectAction (no rebuilt budget logic)',
  planner.includes('createBudgetForProjectAction({ projectId: activeProjectId, projectVersion: 1, currency:'))
check('reuses the existing USD default currency (no new currency decision)', planner.includes("currency: 'USD'"))

// 4. Idempotent: only when the Project has no Budget yet → re-generation never duplicates the Budget.
check('idempotency: reads existing budgets before creating', planner.includes('await listBudgetsForProject(supabase, activeProjectId)'))
check('idempotency: creates only when none exist', planner.includes('existing.length === 0'))

// 5. Best-effort: a Budget failure is logged and never blocks returning the Plan.
check('budget auto-creation is best-effort (logged, non-blocking)', planner.includes('failed to auto-create Budget for the Project'))

// 6. No NEW Budget model / workflow: the planner does NOT call the low-level budget creators directly — it
//    goes only through the existing action. And no new manual Budget workflow is introduced.
check('planner does not call the low-level budget store creators directly',
  !planner.includes('createBudgetForProject(') && !planner.includes('createBudgetLine('))
check('planner imports only the existing budget read + action (no new budget model)',
  planner.includes("import { listBudgetsForProject } from '@/lib/budget/store'") &&
  planner.includes("import { createBudgetForProjectAction } from '@/lib/actions/budget'"))

// 7. The reused Budget generation still mirrors one line per plan resource/role from the persisted plan.
check('budget generation still mirrors lines from the plan (eventPlanLineSpecs + getEventPlanV2)',
  budget.includes('eventPlanLineSpecs(') && budget.includes('getEventPlanV2('))
check('no second createBudgetForProjectAction definition (single budget-creation implementation)',
  (budget.match(/export async function createBudgetForProjectAction/g) ?? []).length === 1)

// 8. Workspace opens ready-to-use: the Project page already surfaces Project + Budget + Review + Approval.
check('workspace loads the Budget via the existing reader', page.includes('listBudgetsForProject(supabase, projectId)'))
check('workspace shows Budget + Review + Approve (ready-to-use, next action visible)',
  page.includes('Budget Workspace') && page.includes('Review Checklist') && page.includes('Approve Project'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Execution Runtime UI Slice 1 (interactive execution) — contract test.
//
// Behavioural tests of the pure evaluateTransition policy (valid / invalid / prerequisite / trigger), plus
// source-analysis of the server action (gates, evaluate, persist, reload) and the interactive checklist +
// page wiring. The action self-creates its Supabase client, so its flow is source-analysed; the rules it
// composes are proven pure here.
//
//   Run:  npx tsx scripts/execution-runtime-ui-slice-1-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import { initialExecutionStatus, withStatus, statusOf } from '../lib/execution/status'
import { evaluateTransition } from '../lib/actions/execution-transition'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  itinerary: [
    { id: 'itinerary:a', name: 'A', trigger: { kind: 'manual' } },
    { id: 'itinerary:m', name: 'M (manual, needs A)', trigger: { kind: 'manual' }, prerequisiteIds: ['itinerary:a'] },
    { id: 'itinerary:b', name: 'B (after_item, needs A)', trigger: { kind: 'after_item' }, prerequisiteIds: ['itinerary:a'] },
    { id: 'itinerary:t', name: 'T (relative_time)', trigger: { kind: 'relative_time' } },
  ],
  logistics: [],
} as unknown as EventPlanV2
const monitoring = buildExecutionMonitoringModel(plan)
const base = initialExecutionStatus(monitoring) // all pending

// 1. Valid transition succeeds.
{
  const r = evaluateTransition(monitoring, base, 'itinerary:a', 'active')
  check('valid transition succeeds (pending → active) and updates status', r.ok && statusOf(r.status, 'itinerary:a') === 'active')
}
// 2. Invalid transition rejected.
{
  const s = withStatus(base, 'itinerary:a', 'completed')
  const r = evaluateTransition(monitoring, s, 'itinerary:a', 'active')
  check('invalid transition rejected (completed → active)', !r.ok && r.reason === 'invalid_transition')
}
// 3. Prerequisite enforced (manual item whose prerequisite is incomplete).
{
  const r = evaluateTransition(monitoring, base, 'itinerary:m', 'active')
  check('prerequisite enforced (manual activation blocked while prereq incomplete)', !r.ok && r.reason === 'prerequisites_incomplete')
  const ready = withStatus(base, 'itinerary:a', 'completed')
  const r2 = evaluateTransition(monitoring, ready, 'itinerary:m', 'active')
  check('prerequisite satisfied → activation succeeds', r2.ok && statusOf(r2.status, 'itinerary:m') === 'active')
}
// 4. Trigger enforced.
{
  const rt = evaluateTransition(monitoring, base, 'itinerary:t', 'active')
  check('trigger enforced (relative_time not bound → rejected)', !rt.ok && rt.reason === 'trigger_not_bound')
  const rb = evaluateTransition(monitoring, base, 'itinerary:b', 'active')
  check('trigger enforced (after_item rejected while referenced item incomplete)', !rb.ok && rb.reason === 'after_item_incomplete')
}
// 5. Non-activation transition passes both gates.
{
  const r = evaluateTransition(monitoring, base, 'itinerary:a', 'blocked')
  check('non-activation transition (pending → blocked) passes', r.ok && statusOf(r.status, 'itinerary:a') === 'blocked')
}
// 6. Pure — input not mutated.
{
  const before = JSON.stringify(base)
  evaluateTransition(monitoring, base, 'itinerary:a', 'active')
  check('evaluateTransition never mutates the input status', JSON.stringify(base) === before)
}

// 7. Server action — gates, evaluate, persist, reload.
const action = read('../lib/actions/execution.ts')
check('action validates the target status (isMonitoringStatus)', action.includes('if (!isMonitoringStatus(to)) return { ok: false, reason: \'invalid_status\' }'))
check('action is owner + approval gated', action.includes("reason: 'not_authenticated'") && action.includes("reason: 'not_authorized'") && action.includes("reason: 'not_approved'"))
check('action evaluates via the runtime policy', action.includes('evaluateTransition(monitoring, status, itemId, to)'))
check('action persists only on success, then revalidates (reload)',
  action.indexOf('outcome.ok') < action.indexOf('persistExecutionStatus(supabase, projectId, occurrence.id, outcome.status)') &&
  action.includes('revalidatePath(`/${locale}/dashboard/projects/${projectId}`)'))
check('action falls back to pending default when no persisted status', action.includes('?? initialExecutionStatus(monitoring)'))

// 8. Interactive checklist + page wiring.
const comp = read('../components/workspace/ExecutionChecklist.tsx')
check('checklist component calls the server action and refreshes on success',
  comp.includes("'use client'") && comp.includes('updateExecutionStatusAction(projectId, itemId, to, locale)') && comp.includes('router.refresh()'))
check('checklist offers only base-allowed transitions (ALLOWED_TRANSITIONS)', comp.includes('ALLOWED_TRANSITIONS[item.status]'))
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('page renders the interactive checklist and stays read-only itself (no button/onClick in the page)',
  page.includes('<ExecutionChecklist') && page.includes('items={executionWorkspace.checklist}') && !page.includes('<button') && !page.includes('onClick='))

// 9. Boundaries — no Execution/Occurrence/Planning MODEL file touched (action-layer glue only).
const policy = read('../lib/actions/execution-transition.ts')
check('transition policy reuses existing execution helpers (adds no new rule)',
  policy.includes("from '@/lib/execution/triggers'") && policy.includes("from '@/lib/execution/prerequisites'"))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

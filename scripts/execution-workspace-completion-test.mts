// Execution Workspace completion — full Planning → Occurrence → Execution flow contract test.
//
// Drives the whole pipeline in-memory: EventPlanV2 → Execution snapshot (persisted status overlay) → Occurrence
// binding → timeline → Execution Workspace, and asserts the completed workspace: progress/completion, per-item
// readiness, status restoration from persisted state, and end-state completion when every item is completed.
// Plus source checks that the workspace UI surfaces progress + readiness and the explicit-occurrence copy.
//
//   Run:  npx tsx scripts/execution-workspace-completion-test.mts

import { readFileSync } from 'node:fs'
import { snapshotFromPersistedStatus } from '../lib/execution/persistence'
import { withStatus, emptyExecutionStatus, initialExecutionStatus } from '../lib/execution/status'
import { buildExecutionMonitoringModel } from '../lib/execution/monitoring'
import { bindOccurrence } from '../lib/occurrence/binding'
import { buildOccurrenceTimeline } from '../lib/occurrence/timeline'
import { buildExecutionWorkspace } from '../lib/organizer-workspace/execution-workspace'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const OCC_ID = 'occ-1'
const OCC_START = '2026-07-04T09:00:00.000Z'

// A realistic plan: a moment with a relative time + a prep logistic (prerequisite) + a manual moment.
const plan = {
  itinerary: [
    { id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30 } },
    { id: 'itinerary:toast', name: 'Toast', trigger: { kind: 'manual' }, prerequisiteIds: ['itinerary:ceremony'] },
  ],
  logistics: [{ id: 'logistic:setup', description: 'Set up chairs', forMomentId: 'itinerary:ceremony' }],
} as unknown as EventPlanV2

const monitoring = buildExecutionMonitoringModel(plan)

function workspaceFor(persisted: ReturnType<typeof emptyExecutionStatus> | null) {
  const snapshot = snapshotFromPersistedStatus(plan, persisted)
  const timeline = buildOccurrenceTimeline(bindOccurrence(snapshot, OCC_ID, OCC_START))
  return buildExecutionWorkspace(snapshot, timeline)
}

// 1. Fresh (no persisted status) → all pending, nothing complete, checklist + timeline present.
{
  const ws = workspaceFor(null)
  check('full flow builds a workspace (checklist from plan, timeline bound to occurrence)',
    ws.checklist.length === 3 && ws.timeline.length >= 1)
  check('progress starts at 0 / total, not complete', ws.progress.completed === 0 && ws.progress.total === 3 && ws.progress.isComplete === false)
  check('per-item readiness present for every checklist item', ws.checklist.every((i) => ws.itemReadiness[i.id] !== undefined))
}

// 2. Readiness reflects prerequisites: ceremony (has a prep logistic prereq) vs toast (needs ceremony).
{
  const ws = workspaceFor(null)
  check('Toast is blocked until Ceremony completes (prerequisites_incomplete)',
    ws.itemReadiness['itinerary:toast'].canStart === false && ws.itemReadiness['itinerary:toast'].blockedReason === 'prerequisites_incomplete')
}

// 3. Persisted status is RESTORED into the workspace (reload correctness).
{
  const persisted = withStatus(initialExecutionStatus(monitoring), 'itinerary:ceremony', 'active')
  const ws = workspaceFor(persisted)
  check('persisted status restored: Ceremony is active on reload', ws.checklist.find((i) => i.id === 'itinerary:ceremony')?.status === 'active')
  check('progress reflects restored status (1 active, 0 completed)', ws.readiness.active === 1 && ws.progress.completed === 0)
}

// 4. Completing every item → progress complete (the "completing execution" end state).
{
  let s = initialExecutionStatus(monitoring)
  for (const id of ['itinerary:ceremony', 'itinerary:toast', 'logistic:setup']) s = withStatus(s, id, 'completed')
  const ws = workspaceFor(s)
  check('all items completed → progress.isComplete', ws.progress.completed === ws.progress.total && ws.progress.total === 3 && ws.progress.isComplete === true)
  check('completed items report no activation block', ws.checklist.every((i) => ws.itemReadiness[i.id].canStart === false && ws.itemReadiness[i.id].blockedReason === null))
}

// 5. Occurrence binding places the timed moment on the absolute timeline (Planning relative → Occurrence absolute).
{
  const ws = workspaceFor(null)
  const ceremony = ws.timeline.find((e) => e.monitoringItemId === 'itinerary:ceremony')
  check('ceremony bound at occurrence start + 30m (09:30)', ceremony?.absoluteStart === '2026-07-04T09:30:00.000Z')
}

// 6. Workspace UI surfaces progress + readiness + explicit-occurrence copy (no "first occurrence").
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
const comp = read('../components/workspace/ExecutionChecklist.tsx')
check('page renders occurrence-level progress + completion', page.includes('executionWorkspace.progress.completed') && page.includes('executionWorkspace.progress.isComplete') && page.includes('Execution complete'))
check('page passes per-item readiness into the checklist', page.includes('readiness={executionWorkspace.itemReadiness}'))
check('checklist gates Start on readiness and shows the block reason', comp.includes("to === 'active' && r && !r.canStart") && comp.includes('BLOCK_LABEL'))
check('UI copy uses the explicit-occurrence model (no "first occurrence")', !/first occurrence/i.test(page))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

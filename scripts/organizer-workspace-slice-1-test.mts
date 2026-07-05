// Organizer Workspace Slice 1 (Execution Workspace read model) — contract test.
//
// Verifies buildExecutionWorkspace composes the Execution state (checklist) and the Occurrence timeline
// (entries + unbound) with readiness counts by status: composition, ordering, readiness tally, legacy
// compatibility, determinism, and unchanged Planning/Execution/Occurrence/projections.
//
//   Run:  npx tsx scripts/organizer-workspace-slice-1-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import { composeExecutionState } from '../lib/execution/state'
import { withStatus } from '../lib/execution/status'
import { bindOccurrence } from '../lib/occurrence/binding'
import { buildOccurrenceTimeline } from '../lib/occurrence/timeline'
import { buildExecutionWorkspace } from '../lib/organizer-workspace/execution-workspace'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const START = '2026-07-04T09:00:00.000Z'
const OCC = 'occ-1'

const plan = {
  itinerary: [
    { id: 'itinerary:a', name: 'A', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30, deadlineOffsetMinutes: 90 } },
    { id: 'itinerary:b', name: 'B', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30 } },
    { id: 'itinerary:c', name: 'C', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 60 } },
    { id: 'itinerary:z', name: 'Z', trigger: { kind: 'manual' } }, // unbound (no temporal)
  ],
  logistics: [],
} as unknown as EventPlanV2

const snap = buildExecutionSnapshot(plan)
const timeline = buildOccurrenceTimeline(bindOccurrence(snap, OCC, START))
const ws = buildExecutionWorkspace(snap, timeline)

// 1. Composition — checklist from state, timeline from timeline, unbound from timeline.
check('checklist = execution state items (all four, monitoring order)',
  ws.checklist.map((i) => i.id).join(',') === 'itinerary:a,itinerary:b,itinerary:c,itinerary:z')
check('checklist items carry status (default pending)', ws.checklist.every((i) => i.status === 'pending'))
check('timeline entries composed from the occurrence timeline', ws.timeline.map((e) => e.monitoringItemId).join(',') === 'itinerary:a,itinerary:b,itinerary:c')
check('unbound items carried through (z)', ws.unbound.length === 1 && ws.unbound[0].monitoringItemId === 'itinerary:z')

// 2. Ordering — timeline preserved (a@09:30, b@09:30 tie-break, c@10:00).
check('timeline preserves ordered entries with absolute times',
  ws.timeline[0].absoluteStart === '2026-07-04T09:30:00.000Z' && ws.timeline[2].absoluteStart === '2026-07-04T10:00:00.000Z' &&
  ws.timeline.every((e, i) => i === 0 || ws.timeline[i - 1].absoluteStart <= e.absoluteStart))

// 3. Readiness counts — all-pending baseline.
check('readiness has every status; all four items pending',
  ws.readiness.pending === 4 && ws.readiness.active === 0 && ws.readiness.blocked === 0 && ws.readiness.completed === 0)

// 3b. Readiness counts — mixed statuses (recompose state with a mixed status model).
const mixedStatus = withStatus(withStatus(withStatus(snap.status, 'itinerary:a', 'active'), 'itinerary:b', 'completed'), 'itinerary:c', 'blocked')
const mixedSnap = { ...snap, status: mixedStatus, state: composeExecutionState(snap.monitoring, mixedStatus) }
const wsMixed = buildExecutionWorkspace(mixedSnap, timeline)
check('readiness tallies mixed statuses correctly',
  wsMixed.readiness.active === 1 && wsMixed.readiness.completed === 1 && wsMixed.readiness.blocked === 1 && wsMixed.readiness.pending === 1)
check('readiness counts sum to the checklist length', Object.values(wsMixed.readiness).reduce((a, b) => a + b, 0) === wsMixed.checklist.length)

// 3c. Progress + per-item readiness (completion surface).
check('progress: total = checklist length, completed count matches, not complete when items remain',
  ws.progress.total === 4 && ws.progress.completed === 0 && ws.progress.isComplete === false &&
  wsMixed.progress.completed === 1 && wsMixed.progress.isComplete === false)
check('itemReadiness present for every checklist item', ws.checklist.every((i) => ws.itemReadiness[i.id] !== undefined))

// 4. Legacy compatibility — all unbound, all pending, empty timeline.
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lsnap = buildExecutionSnapshot(legacy)
const lws = buildExecutionWorkspace(lsnap, buildOccurrenceTimeline(bindOccurrence(lsnap, OCC, START)))
check('legacy: checklist all pending, timeline empty, unbound present, readiness pending=2',
  lws.checklist.length === 2 && lws.checklist.every((i) => i.status === 'pending') &&
  lws.timeline.length === 0 && lws.unbound.length === 2 && lws.readiness.pending === 2)

// 5. Determinism + inputs not mutated.
check('deterministic (same inputs → identical workspace)', JSON.stringify(buildExecutionWorkspace(snap, timeline)) === JSON.stringify(ws))
check('inputs not mutated (snapshot state + timeline entries order unchanged)',
  snap.state.items.map((i) => i.id).join(',') === 'itinerary:a,itinerary:b,itinerary:c,itinerary:z' &&
  timeline.entries.map((e) => e.monitoringItemId).join(',') === 'itinerary:a,itinerary:b,itinerary:c')

// 6. Reads only Execution/Occurrence models; touches no existing organizer-workspace file.
const src = readFileSync(new URL('../lib/organizer-workspace/execution-workspace.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('execution-workspace.ts imports only from lib/execution + lib/occurrence (no ./workspace/./types/./lifecycle)',
  !/from '\.\/(workspace|types|lifecycle)'/.test(codeOnly) &&
  (codeOnly.match(/@\/lib\/(execution|occurrence)/g) ?? []).length > 0)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

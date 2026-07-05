// Execution Snapshot Builder (Slice 4) — contract test.
//
// Verifies buildExecutionSnapshot runs the EventPlanV2 → monitoring → status → state pipeline deterministically
// and returns { monitoring, status, state }: builds from enriched and legacy plans, all items default to
// pending, and the monitoring/state item ids line up. Depends on nothing that mutates Planning/Occurrence.
//
//   Run:  npx tsx scripts/execution-snapshot-builder-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Enriched plan ──
const enriched = {
  itinerary: [
    { id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'relative_time' },
      temporal: { offsetFromStartMinutes: 0 }, prerequisiteIds: ['itinerary:arrival'] },
    { id: 'itinerary:meal', name: 'Meal' },
  ],
  logistics: [{ id: 'logistic:ceremony', description: 'Set up', forMomentId: 'itinerary:ceremony' }],
} as unknown as EventPlanV2

const snap = buildExecutionSnapshot(enriched)

// 1. Returns the three composed models.
check('snapshot returns monitoring, status, and state',
  !!snap.monitoring && !!snap.status && !!snap.state)
check('builds from enriched EventPlanV2 (3 items across moments + logistics)',
  snap.monitoring.items.length === 3 && snap.state.items.length === 3)

// 2. All items default to pending.
check('every state item defaults to pending', snap.state.items.every((i) => i.status === 'pending'))
check('status model has every monitoring id set to pending',
  snap.monitoring.items.every((it) => snap.status.byItemId[it.id] === 'pending'))

// 3. Monitoring and state item ids match (same ids, same order).
check('monitoring and state item ids match in order',
  JSON.stringify(snap.monitoring.items.map((i) => i.id)) === JSON.stringify(snap.state.items.map((i) => i.id)))
check('state items carry the monitoring fields (id/source/label/trigger/prerequisiteIds)',
  snap.state.items[0].source === 'itinerary_moment' &&
  snap.state.items.find((i) => i.id === 'itinerary:ceremony')!.trigger.kind === 'relative_time' &&
  snap.state.items.find((i) => i.id === 'itinerary:ceremony')!.prerequisiteIds.includes('logistic:ceremony'))

// 4. Determinism.
check('builder is deterministic (same plan → identical snapshot)',
  JSON.stringify(buildExecutionSnapshot(enriched)) === JSON.stringify(snap))

// 5. Legacy plan builds too (fallback ids, defaults).
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const lsnap = buildExecutionSnapshot(legacy)
check('builds from legacy EventPlanV2 with fallback ids',
  lsnap.state.items.map((i) => i.id).sort().join(',') === 'itinerary:#0,logistic:#0')
check('legacy: all items default to pending', lsnap.state.items.every((i) => i.status === 'pending'))
check('legacy: monitoring and state ids match',
  JSON.stringify(lsnap.monitoring.items.map((i) => i.id)) === JSON.stringify(lsnap.state.items.map((i) => i.id)))

// 6. Planning dependency is TYPE-ONLY (the builder consumes the EventPlanV2 type; it changes no Planning code).
const src = readFileSync(new URL('../lib/execution/snapshot.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const planningImports = codeOnly.match(/^import[^\n]*@\/lib\/planning[^\n]*$/gm) ?? []
check('snapshot.ts imports only a TYPE from Planning; nothing from Occurrence',
  planningImports.every((l) => /^import type /.test(l)) && !/occurrence/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

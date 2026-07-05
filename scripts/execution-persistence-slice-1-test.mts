// Execution Persistence Slice 1 — contract test.
//
// Source-analysis for the migration + storage layer (no live DB), plus runtime tests of the pure persisted-
// status snapshot builder: persistence shape, reload/default behaviour, legacy default (pending), runtime
// transitions round-trip, snapshot consumes persisted status, and unchanged Planning/Occurrence/Workspace.
//
//   Run:  npx tsx scripts/execution-persistence-slice-1-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import { initialExecutionStatus, withStatus, statusOf } from '../lib/execution/status'
import { applyTransition } from '../lib/execution/runtime'
import { toExecutionStatusRow, snapshotFromPersistedStatus } from '../lib/execution/persistence'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const migration = read('../supabase/migrations/050_project_execution_status.sql').replace(/--.*$/gm, '')
const store = read('../lib/execution/persistence.ts')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Migration — table, keys, JSONB status, unique, updated_at trigger, owner RLS.
check('table project_execution_status created', /CREATE TABLE IF NOT EXISTS project_execution_status/i.test(migration))
check('project_id + occurrence_id FKs (cascade)',
  /project_id\s+UUID NOT NULL REFERENCES projects\(id\) ON DELETE CASCADE/i.test(migration) &&
  /occurrence_id\s+UUID NOT NULL REFERENCES occurrences\(id\) ON DELETE CASCADE/i.test(migration))
check('status is JSONB (the byItemId map)', /status\s+JSONB NOT NULL/i.test(migration))
check('unique (project_id, occurrence_id) for upsert', /UNIQUE \(project_id, occurrence_id\)/i.test(migration))
check('updated_at maintained by the shared trigger', /EXECUTE FUNCTION update_updated_at_column\(\)/i.test(migration))
check('owner-only RLS via projects.owner_id',
  /ENABLE ROW LEVEL SECURITY/i.test(migration) && /owner_id = auth\.uid\(\)/i.test(migration))

// 2. Store — upsert on the key, select, null-on-missing, error surfacing.
check('persist upserts on (project_id, occurrence_id)',
  store.includes("from('project_execution_status')") && store.includes("onConflict: 'project_id,occurrence_id'"))
check('get selects status, keyed by project + occurrence, maybeSingle', /select\('status'\)[\s\S]*eq\('project_id'[\s\S]*eq\('occurrence_id'[\s\S]*maybeSingle/.test(store))
check('get returns null when no row (legacy fallback)', store.includes('if (!data) return null'))
check('store surfaces Supabase errors (never swallows)', /throw new Error\(`persistExecutionStatus failed/.test(store) && /throw new Error\(`getExecutionStatus failed/.test(store))
check('store sets no clock (updated_at handled by DB trigger)', !store.includes('Date.now') && !/new Date\(/.test(store))

// 3. Pure mapping — model -> row.
const status = withStatus(withStatus(initialExecutionStatus(buildExecutionSnapshot({ itinerary: [{ id: 'x', name: 'X' }], logistics: [] } as unknown as EventPlanV2).monitoring), 'x', 'active'), 'y', 'blocked')
const row = toExecutionStatusRow('proj-1', 'occ-1', status)
check('toExecutionStatusRow maps byItemId verbatim',
  row.project_id === 'proj-1' && row.occurrence_id === 'occ-1' && row.status.x === 'active' && row.status.y === 'blocked')

// 4. snapshotFromPersistedStatus — persisted consumed; null → default pending (legacy).
const plan = { itinerary: [{ id: 'itinerary:a', name: 'A' }, { id: 'itinerary:b', name: 'B' }], logistics: [] } as unknown as EventPlanV2
const legacySnap = snapshotFromPersistedStatus(plan, null)
check('null persisted status → default pending (existing projects keep working)',
  legacySnap.state.items.every((i) => i.status === 'pending'))

const persisted = withStatus(initialExecutionStatus(buildExecutionSnapshot(plan).monitoring), 'itinerary:a', 'completed')
const loadedSnap = snapshotFromPersistedStatus(plan, persisted)
check('snapshot consumes persisted status',
  statusOf(loadedSnap.status, 'itinerary:a') === 'completed' &&
  loadedSnap.state.items.find((i) => i.id === 'itinerary:a')!.status === 'completed' &&
  loadedSnap.state.items.find((i) => i.id === 'itinerary:b')!.status === 'pending')

// 5. Runtime transitions round-trip through persistence (apply → persist-shape → reload-shape).
const t = applyTransition(persisted, 'itinerary:b', 'active')
check('runtime transition applies, and a snapshot from the transitioned status reflects it',
  t.ok && snapshotFromPersistedStatus(plan, t.status).state.items.find((i) => i.id === 'itinerary:b')!.status === 'active')

// 6. Determinism.
check('snapshotFromPersistedStatus is deterministic',
  JSON.stringify(snapshotFromPersistedStatus(plan, persisted)) === JSON.stringify(loadedSnap))

// 7. Reuses existing Execution models; touches no Planning/Occurrence/Workspace code.
const codeOnly = store.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('persistence.ts imports the Planning EventPlanV2 as a TYPE only; nothing from Occurrence/Workspace',
  /import type \{ EventPlanV2 \}/.test(codeOnly) &&
  !/from '@\/lib\/occurrence/.test(codeOnly) && !/organizer-workspace/.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

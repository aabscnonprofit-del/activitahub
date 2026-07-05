// Organizer Workspace Integration Slice 2 — contract test.
//
// Behavioural tests of loadOrganizerExecutionWorkspace via a mock Supabase client: an approved project loads
// a real workspace composed from live plan + occurrence + persisted status; persisted status is used when
// present and defaults to pending when absent; occurrence binding produces a timeline; unapproved / no-plan
// return null. Plus a boundary check that no protected model file is touched.
//
//   Run:  npx tsx scripts/organizer-workspace-integration-slice-2-test.mts

import { readFileSync } from 'node:fs'
import { loadOrganizerExecutionWorkspace } from '../lib/organizer-workspace/load-execution-workspace'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const APPROVED_AT = '2026-07-04T09:00:00.000Z'
const APPROVED = { id: 'p', owner_id: 'u', status: 'active', current_step: 'plan_ready', approved_at: APPROVED_AT, approved_by: 'u', created_at: 'c', updated_at: 'u' }
const PLAN = { itinerary: [{ id: 'itinerary:a', name: 'A', temporal: { offsetFromStartMinutes: 30 } }, { id: 'itinerary:b', name: 'B' }], logistics: [] }
const OCC = { id: 'occ-1', project_id: 'p', title: null, starts_at: APPROVED_AT, ends_at: null, location: null, capacity: null, price_cents: null, status: 'scheduled', created_at: 'c', updated_at: 'u' }

// Mock: from(table) resolves chained .eq()/.order()/.limit() to a terminal single/maybeSingle from cfg[table].
function mockClient(cfg: Record<string, { select?: unknown; insert?: unknown }>) {
  const client = {
    from(table: string) {
      const sel = cfg[table]?.select ?? { data: null }
      const term: Record<string, unknown> = { single: async () => sel, maybeSingle: async () => sel }
      term.eq = () => term; term.order = () => term; term.limit = () => term
      return {
        select: () => term,
        insert: () => ({ select: () => ({ single: async () => cfg[table]?.insert ?? { data: null, error: null } }) }),
      }
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any
}

// 1. Approved + plan + occurrence + PERSISTED status → real workspace.
{
  const client = mockClient({
    projects: { select: { data: APPROVED } },
    project_event_plans_v2: { select: { data: { plan: PLAN } } },
    occurrences: { select: { data: OCC } },
    project_execution_status: { select: { data: { status: { 'itinerary:a': 'active' } } } },
  })
  const ws = await loadOrganizerExecutionWorkspace(client, 'p')
  check('approved project loads an execution workspace', ws !== null)
  check('checklist composed from the plan (a, b)', !!ws && ws.checklist.map((i) => i.id).join(',') === 'itinerary:a,itinerary:b')
  check('PERSISTED status is used (a=active) and missing defaults to pending (b)',
    !!ws && ws.checklist.find((i) => i.id === 'itinerary:a')!.status === 'active' && ws.checklist.find((i) => i.id === 'itinerary:b')!.status === 'pending')
  check('occurrence binding produces a timeline entry (a @ start+30 = 09:30)',
    !!ws && ws.timeline.length === 1 && ws.timeline[0].monitoringItemId === 'itinerary:a' && ws.timeline[0].absoluteStart === '2026-07-04T09:30:00.000Z')
  check('unbound item preserved (b: no temporal)', !!ws && ws.unbound.some((u) => u.monitoringItemId === 'itinerary:b'))
  check('readiness reflects persisted status (active:1, pending:1)', !!ws && ws.readiness.active === 1 && ws.readiness.pending === 1)
}

// 2. Missing persisted status → default pending (existing approved projects without execution state work).
{
  const client = mockClient({
    projects: { select: { data: APPROVED } },
    project_event_plans_v2: { select: { data: { plan: PLAN } } },
    occurrences: { select: { data: OCC } },
    project_execution_status: { select: { data: null } }, // no persisted row
  })
  const ws = await loadOrganizerExecutionWorkspace(client, 'p')
  check('missing persisted status → all pending (backward compatible)', !!ws && ws.checklist.every((i) => i.status === 'pending') && ws.readiness.pending === 2)
}

// 3. No EventPlanV2 → null.
{
  const client = mockClient({ projects: { select: { data: APPROVED } }, project_event_plans_v2: { select: { data: null } } })
  check('no plan → workspace is null', (await loadOrganizerExecutionWorkspace(client, 'p')) === null)
}

// 4. Unapproved project → null (only approved projects have an execution workspace).
{
  const client = mockClient({ projects: { select: { data: { ...APPROVED, approved_at: null } } } })
  check('unapproved project → workspace is null', (await loadOrganizerExecutionWorkspace(client, 'p')) === null)
}

// 5. Boundary — the loader touches no protected MODEL file (execution/occurrence models, workspace model, planning).
const src = readFileSync(new URL('../lib/organizer-workspace/load-execution-workspace.ts', import.meta.url), 'utf8')
check('loader composes existing services (imports execution/occurrence/planning + the unchanged workspace model)',
  /from '@\/lib\/execution\/persistence'/.test(src) && /from '@\/lib\/occurrence\/(binding|timeline|store)'/.test(src) &&
  /from '\.\/execution-workspace'/.test(src))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

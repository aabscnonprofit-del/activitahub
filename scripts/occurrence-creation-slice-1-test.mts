// Occurrence Creation Slice 1 — contract test.
//
// Behavioural tests of createOrGetOccurrence via a mock Supabase client (create for approved project, reuse
// existing, reject unapproved / not-found / insert-error), plus source-analysis of the dedup migration and
// the boundary imports. No live DB.
//
//   Run:  npx tsx scripts/occurrence-creation-slice-1-test.mts

import { readFileSync } from 'node:fs'
import { createOrGetOccurrence } from '../lib/occurrence/store'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const APPROVED = { id: 'proj-1', owner_id: 'u', status: 'active', current_step: 'plan_ready', approved_at: '2026-07-04T00:00:00.000Z', approved_by: 'u', created_at: 'c', updated_at: 'u' }
const UNAPPROVED = { ...APPROVED, approved_at: null }
const START = '2026-07-05T09:00:00.000Z'

// Minimal mock matching the exact chains: projects.select.eq.single; occurrences.select.eq.eq.maybeSingle;
// occurrences.insert.select.single.
function mockClient(cfg: { project: unknown; existing?: unknown; inserted?: unknown; insertError?: unknown }) {
  const captured: { insertRow?: Record<string, unknown> } = {}
  const client = {
    from(table: string) {
      if (table === 'projects') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: cfg.project ?? null }) }) }) }
      }
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cfg.existing ?? null }) }) }) }),
        insert: (row: Record<string, unknown>) => {
          captured.insertRow = row
          return { select: () => ({ single: async () => ({ data: cfg.inserted ?? null, error: cfg.insertError ?? null }) }) }
        },
      }
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, captured }
}

// 1. Approved project, no existing occurrence → created.
{
  const { client, captured } = mockClient({ project: APPROVED, existing: null, inserted: { id: 'occ-new', project_id: 'proj-1', starts_at: START, title: null, ends_at: null, location: null, capacity: null, price_cents: null, status: 'scheduled', created_at: 'c', updated_at: 'u' } })
  const r = await createOrGetOccurrence(client, { projectId: 'proj-1', startsAt: START })
  check('approved project + no existing → occurrence created', r.ok === true && r.created === true && r.occurrence.id === 'occ-new')
  check('insert carries project_id + starts_at', captured.insertRow?.project_id === 'proj-1' && captured.insertRow?.starts_at === START)
}

// 2. Approved project, existing occurrence → reused (no insert).
{
  const { client, captured } = mockClient({ project: APPROVED, existing: { id: 'occ-existing', project_id: 'proj-1', starts_at: START, title: null, ends_at: null, location: null, capacity: null, price_cents: null, status: 'scheduled', created_at: 'c', updated_at: 'u' } })
  const r = await createOrGetOccurrence(client, { projectId: 'proj-1', startsAt: START })
  check('existing occurrence reused (created:false, no insert)', r.ok === true && r.created === false && r.occurrence.id === 'occ-existing' && captured.insertRow === undefined)
}

// 3. Unapproved project → rejected (no occurrence created).
{
  const { client, captured } = mockClient({ project: UNAPPROVED })
  const r = await createOrGetOccurrence(client, { projectId: 'proj-1', startsAt: START })
  check('unapproved project rejected: project_not_approved', r.ok === false && r.reason === 'project_not_approved')
  check('unapproved project: no insert attempted', captured.insertRow === undefined)
}

// 4. Project not found → rejected.
{
  const { client } = mockClient({ project: null })
  const r = await createOrGetOccurrence(client, { projectId: 'nope', startsAt: START })
  check('missing project rejected: project_not_found', r.ok === false && r.reason === 'project_not_found')
}

// 5. Insert error → typed error (not a thrown crash).
{
  const { client } = mockClient({ project: APPROVED, existing: null, inserted: null, insertError: { message: 'boom' } })
  const r = await createOrGetOccurrence(client, { projectId: 'proj-1', startsAt: START })
  check('insert failure returns { ok:false, reason:error }', r.ok === false && r.reason === 'error')
}

// 6. Migration — dedup uniqueness on (project_id, starts_at).
const migration = readFileSync(new URL('../supabase/migrations/051_occurrence_project_start_unique.sql', import.meta.url), 'utf8').replace(/--.*$/gm, '')
check('migration adds a UNIQUE index on occurrences (project_id, starts_at)',
  /CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*ON occurrences \(project_id, starts_at\)/i.test(migration))

// 7. Boundaries — store depends only on the Project root store + supabase type; nothing from Planning/
//    Execution/Occurrence-models/Workspace.
const store = readFileSync(new URL('../lib/occurrence/store.ts', import.meta.url), 'utf8')
const codeOnly = store.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('store imports only @/lib/projects/store + the supabase type (no planning/execution/binding/timeline/workspace)',
  /from '@\/lib\/projects\/store'/.test(codeOnly) &&
  !/from '@\/lib\/(planning|execution|organizer-workspace)'/.test(codeOnly) &&
  !/from '\.\/(binding|timeline)'/.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

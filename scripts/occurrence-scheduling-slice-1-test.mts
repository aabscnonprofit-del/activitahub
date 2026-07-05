// Occurrence Scheduling Slice 1 (explicit current/selected occurrence) — contract test.
//
// Proves the revised model: NO "first occurrence" in the public API; the CURRENT occurrence is resolved
// explicitly (sole occurrence, or by id); MULTIPLE occurrences without a selection are ambiguous (never
// implicitly picked) so execution resolution does not break; the existing approved_at placeholder still works;
// and the occurrence id is preserved so execution status (keyed by occurrence_id) survives rescheduling.
//
//   Run:  npx tsx scripts/occurrence-scheduling-slice-1-test.mts

import { readFileSync } from 'node:fs'
import { resolveCurrentOccurrence, setCurrentOccurrenceStart } from '../lib/occurrence/store'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const APPROVED_AT = '2026-07-04T09:00:00.000Z'
const APPROVED = { id: 'p', owner_id: 'u', status: 'active', current_step: 'plan_ready', approved_at: APPROVED_AT, approved_by: 'u', created_at: 'c', updated_at: 'u' }
const occ = (id: string, starts: string) => ({ id, project_id: 'p', title: null, starts_at: starts, ends_at: null, location: null, capacity: null, price_cents: null, status: 'scheduled', created_at: id, updated_at: id })
const PLACEHOLDER = occ('occ-1', APPROVED_AT)
const NEW_START = '2026-08-15T18:30:00.000Z'

// Mock: projects.select.eq.single; occurrences.select.eq.order is thenable → {data: list}; .eq.eq.maybeSingle
// → dedup; .insert.select.single → inserted; .update.eq.select.single → updated.
function mockClient(cfg: { project?: unknown; occurrences?: unknown[]; dedup?: unknown; inserted?: unknown; updated?: unknown; updateError?: unknown }) {
  const captured: { updateRow?: Record<string, unknown>; updateId?: unknown } = {}
  const client = {
    from(table: string) {
      if (table === 'projects') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: cfg.project ?? null }) }) }) }
      }
      const b: Record<string, unknown> = {}
      b.eq = () => b
      b.order = () => b
      b.then = (resolve: (v: unknown) => void) => resolve({ data: cfg.occurrences ?? [], error: null })
      b.maybeSingle = async () => ({ data: cfg.dedup ?? null })
      b.single = async () => ({ data: cfg.dedup ?? null })
      return {
        select: () => b,
        insert: () => ({ select: () => ({ single: async () => ({ data: cfg.inserted ?? null, error: cfg.inserted ? null : { message: 'x' } }) }) }),
        update: (row: Record<string, unknown>) => {
          captured.updateRow = row
          return { eq: (_c: string, id: unknown) => { captured.updateId = id; return { select: () => ({ single: async () => ({ data: cfg.updated ?? null, error: cfg.updateError ?? null }) }) } } }
        },
      }
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, captured }
}

// 1. Existing placeholder (sole occurrence) resolves as the current occurrence.
{
  const { client } = mockClient({ project: APPROVED, occurrences: [PLACEHOLDER] })
  const r = await resolveCurrentOccurrence(client, 'p')
  check('sole placeholder occurrence resolves as current (backward compatible)', r.reason === 'resolved' && r.occurrence?.id === 'occ-1')
}

// 2. Update the current placeholder to a real start — id preserved (status stays keyed by occurrence_id).
{
  const { client, captured } = mockClient({ project: APPROVED, occurrences: [PLACEHOLDER], updated: { ...PLACEHOLDER, starts_at: NEW_START } })
  const r = await setCurrentOccurrenceStart(client, 'p', NEW_START)
  check('placeholder occurrence updated to the real start, occurrence id preserved (occ-1)',
    r.ok === true && r.occurrence.starts_at === NEW_START && r.occurrence.id === 'occ-1' && captured.updateId === 'occ-1' && captured.updateRow?.starts_at === NEW_START)
}

// 3. MULTIPLE occurrences without a selection → ambiguous (execution resolution does NOT break, no implicit first).
{
  const { client } = mockClient({ project: APPROVED, occurrences: [PLACEHOLDER, occ('occ-2', NEW_START)] })
  const r = await resolveCurrentOccurrence(client, 'p')
  check('multiple occurrences without id → ambiguous (never implicitly the first)', r.reason === 'ambiguous' && r.occurrence === null)
  const { client: c2, captured } = mockClient({ project: APPROVED, occurrences: [PLACEHOLDER, occ('occ-2', NEW_START)] })
  const s = await setCurrentOccurrenceStart(c2, 'p', NEW_START)
  check('scheduling multiple without id refuses (ambiguous_occurrence); no blind write', !s.ok && s.reason === 'ambiguous_occurrence' && captured.updateRow === undefined)
}

// 4. MULTIPLE occurrences WITH an explicit id → that specific occurrence is scheduled.
{
  const { client, captured } = mockClient({ project: APPROVED, occurrences: [PLACEHOLDER, occ('occ-2', NEW_START)], updated: { ...occ('occ-2', '2026-09-01T12:00:00.000Z') } })
  const r = await setCurrentOccurrenceStart(client, 'p', '2026-09-01T12:00:00.000Z', { occurrenceId: 'occ-2' })
  check('explicit occurrence id selects that occurrence among multiple', r.ok && r.occurrence.id === 'occ-2' && captured.updateId === 'occ-2')
}

// 5. NONE + createAtIfMissing → created as the current occurrence (create-or-get preserved).
{
  const { client } = mockClient({ project: APPROVED, occurrences: [], dedup: null, inserted: PLACEHOLDER })
  const r = await resolveCurrentOccurrence(client, 'p', { createAtIfMissing: APPROVED_AT })
  check('no occurrence + createAtIfMissing → created via create-or-get', r.reason === 'created' && r.occurrence?.id === 'occ-1')
}

// 6. Unapproved / missing project rejected by the scheduling write.
{
  const { client, captured } = mockClient({ project: { ...APPROVED, approved_at: null } })
  const r = await setCurrentOccurrenceStart(client, 'p', NEW_START)
  check('unapproved project cannot schedule (project_not_approved); no write', !r.ok && r.reason === 'project_not_approved' && captured.updateRow === undefined)
  const { client: c2 } = mockClient({ project: null })
  const r2 = await setCurrentOccurrenceStart(c2, 'p', NEW_START)
  check('missing project rejected (project_not_found)', !r2.ok && r2.reason === 'project_not_found')
}

// 7. Public API — the "first occurrence" surface is GONE; the current/selected surface is present.
const store = read('../lib/occurrence/store.ts')
check('no "first occurrence" assumption remains in the public API (no getFirst/getOrCreateFirst/setFirst exports)',
  !/export (async function|function|const) getFirstOccurrenceForProject/.test(store) &&
  !/export (async function|function|const) getOrCreateFirstOccurrence/.test(store) &&
  !/export (async function|function|const) setFirstOccurrenceStart/.test(store))
check('explicit current/selected occurrence resolution is the public API',
  /export async function resolveCurrentOccurrence/.test(store) && /export async function setCurrentOccurrenceStart/.test(store) &&
  store.includes("reason: 'ambiguous'"))

// 8. Consumers resolve via the explicit resolver; status stays keyed by occurrence_id.
const loader = read('../lib/organizer-workspace/load-execution-workspace.ts')
const exec = read('../lib/actions/execution.ts')
const action = read('../lib/actions/occurrence.ts')
check('loader resolves via resolveCurrentOccurrence (no getFirst/getOrCreateFirst)',
  loader.includes('resolveCurrentOccurrence(supabase, projectId, { createAtIfMissing: project.approved_at })') && !loader.includes('First'))
check('execution status action resolves via resolveCurrentOccurrence and persists keyed by occurrence.id',
  exec.includes('resolveCurrentOccurrence(supabase, projectId, { createAtIfMissing: project.approved_at })') &&
  exec.includes('persistExecutionStatus(supabase, projectId, occurrence.id, outcome.status)'))
check('scheduling action delegates to setCurrentOccurrenceStart with the explicit occurrenceId',
  action.includes('setCurrentOccurrenceStart(supabase, projectId, startsAtIso, { occurrenceId })'))

// 9. UI updates the explicitly-selected occurrence id (not "first"); page passes it.
const comp = read('../components/workspace/OccurrenceScheduler.tsx')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('scheduler submits the explicit occurrenceId to the action',
  comp.includes('scheduleOccurrenceAction(projectId, iso, locale, occurrenceId)') && !comp.includes('First'))
check('page passes the resolved current occurrence id + start to the scheduler',
  page.includes('resolveCurrentOccurrence(supabase, projectId)') &&
  page.includes('occurrenceId={currentOccurrence?.id}') && page.includes('currentStartIso={currentOccurrence?.starts_at}') &&
  !page.includes('First'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

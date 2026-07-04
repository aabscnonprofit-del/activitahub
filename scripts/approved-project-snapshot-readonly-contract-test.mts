// Approved Project Snapshot — read-only surfacing — contract test.
//
// Static, deterministic source analysis. Verifies a READ-ONLY reader for the Approved Project Snapshot
// artifact exists (SELECT only, metadata only — no frozen EventPlanV2 JSONB), and that the Project Workspace
// page surfaces it read-only inside the existing Approved presentation, with no edit controls / mutation /
// action / state, and Publish / Execution / Revision untouched.
//
//   Run:  npx tsx scripts/approved-project-snapshot-readonly-contract-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const store = read('../lib/projects/store.ts')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Store reader — exists, read-only, metadata only.
const readerIdx = store.indexOf('export async function getApprovedProjectSnapshot')
const reader = readerIdx !== -1 ? store.slice(readerIdx, readerIdx + 600) : ''
check('getApprovedProjectSnapshot reader exists', readerIdx !== -1)
check('reader signature has projectVersion = 1 default', /getApprovedProjectSnapshot\([\s\S]*projectVersion = 1/.test(store))
check('reader queries project_approved_snapshots', reader.includes("from('project_approved_snapshots')"))
check('reader is a SELECT (no insert/update/delete/upsert)',
  reader.includes('.select(') &&
  !reader.includes('.insert(') && !reader.includes('.update(') && !reader.includes('.delete(') && !reader.includes('.upsert('))
check('reader is metadata only — does NOT select the frozen snapshot JSONB', !/\.select\('[^']*snapshot/.test(reader))
check('reader returns row or null (maybeSingle)', reader.includes('.maybeSingle()'))

// 2. Page surfaces it read-only (loaded only when approved).
check('page imports getApprovedProjectSnapshot', page.includes('getApprovedProjectSnapshot'))
check('page loads the snapshot only once approved',
  page.includes('approvedAt ? await getApprovedProjectSnapshot(supabase, projectId) : null'))
check('snapshot surfaced inside the Approved presentation (gated on approvedSnapshot)',
  page.includes('{approvedSnapshot && ('))
check('confirms the artifact exists ("Approved Project Snapshot" + Captured)',
  page.includes('Approved Project Snapshot') && page.includes('"Captured"'))
check('shows snapshot approved_at + created_at (human-formatted)',
  page.includes('formatDate(approvedSnapshot.approved_at)') && page.includes('formatDate(approvedSnapshot.created_at)'))
check('shows approved_by from the row (human-friendly, no raw UUID)',
  page.includes('approvedSnapshot.approved_by'))

// 3. No edit controls / mutation / action / state introduced by this read-only view.
check('no edit controls in the snapshot view (no button/input/form/onClick on the page)',
  !page.includes('<button') && !page.includes('<input') && !page.includes('<form') && !page.includes('onClick='))
check('no mutation / new action / client state on the page',
  !page.includes('.insert(') && !page.includes('.update(') && !page.includes('.delete(') &&
  !page.includes('.upsert(') && !page.includes('useState') && !page.includes('approveProjectAction('))

// 4. Publish / Execution / Revision untouched.
check('Publish unchanged (PublishPanel kept)', page.includes('<PublishPanel'))
check('no Execution / Revision logic introduced', !/(startExecution|execution started|revisionOf|createRevision)/i.test(page))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

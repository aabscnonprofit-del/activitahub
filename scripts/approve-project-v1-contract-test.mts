// Approve Project V1 — contract test (separate immutable snapshot artifact; EventPlanV2-only).
//
// Static, deterministic source analysis (no browser, no DB) verifying the truthful Approve Project:
// approval STATE on projects, the Approved Project Snapshot as a SEPARATE immutable artifact table (not a
// column on projects), the snapshot created BEFORE approval is recorded, idempotency, EventPlanV2 capture,
// and that status / current_step / Publish / Execution / Revision are untouched.
//
//   Run:  npx tsx scripts/approve-project-v1-contract-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const migration = read('../supabase/migrations/049_project_approve_v1.sql')
const store = read('../lib/projects/store.ts')
const action = read('../lib/actions/projects.ts')
const component = read('../components/projects/ApproveProjectPanel.tsx')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
const migrationSql = migration.replace(/--.*$/gm, '') // statements only (strip SQL comments)

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Migration — approval state on projects; NO snapshot column on projects; separate immutable artifact.
check('projects gains approved_at + approved_by',
  /ALTER TABLE projects[\s\S]*approved_at\s+TIMESTAMPTZ[\s\S]*approved_by\s+UUID/i.test(migrationSql))
check('no snapshot column added to projects', !/ADD COLUMN[^;]*(snapshot|approved_snapshot)/i.test(migrationSql))
check('separate Approved Project Snapshot artifact table exists',
  /CREATE TABLE IF NOT EXISTS project_approved_snapshots/i.test(migrationSql))
check('artifact has required columns (id, project_id, approved_by, approved_at, snapshot, created_at)',
  /project_approved_snapshots[\s\S]*\bid\b[\s\S]*project_id[\s\S]*approved_by[\s\S]*approved_at[\s\S]*snapshot\s+JSONB[\s\S]*created_at/i.test(migrationSql))
check('artifact is immutable (insert-only: no updated_at trigger)', !/project_approved_snapshots_updated_at/i.test(migration))
check('artifact is owner-only (RLS via projects.owner_id)',
  /project_approved_snapshots[\s\S]*ENABLE ROW LEVEL SECURITY[\s\S]*owner_id = auth.uid\(\)/i.test(migrationSql))

// 2. Store — approval STATE on projects; separate insert helper for the artifact.
check('Project type carries approved_at + approved_by (state)',
  store.includes('approved_at: string | null') && store.includes('approved_by: string | null'))
check('Project type / COLS carry no snapshot field (only the table name references it)',
  !store.includes('approved_snapshot:') && !store.includes('approved_snapshot?') && store.includes('approved_at, approved_by'))
check('updateProject patch accepts approved_at / approved_by',
  /patch: \{[^}]*approved_at\?: string[^}]*approved_by\?: string[^}]*\}/.test(store))
check('insertApprovedProjectSnapshot writes the separate artifact table (insert-only)',
  store.includes('export async function insertApprovedProjectSnapshot') &&
  store.includes("from('project_approved_snapshots')") && store.includes('ignoreDuplicates: true'))

// 3. Action — owner-gated, idempotent, EventPlanV2 captured, snapshot BEFORE approval.
const body = action.slice(action.indexOf('export async function approveProjectAction'))
check('approveProjectAction exists', body.includes('approveProjectAction'))
check('reuses existing EventPlan reader (getEventPlanV2)',
  action.includes("from '@/lib/planning/persistence'") && body.includes('getEventPlanV2(supabase, projectId, 1)'))
check('owner-gated (auth + getProject ownership)',
  body.includes("error: 'not_authenticated'") && body.includes('getProject(supabase, projectId)') &&
  body.includes("error: 'not_authorized'"))
check('idempotent: already-approved → success no-op (returns ok:true approvedAt)',
  /if \(project\.approved_at\) \{[\s\S]{0,160}return \{ ok: true, approvedAt: project\.approved_at \}/.test(body))
check('approval without a snapshot is impossible: fails when no EventPlanV2 exists',
  body.includes("if (!plan) return { ok: false, error: 'no_operational_configuration' }"))
check('ORDERING: snapshot inserted BEFORE approval state is recorded',
  body.indexOf('insertApprovedProjectSnapshot(supabase, {') !== -1 &&
  body.indexOf('insertApprovedProjectSnapshot(supabase, {') <
    body.indexOf('updateProject(supabase, projectId, { approved_at: approvedAt'))
check('records only approved_at + approved_by on the Project',
  body.includes('updateProject(supabase, projectId, { approved_at: approvedAt, approved_by: user.id })'))
check('does NOT write snapshot JSON into projects (no snapshot field on projects patch)',
  !body.includes('approved_snapshot'))
check('does NOT change status / current_step', !body.includes('status:') && !body.includes('current_step:'))
check('does NOT touch Publish (no is_published / publishProject in approve body)',
  !body.includes('is_published') && !body.includes('publishProject('))
check('revalidates the project workspace path', body.includes('revalidatePath'))

// 4. Publish independence preserved.
check('publishProjectAction still present (is_published)',
  action.includes('publishProjectAction') && action.includes('is_published'))
check('public projection does NOT expose approved_* fields',
  store.includes("select('id, status, created_at')") && !store.includes('id, status, created_at, approved'))

// 5. UI — button + approved state; no forbidden words (strip comments — visible text only).
const componentText = component.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('component: "Approve Project" button', component.includes('Approve Project'))
check('component: "Project Approved" + "Approved on:" after approval',
  component.includes('Project Approved') && component.includes('Approved on:'))
check('component: button disabled while submitting', component.includes('disabled={pending}'))
check('approval UI does not display Locked / Frozen / Immutable / Execution started',
  !/(\blocked\b|\bfrozen\b|immutable|execution started)/i.test(componentText))

// 6. Page delegates; placeholder gone.
check('page renders ApproveProjectPanel with the approval timestamp',
  page.includes('<ApproveProjectPanel') && page.includes('initialApprovedAt={project.approved_at}'))
check('page removed the placeholder note', !page.includes('Approval action is not available in this slice'))

// 7. Execution absent, Revision absent, no version history.
check('no Execution / Revision / version-history logic introduced',
  !body.includes('startExecution') && !body.includes('revisionOf') && !body.includes('createRevision') &&
  !/revision/i.test(migrationSql))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

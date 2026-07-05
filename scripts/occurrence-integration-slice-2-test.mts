// Occurrence Integration Slice 2 (Approved Project flow) — contract test.
//
// Static source-analysis of the wired approveProjectAction: createOrGetOccurrence is called on both the
// new-approval and already-approved paths (so first approval creates and repeated approval reuses), keyed by
// the approval timestamp, best-effort (never fails an approval), with all existing approval behaviour intact.
// The create/reuse/reject behaviour itself is proven by occurrence-creation-slice-1-test.
//
//   Run:  npx tsx scripts/occurrence-integration-slice-2-test.mts

import { readFileSync } from 'node:fs'

const action = readFileSync(new URL('../lib/actions/projects.ts', import.meta.url), 'utf8')
const body = action.slice(action.indexOf('export async function approveProjectAction'))

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Wired: createOrGetOccurrence is imported and used via a best-effort helper.
check('approve action imports createOrGetOccurrence', action.includes("from '@/lib/occurrence/store'") && action.includes('createOrGetOccurrence'))
check('best-effort helper wraps createOrGetOccurrence in try/catch (never fails approval)',
  /async function ensureFirstOccurrence[\s\S]*try \{[\s\S]*createOrGetOccurrence\(supabase, \{ projectId, startsAt: approvedAtIso \}\)[\s\S]*\} catch \{/.test(action))

// 2. Called on the already-approved path (repeat approval reuses the occurrence).
check('already-approved path ensures the occurrence, keyed by project.approved_at, then returns ok',
  /if \(project\.approved_at\) \{[\s\S]{0,200}ensureFirstOccurrence\(supabase, projectId, project\.approved_at\)[\s\S]{0,80}return \{ ok: true, approvedAt: project\.approved_at \}/.test(body))

// 3. Called on the new-approval path (first approval creates the occurrence), AFTER approval is recorded.
check('new-approval path ensures the occurrence after updateProject records approval',
  body.indexOf('updateProject(supabase, projectId, { approved_at: approvedAt') <
    body.indexOf('ensureFirstOccurrence(supabase, projectId, updated.approved_at ?? approvedAt)'))

// 4. Keyed by the approval timestamp (stable → dedup / reuse).
check('occurrence keyed by the approval timestamp (not a fabricated/clock date at call site)',
  body.includes('ensureFirstOccurrence(supabase, projectId, project.approved_at)') &&
  body.includes('ensureFirstOccurrence(supabase, projectId, updated.approved_at ?? approvedAt)'))

// 5. Existing approval behaviour preserved.
check('snapshot still created BEFORE approval state is recorded',
  body.indexOf('insertApprovedProjectSnapshot(supabase, {') < body.indexOf('updateProject(supabase, projectId, { approved_at: approvedAt'))
check('records only approved_at + approved_by (unchanged)',
  body.includes('updateProject(supabase, projectId, { approved_at: approvedAt, approved_by: user.id })'))
check('approval refusal on no EventPlanV2 unchanged', body.includes("if (!plan) return { ok: false, error: 'no_operational_configuration' }"))
check('does NOT change status / current_step / Publish', !body.includes('status:') && !body.includes('current_step:') && !body.includes('is_published') && !body.includes('publishProject('))
check('return shape unchanged ({ ok: true, approvedAt })', body.includes('return { ok: true, approvedAt: updated.approved_at ?? approvedAt }'))
check('no Execution / Revision logic introduced',
  !body.includes('startExecution') && !body.includes('revisionOf') && !body.includes('createRevision'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

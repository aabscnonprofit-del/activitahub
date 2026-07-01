// OPE V2 — Module 4 — Phase 1 Workspace Foundation test.
//   Run: npx tsx scripts/workspace-foundation-test.mts  (or: npm run test:workspace-foundation)

import { openWorkspace, loadWorkspace, setActivityStatus, appendLineageEntry, validateWorkspace, isWorkspaceRefusal } from '../lib/organizer-workspace/workspace'
import { assembleProject, isProjectRefusal } from '../lib/project/assembly'
import { computeCriticality } from '../lib/project/criticality'
import type { Project } from '../lib/project/types'
import type { Workspace } from '../lib/organizer-workspace/types'
import type { ImplementationRequirements } from '../lib/ope-engine/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const prov = () => [{ fedVersion: 1, source: 'description' as const }]

// IR with a chain r1→r2→r3 (core) + an independent leaf r4 (optional), to exercise criticality.
const baseIr = (over: Partial<ImplementationRequirements> = {}): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current',
  fedRef: { fedId: 'fed-1', fedVersion: 1 }, providerRef: { providerId: 'p', providerVersion: '1' },
  requirements: [
    { id: 'r1', description: 'Confirm the venue', phase: 'preparation', derivedFrom: prov() },
    { id: 'r2', description: 'Run the dinner', phase: 'day_of', derivedFrom: prov() },
    { id: 'r3', description: 'Send thank-yous', phase: 'after', derivedFrom: prov() },
    { id: 'r4', description: 'Order decorations', phase: 'preparation', derivedFrom: prov() },
  ],
  resourceNeeds: [], roleNeeds: [],
  dependencies: [
    { fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' },
    { fromRequirementId: 'r2', toRequirementId: 'r3', type: 'finish_to_start' },
  ],
  risks: [],
  timeline: [
    { id: 't1', phase: 'preparation', name: 'Preparation' },
    { id: 't2', phase: 'day_of', name: 'Day of' },
    { id: 't3', phase: 'after', name: 'After' },
  ],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: null },
  createdAt: '2026-01-01T00:00:00.000Z', ...over,
})
const buildProject = (over: Partial<ImplementationRequirements> = {}): Project => {
  const r = assembleProject(baseIr(over))
  if (isProjectRefusal(r)) throw new Error('fixture IR did not assemble: ' + r.reason)
  return r
}
const asWs = (r: Workspace | { reason: string }): Workspace => r as Workspace

// ── 1. Open from a valid Project ────────────────────────────────────────────────────────
console.log('\n1 — open from an immutable Project')
let WS: Workspace
{
  const project = buildProject()
  const r = openWorkspace(project, { at: 't0' })
  check('open returns a Workspace (not a refusal)', !isWorkspaceRefusal(r))
  WS = asWs(r)
  check('phase = planning', WS.phase === 'planning')
  check('one activityState per work package, all not_started', WS.activityStates.length === project.workPackages.length && WS.activityStates.every((a) => a.status === 'not_started'))
  check('projectRef references the Project', eq(WS.projectRef, { projectId: project.project_id, version: 1 }))
  check('journal opens with workspace.opened (seq 1)', WS.journal.length === 1 && WS.journal[0].type === 'workspace.opened' && WS.journal[0].seq === 1)
  check('validateWorkspace passes', validateWorkspace(WS).valid, validateWorkspace(WS).errors.join('; '))
}

// ── 2. Initial lineage (v1) ─────────────────────────────────────────────────────────────
console.log('\n2 — initial lineage v1')
{
  const e = WS.lineage[0]
  check('exactly one lineage entry', WS.lineage.length === 1)
  check('v1: lineageVersion 1, supersedes null, trigger null, status current', e.lineageVersion === 1 && e.supersedes === null && e.trigger === null && e.status === 'current')
  check('v1 carries irRef + fedRef from the Project', eq(e.irRef, { id: 'ir-1', version: 1 }) && eq(e.fedRef, { id: 'fed-1', version: 1 }))
}

// ── 3. Workspace never modifies the Project ─────────────────────────────────────────────
console.log('\n3 — Project immutability')
{
  const project = buildProject()
  const before = JSON.stringify(project)
  const ws = asWs(openWorkspace(project, { at: 't0' }))
  check('original Project unchanged after open (snapshot is a copy)', JSON.stringify(project) === before)
  check('snapshot is deeply frozen', Object.isFrozen(ws.project) && Object.isFrozen(ws.project.workPackages) && Object.isFrozen(ws.project.workPackages[0]) && Object.isFrozen(ws.project.dependencyGraph))
  let mutationBlocked = false
  try { (ws.project.workPackages as unknown as { push: (x: unknown) => void }).push({}) } catch { mutationBlocked = true }
  check('mutating the frozen snapshot is blocked (no change)', ws.project.workPackages.length === project.workPackages.length && (mutationBlocked || true))
  check('loadWorkspace returns an immutable Project', Object.isFrozen(loadWorkspace(ws).project))
}

// ── 4. Append-only lineage — no destructive edits ───────────────────────────────────────
console.log('\n4 — append-only lineage')
{
  const ws1 = asWs(openWorkspace(buildProject(), { at: 't0' }))
  const v1Before = JSON.stringify(ws1.lineage[0])
  const project2 = buildProject({ ir_id: 'ir-1', version: 2 }) // a re-planned Project (new IR version)
  const r = appendLineageEntry(ws1, project2, { trigger: 'ir_revised', reason: 'engine refinement', at: 't1' })
  check('append succeeds', r.ok)
  if (r.ok) {
    const L = r.workspace.lineage
    check('lineage grew to 2 entries (append-only)', L.length === 2)
    check('exactly one current', L.filter((e) => e.status === 'current').length === 1)
    check('v2 is current; supersedes v1; trigger ir_revised', L[1].lineageVersion === 2 && L[1].status === 'current' && L[1].supersedes === 1 && L[1].trigger === 'ir_revised')
    check('v1 now superseded — identity data otherwise UNCHANGED (no destructive edit)', L[0].status === 'superseded' && JSON.stringify({ ...L[0], status: 'current' }) === v1Before)
    check('original v1 lineage object not mutated in place', JSON.stringify(ws1.lineage[0]) === v1Before)
    check('overlay rebound to the re-planned Project + criticality re-consumed', r.workspace.projectRef.projectId === project2.project_id && r.workspace.criticality.computedFrom.projectId === project2.project_id && L[1].irRef.version === 2)
    check('validateWorkspace passes after append', validateWorkspace(r.workspace).valid, validateWorkspace(r.workspace).errors.join('; '))
  }
  // verify-don't-trust: a non-assembled Project is rejected, lineage unchanged
  const bad = { ...buildProject(), status: 'superseded' as unknown as 'assembled' }
  const rb = appendLineageEntry(ws1, bad as Project, { trigger: 'ir_revised', reason: 'x' })
  check('append rejects a non-assembled Project', !rb.ok && rb.rejection.reason === 'project_not_assembled')
}

// ── 5. Basic activity state — status ────────────────────────────────────────────────────
console.log('\n5 — activity status (overlay only)')
{
  const beforeProject = JSON.stringify(WS.project)
  const r = setActivityStatus(WS, 'wp-r1', 'in_progress', 't2')
  check('set status succeeds', r.ok)
  if (r.ok) {
    check('wp-r1 status updated', r.workspace.activityStates.find((a) => a.workPackageId === 'wp-r1')!.status === 'in_progress')
    check('journal appended (activity.status_changed)', r.workspace.journal.length === WS.journal.length + 1 && r.workspace.journal.at(-1)!.type === 'activity.status_changed')
    check('Project snapshot untouched', JSON.stringify(r.workspace.project) === beforeProject)
    check('original workspace not mutated', WS.activityStates.find((a) => a.workPackageId === 'wp-r1')!.status === 'not_started')
  }
  check('unknown activity → unknown_activity', (() => { const x = setActivityStatus(WS, 'wp-NOPE', 'done'); return !x.ok && x.rejection.reason === 'unknown_activity' })())
  check('invalid status → invalid_status', (() => { const x = setActivityStatus(WS, 'wp-r1', 'finished' as unknown as 'done'); return !x.ok && x.rejection.reason === 'invalid_status' })())
}

// ── 6. Criticality consumption (never recalculated in M4) ───────────────────────────────
console.log('\n6 — criticality consumption')
{
  const project = buildProject()
  const ws = asWs(openWorkspace(project, { at: 't0' }))
  check('workspace.criticality deep-equals the Project-domain producer output', eq(ws.criticality, computeCriticality(project)))
  check('criticalCore = the chain r1→r2→r3 (core)', eq([...ws.criticality.criticalCore].sort(), ['wp-r1', 'wp-r2', 'wp-r3']))
  check('criticalPath is the chain wp-r1→wp-r2→wp-r3', eq(ws.criticality.criticalPath, ['wp-r1', 'wp-r2', 'wp-r3']))
  check('leaf wp-r4 is optional (graceful-degradation candidate)', ws.criticality.perWorkPackage['wp-r4'].level === 'optional')
  check('core nodes have float 0', ['wp-r1', 'wp-r2', 'wp-r3'].every((id) => ws.criticality.perWorkPackage[id].float === 0))
  check('producer is deterministic', eq(computeCriticality(project), computeCriticality(project)))
}

// ── 7. Change journal — append-only ─────────────────────────────────────────────────────
console.log('\n7 — append-only change journal')
{
  let ws = asWs(openWorkspace(buildProject(), { at: 't0' }))
  const r1 = setActivityStatus(ws, 'wp-r1', 'in_progress', 't1'); ws = (r1 as { workspace: Workspace }).workspace
  const r2 = setActivityStatus(ws, 'wp-r2', 'blocked', 't2'); ws = (r2 as { workspace: Workspace }).workspace
  const seqs = ws.journal.map((j) => j.seq)
  check('journal seqs are 1..n monotonic', eq(seqs, [1, 2, 3]))
  check('journal types in order', eq(ws.journal.map((j) => j.type), ['workspace.opened', 'activity.status_changed', 'activity.status_changed']))
  check('prior journal entries never mutated/removed (append-only)', ws.journal[0].type === 'workspace.opened' && ws.journal[0].seq === 1)
}

// ── 8. Refusals + determinism + boundary ────────────────────────────────────────────────
console.log('\n8 — refusals, determinism')
{
  check('malformed Project → invalid_project', (() => { const r = openWorkspace({ workPackages: 'nope' } as unknown as Project); return isWorkspaceRefusal(r) && r.reason === 'invalid_project' })())
  check('assembled-but-structurally-broken Project → invalid_project', (() => { const r = openWorkspace({ status: 'assembled', version: 1, workPackages: [] } as unknown as Project); return isWorkspaceRefusal(r) && r.reason === 'invalid_project' })())
  const notAssembled = { ...buildProject(), status: 'superseded' as unknown as 'assembled' }
  check('non-assembled Project → project_not_assembled', (() => { const r = openWorkspace(notAssembled as Project); return isWorkspaceRefusal(r) && r.reason === 'project_not_assembled' })())
  const p = buildProject()
  check('deterministic open (same input + at → identical Workspace)', eq(openWorkspace(p, { at: 't' }), openWorkspace(p, { at: 't' })))
  let threw = false
  for (const bad of [null, undefined, 123, {}, []]) { try { openWorkspace(bad as unknown as Project) } catch { threw = true } }
  check('open is total / never throws on bad input', !threw)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

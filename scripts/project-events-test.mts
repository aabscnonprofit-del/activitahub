// OPE V2 — Module 3 — Step 4 Project assembly events test.
//   Run: npx tsx scripts/project-events-test.mts  (or: npm run test:project-events)

import { assembleProjectWithEvents } from '../lib/project/events'
import { assembleProject } from '../lib/project/assembly'
import type { ImplementationRequirements } from '../lib/ope-engine/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const prov = () => [{ fedVersion: 1, source: 'description' as const }]
const types = (events: { type: string }[]) => events.map((e) => e.type)

const baseIr = (over: Partial<ImplementationRequirements> = {}): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current',
  fedRef: { fedId: 'fed-1', fedVersion: 1 }, providerRef: { providerId: 'p', providerVersion: '1' },
  requirements: [
    { id: 'r1', description: 'Confirm the venue', phase: 'preparation', derivedFrom: prov() },
    { id: 'r2', description: 'Run the dinner', phase: 'day_of', derivedFrom: prov() },
  ],
  resourceNeeds: [], roleNeeds: [],
  dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' }],
  risks: [],
  timeline: [{ id: 't1', phase: 'preparation', name: 'Preparation' }, { id: 't2', phase: 'day_of', name: 'Day of' }],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: null },
  createdAt: 't0', ...over,
})
const cyclicIr = (): ImplementationRequirements => baseIr({
  requirements: [{ id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() }, { id: 'r2', description: 'B', phase: 'preparation', derivedFrom: prov() }],
  dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'requires' }, { fromRequirementId: 'r2', toRequirementId: 'r1', type: 'requires' }],
  timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
})
const badPhaseIr = (): ImplementationRequirements => baseIr({
  requirements: [{ id: 'r1', description: 'x', phase: 'noon' as unknown as 'day_of', derivedFrom: prov() }],
  dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
})

// ── 1. Successful assembly → correct ordered events ─────────────────────────────────────
console.log('\n1 — successful assembly event order')
{
  const { result, events } = assembleProjectWithEvents(baseIr())
  check('result is a Project', !('reason' in result))
  check('events ordered: requested, work_packages_built, dependencies_resolved, assembled',
    eq(types(events), ['project.requested', 'project.work_packages_built', 'project.dependencies_resolved', 'project.assembled']))
}

// ── 2. Invalid IR → requested + ir_rejected ─────────────────────────────────────────────
console.log('\n2 — invalid IR → ir_rejected')
{
  const { result, events } = assembleProjectWithEvents(badPhaseIr())
  check('result is invalid_ir refusal', 'reason' in result && result.reason === 'invalid_ir')
  check('events = [requested, ir_rejected]', eq(types(events), ['project.requested', 'project.ir_rejected']))
  check('ir_rejected carries the reason', events[1].payload?.reason === 'invalid_ir')
  // superseded → ir_rejected too
  const sup = assembleProjectWithEvents(baseIr({ status: 'superseded' }))
  check('superseded → [requested, ir_rejected]', eq(types(sup.events), ['project.requested', 'project.ir_rejected']) && sup.events[1].payload?.reason === 'ir_not_current')
}

// ── 3. Cyclic IR → requested + assembly_failed ──────────────────────────────────────────
console.log('\n3 — cyclic IR → assembly_failed')
{
  const { result, events } = assembleProjectWithEvents(cyclicIr())
  check('result is unstructurable_requirements refusal', 'reason' in result && result.reason === 'unstructurable_requirements')
  check('events = [requested, assembly_failed]', eq(types(events), ['project.requested', 'project.assembly_failed']))
  check('assembly_failed carries the reason', events[1].payload?.reason === 'unstructurable_requirements')
}

// ── 4. No duplicate events ──────────────────────────────────────────────────────────────
console.log('\n4 — no duplicate events')
{
  for (const ir of [baseIr(), badPhaseIr(), cyclicIr()]) {
    const t = types(assembleProjectWithEvents(ir).events)
    check(`no duplicate event types (${t.join(',')})`, t.length === new Set(t).size)
  }
}

// ── 5. assembleProject output unchanged ─────────────────────────────────────────────────
console.log('\n5 — assembleProject output unchanged')
{
  for (const ir of [baseIr(), badPhaseIr(), cyclicIr(), baseIr({ status: 'superseded' })]) {
    check('wrapper result deep-equals assembleProject(ir)', eq(assembleProjectWithEvents(ir).result, assembleProject(ir)))
  }
}

// ── 6. Events include projectId / irRef when available ──────────────────────────────────
console.log('\n6 — projectId / irRef in payloads')
{
  const { events } = assembleProjectWithEvents(baseIr())
  check('requested carries irRef', eq(events[0].payload?.irRef, { id: 'ir-1', version: 1 }))
  check('success events carry projectId', events.slice(1).every((e) => e.payload?.projectId === 'proj-ir-1-1'))
  check('success events carry irRef', events.slice(1).every((e) => eq(e.payload?.irRef, { id: 'ir-1', version: 1 })))
  // non-IR-shaped input → no irRef available
  const nullRun = assembleProjectWithEvents(null)
  check('null input → requested has no irRef', nullRun.events[0].payload === undefined || nullRun.events[0].payload?.irRef === undefined)
  check('null input → ir_rejected (invalid_ir)', 'reason' in nullRun.result && nullRun.result.reason === 'invalid_ir' && nullRun.events[1].type === 'project.ir_rejected')
}

// ── 7. Logical only / deterministic / at propagation ────────────────────────────────────
console.log('\n7 — logical only, deterministic, at')
{
  check('events are plain {type, at, payload?} objects', assembleProjectWithEvents(baseIr()).events.every((e) => typeof e.type === 'string' && typeof e.at === 'string'))
  check('deterministic — same input → identical { result, events }', eq(assembleProjectWithEvents(baseIr()), assembleProjectWithEvents(baseIr())))
  const withAt = assembleProjectWithEvents(baseIr(), { at: '2026-06-25T00:00:00.000Z' })
  check('opts.at propagates to every event', withAt.events.every((e) => e.at === '2026-06-25T00:00:00.000Z'))
  check('default at = empty string (no clock)', assembleProjectWithEvents(baseIr()).events.every((e) => e.at === ''))
  let threw = false
  for (const i of [null, undefined, 123, {}, [], baseIr(), cyclicIr()]) { try { assembleProjectWithEvents(i) } catch { threw = true } }
  check('never throws across inputs', !threw)
}

// ── 8. Duplicate requirement ids → requested + assembly_failed ──────────────────────────
console.log('\n8 — duplicate requirement ids → assembly_failed')
{
  const dup = baseIr({
    requirements: [{ id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() }, { id: 'r1', description: 'B', phase: 'preparation', derivedFrom: prov() }],
    dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
  })
  const { result, events } = assembleProjectWithEvents(dup)
  check('duplicate req ids → unstructurable_requirements', 'reason' in result && result.reason === 'unstructurable_requirements')
  check('events = [requested, assembly_failed]', eq(types(events), ['project.requested', 'project.assembly_failed']))
  check('assembly_failed carries the reason', events[1].payload?.reason === 'unstructurable_requirements')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

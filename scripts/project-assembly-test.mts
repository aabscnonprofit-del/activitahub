// OPE V2 — Module 3 — Step 3 Project assembler test.
//   Run: npx tsx scripts/project-assembly-test.mts  (or: npm run test:project-assembly)

import { assembleProject, isProjectRefusal } from '../lib/project/assembly'
import { validateProject } from '../lib/project/project'
import type { Project } from '../lib/project/types'
import type { ImplementationRequirements } from '../lib/ope-engine/types'
// Module 2 + Module 1 imports are TEST-ONLY (integration coverage); not used by lib/project itself.
import { produceImplementationRequirements } from '../lib/ope-engine/contract'
import { frozenEngineProvider } from '../lib/ope-engine/frozen-engine-adapter'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { ContextElement, ContextElementType, ApprovalRecord, FutureEventDescription } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const prov = () => [{ fedVersion: 1, source: 'description' as const }]

// A rich valid IR: r1 (preparation) → r2 (day_of); needs/risks/cost populated; timeline windows set.
const baseIr = (over: Partial<ImplementationRequirements> = {}): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current',
  fedRef: { fedId: 'fed-1', fedVersion: 1 },
  providerRef: { providerId: 'p', providerVersion: '1' },
  requirements: [
    { id: 'r1', description: '  Confirm   the venue  ', phase: 'preparation', derivedFrom: prov() },
    { id: 'r2', description: 'Run the dinner', phase: 'day_of', derivedFrom: prov() },
  ],
  resourceNeeds: [{ id: 'res1', kind: 'catering', quantity: 8, basis: 'per_guest', derivedFrom: prov() }],
  roleNeeds: [{ id: 'role1', role: 'host', count: 1, basis: 'flat', derivedFrom: prov() }],
  dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' }],
  risks: [{ id: 'rk1', description: 'rain', severity: 'low', mitigation: 'tent', derivedFrom: prov() }],
  timeline: [
    { id: 't1', phase: 'preparation', name: 'Preparation', relativeWindow: '2–3 weeks before' },
    { id: 't2', phase: 'day_of', name: 'Day of', relativeWindow: null },
  ],
  costEstimate: { status: 'estimated', range: { low: 100, likely: 200, high: 300 }, currency: 'USD', lineItems: [{ key: 'catering', amount: 150, basis: 'per_guest' }], note: null },
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})
const asProject = (r: Project | { reason: string }): Project => r as Project

// ── 1. Valid IR → valid Project ─────────────────────────────────────────────────────────
console.log('\n1 — valid IR → valid Project')
let P: Project
{
  const r = assembleProject(baseIr())
  check('result is a Project (not a refusal)', !isProjectRefusal(r))
  P = asProject(r)
  check('assembled Project passes validateProject', validateProject(P).valid, validateProject(P).errors.join('; '))
}

// ── 2. One WorkPackage per Requirement ──────────────────────────────────────────────────
console.log('\n2 — one work package per requirement')
{
  check('workPackages count = requirements count', P.workPackages.length === 2)
  check('each work package holds exactly one requirement', P.workPackages.every((w) => w.requirementIds.length === 1))
}

// ── 3. Deterministic ids / names / phases ───────────────────────────────────────────────
console.log('\n3 — deterministic ids / names / phases')
{
  const wp1 = P.workPackages.find((w) => w.requirementIds[0] === 'r1')!
  check('id = wp-<requirementId>', wp1.id === 'wp-r1' && P.workPackages.find((w) => w.requirementIds[0] === 'r2')!.id === 'wp-r2')
  check('name = normalized description (trim + collapse whitespace)', wp1.name === 'Confirm the venue')
  check('phase = requirement.phase', wp1.phase === 'preparation' && P.workPackages.find((w) => w.id === 'wp-r2')!.phase === 'day_of')
  check('derivedFrom = requirement.derivedFrom', eq(wp1.derivedFrom, prov()))
  // name truncation ≤ 120
  const longIr = baseIr({ requirements: [{ id: 'r1', description: 'x'.repeat(200), phase: 'preparation', derivedFrom: prov() }], dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }] })
  const lp = asProject(assembleProject(longIr))
  check('name truncated to ≤120 chars', lp.workPackages[0].name.length === 120)
}

// ── 4. Dependency lift ──────────────────────────────────────────────────────────────────
console.log('\n4 — dependency lift')
{
  check('one edge lifted from the one requirement dependency', P.dependencyGraph.edges.length === 1)
  check('edge maps requirement ids → wp ids', eq(P.dependencyGraph.edges[0], { fromWorkPackageId: 'wp-r1', toWorkPackageId: 'wp-r2', type: 'finish_to_start' }))
  check('dependsOn reflects the lifted edge', eq(P.workPackages.find((w) => w.id === 'wp-r2')!.dependsOn, ['wp-r1']) && eq(P.workPackages.find((w) => w.id === 'wp-r1')!.dependsOn, []))
}

// ── 5. Self-edge dropped ────────────────────────────────────────────────────────────────
console.log('\n5 — self-edge dropped')
{
  const selfIr = baseIr({
    requirements: [{ id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() }],
    dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r1', type: 'requires' }],
    timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }],
  })
  const sp = asProject(assembleProject(selfIr))
  check('self-edge produces no graph edge', sp.dependencyGraph.edges.length === 0)
  check('self-referencing package has empty dependsOn', sp.workPackages[0].dependsOn.length === 0)
}

// ── 6. Topological order deterministic ──────────────────────────────────────────────────
console.log('\n6 — topological order deterministic')
{
  // edge wp-r1 → wp-r2 ⇒ wp-r1 before wp-r2
  const pos = new Map(P.dependencyGraph.order.map((id, i) => [id, i]))
  check('order respects the edge (wp-r1 before wp-r2)', (pos.get('wp-r1') ?? -1) < (pos.get('wp-r2') ?? -1))
  // no-edge case: order = work-package ids sorted ascending (tie-break)
  const noDep = baseIr({
    requirements: [
      { id: 'r3', description: 'C', phase: 'preparation', derivedFrom: prov() },
      { id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() },
      { id: 'r2', description: 'B', phase: 'preparation', derivedFrom: prov() },
    ],
    dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }],
  })
  const np = asProject(assembleProject(noDep))
  check('no-edge order = ids ascending (tie-break)', eq(np.dependencyGraph.order, ['wp-r1', 'wp-r2', 'wp-r3']))
  check('order is a permutation of all work packages', new Set(P.dependencyGraph.order).size === P.workPackages.length)
}

// ── 7. Timeline phases built correctly ──────────────────────────────────────────────────
console.log('\n7 — timeline phases built correctly')
{
  check('phases present, in canonical order', eq(P.timeline.phases.map((p) => p.phase), ['preparation', 'day_of']))
  check('preparation relativeWindow = first IR TimelineElement of that phase', P.timeline.phases[0].relativeWindow === '2–3 weeks before')
  check('day_of relativeWindow = null (IR window null)', P.timeline.phases[1].relativeWindow === null)
  check('each phase lists its work packages', eq(P.timeline.phases[0].workPackageIds, ['wp-r1']) && eq(P.timeline.phases[1].workPackageIds, ['wp-r2']))
  // multiple timeline elements share a phase → first wins
  const multi = baseIr({
    requirements: [{ id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() }],
    dependencies: [],
    timeline: [
      { id: 't1', phase: 'preparation', name: 'First', relativeWindow: 'first' },
      { id: 't2', phase: 'preparation', name: 'Second', relativeWindow: 'second' },
    ],
  })
  check('multiple same-phase timeline elements → first relativeWindow wins', asProject(assembleProject(multi)).timeline.phases[0].relativeWindow === 'first')
}

// ── 8. Root carry-through unchanged ─────────────────────────────────────────────────────
console.log('\n8 — root carry-through unchanged')
{
  const ir = baseIr()
  check('resourceNeeds carried unchanged', eq(P.resourceNeeds, ir.resourceNeeds))
  check('roleNeeds carried unchanged', eq(P.roleNeeds, ir.roleNeeds))
  check('risks carried unchanged', eq(P.risks, ir.risks))
  check('costSummary = ir.costEstimate unchanged', eq(P.costSummary, ir.costEstimate))
  check('no needs/risks attached to work packages (v1)', P.workPackages.every((w) => !('resourceNeeds' in w) && !('roleNeeds' in w) && !('riskIds' in w)))
}

// ── 9. version / status / createdAt fixed ───────────────────────────────────────────────
console.log('\n9 — version / status / createdAt')
{
  check('version = 1', P.version === 1)
  check('status = assembled', P.status === 'assembled')
  check('createdAt = ir.createdAt', P.createdAt === '2026-01-01T00:00:00.000Z')
  check('irRef / fedRef carried', eq(P.irRef, { id: 'ir-1', version: 1 }) && eq(P.fedRef, { id: 'fed-1', version: 1 }))
}

// ── 10. Refusals before assembly ────────────────────────────────────────────────────────
console.log('\n10 — refusals')
{
  const badPhase = baseIr({ requirements: [{ id: 'r1', description: 'x', phase: 'noon' as unknown as 'day_of', derivedFrom: prov() }], dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }] })
  const r1 = assembleProject(badPhase)
  check('invalid IR refused before assembly → invalid_ir', isProjectRefusal(r1) && r1.reason === 'invalid_ir')
  const supersededR = assembleProject(baseIr({ status: 'superseded' }))
  check('superseded IR → ir_not_current', isProjectRefusal(supersededR) && supersededR.reason === 'ir_not_current')
  const cyclic = baseIr({
    requirements: [{ id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() }, { id: 'r2', description: 'B', phase: 'preparation', derivedFrom: prov() }],
    dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'requires' }, { fromRequirementId: 'r2', toRequirementId: 'r1', type: 'requires' }],
    timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }],
  })
  const rc = assembleProject(cyclic)
  check('cyclic IR → unstructurable_requirements', isProjectRefusal(rc) && rc.reason === 'unstructurable_requirements')
}

// ── 11. Total and never throws + determinism ────────────────────────────────────────────
console.log('\n11 — total and never throws + determinism')
{
  const inputs: unknown[] = [null, undefined, 123, 'x', {}, [], baseIr({ status: 'superseded' }), baseIr()]
  let threw = false
  const results = inputs.map((i) => { try { return assembleProject(i) } catch { threw = true; return null } })
  check('assembleProject never throws across all inputs', !threw)
  check('every result is a Project or a typed ProjectRefusal', results.every((r) => r != null && (isProjectRefusal(r as Project) || ('project_id' in (r as Project)))))
  check('deterministic — same IR → identical Project', eq(assembleProject(baseIr()), assembleProject(baseIr())))
}

// ── 12. Duplicate requirement ids → unstructurable_requirements ─────────────────────────
console.log('\n12 — duplicate requirement ids')
{
  const dup = baseIr({
    requirements: [
      { id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() },
      { id: 'r1', description: 'B', phase: 'preparation', derivedFrom: prov() },
    ],
    dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }],
  })
  const r = assembleProject(dup)
  check('duplicate requirement ids → ProjectRefusal', isProjectRefusal(r))
  check('reason = unstructurable_requirements (caught by final validation)', isProjectRefusal(r) && r.reason === 'unstructurable_requirements')
}

// ── 13. Duplicate-edge IR is deterministic ──────────────────────────────────────────────
console.log('\n13 — duplicate-edge IR deterministic')
{
  const dupEdge = baseIr({
    dependencies: [
      { fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' },
      { fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' },
    ],
  })
  const a = assembleProject(dupEdge)
  const b = assembleProject(dupEdge)
  check('duplicate-edge assembly → valid Project', !isProjectRefusal(a) && validateProject(asProject(a)).valid)
  check('duplicate-edge order respects the edge', (() => { const pos = new Map(asProject(a).dependencyGraph.order.map((id, i) => [id, i])); return (pos.get('wp-r1') ?? -1) < (pos.get('wp-r2') ?? -1) })())
  check('duplicate-edge dependsOn deduped', eq(asProject(a).workPackages.find((w) => w.id === 'wp-r2')!.dependsOn, ['wp-r1']))
  check('duplicate-edge result deterministic', eq(a, b))
}

// ── 14. Module 2 frozen-adapter IR assembles into a valid Project (integration) ─────────
console.log('\n14 — Module 2 IR → valid Project + name content guard')
{
  const ctx = (elementType: ContextElementType, value: string, over: Partial<ContextElement> = {}): ContextElement => ({ id: `ctx-${elementType}`, elementType, value, confidence: 'confirmed', sourceRefs: ['req-1'], ...over })
  const approved: ApprovalRecord = { approvedBy: 'c', action: 'approved', fedVersion: 1, at: 't' }
  const fed: FutureEventDescription = {
    fedId: 'fed-1', version: 1, lockStatus: 'locked',
    clientRequest: 'birthday party for my wife, 8 adults, in our backyard',
    description: 'An adult birthday party in our backyard for 8 adults; she feels celebrated.',
    statedContext: [ctx('event_nature', 'adult birthday party'), ctx('desired_result', 'she feels celebrated'), ctx('audience_scale', '8 adults'), ctx('location', 'Honolulu, USA'), ctx('constraint', NONE_STATED)],
    openQuestions: [], approval: approved, createdAt: 't0', updatedAt: 't0',
  }
  const produced = produceImplementationRequirements(fed, frozenEngineProvider)
  check('Module 2 produced an IR', produced.ok, produced.ok ? '' : produced.refusal.reason)
  if (produced.ok) {
    const r = assembleProject(produced.ir)
    check('assembleProject(real IR) → Project (not refusal)', !isProjectRefusal(r))
    const P = asProject(r)
    check('assembled real-IR Project is valid', validateProject(P).valid, validateProject(P).errors.join('; '))
    check('empty-needs tolerated (frozen adapter emits no resource/role needs)', P.resourceNeeds.length === 0 && P.roleNeeds.length === 0)
    check('one work package per requirement', P.workPackages.length === produced.ir.requirements.length)
    // content guard over derived names: no engine ids, no $amounts/payment tokens, normalized, ≤120
    const prohibited = /[A-Z]{2,4}-(?:T|RK|CD|TPL)\d{2}|\$\s?\d|\bstripe\b|\bpayment\b|\binvoice\b/i
    check('no work-package name leaks engine ids / payment tokens', P.workPackages.every((w) => !prohibited.test(w.name)))
    check('every name is normalized (trimmed, no double space, ≤120)', P.workPackages.every((w) => w.name === w.name.trim() && !/\s{2,}/.test(w.name) && w.name.length <= 120 && w.name.length > 0))
  }
}

// ── 15. Name normalization + defensive copy (no aliasing of carried IR data) ────────────
console.log('\n15 — normalization + defensive copy')
{
  const messy = baseIr({ requirements: [{ id: 'r1', description: '  Order   the\tcake  ', phase: 'preparation', derivedFrom: prov() }], dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p', relativeWindow: null }] })
  check('name normalized (trim + collapse all whitespace)', asProject(assembleProject(messy)).workPackages[0].name === 'Order the cake')
  // defensive copy: carried collections are not aliased to the IR
  const ir = baseIr()
  const P = asProject(assembleProject(ir))
  check('resourceNeeds is a copy (not the IR array)', P.resourceNeeds !== ir.resourceNeeds && eq(P.resourceNeeds, ir.resourceNeeds))
  check('risks is a copy (not the IR array)', P.risks !== ir.risks)
  const beforeRisks = ir.risks.length
  P.risks.push({ id: 'x', description: 'y', severity: 'low', mitigation: 'z', derivedFrom: prov() })
  check('mutating Project.risks leaves the IR intact', ir.risks.length === beforeRisks)
  const beforeProv = ir.requirements[0].derivedFrom.length
  P.workPackages[0].derivedFrom.push({ fedVersion: 1, source: 'description' })
  check('mutating WorkPackage.derivedFrom leaves the IR requirement intact', ir.requirements[0].derivedFrom.length === beforeProv)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

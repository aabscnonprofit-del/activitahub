// OPE V2 — Module 3 — Step 2 IR verification surface test.
//   Run: npx tsx scripts/project-verify-test.mts  (or: npm run test:project-verify)

import { verifyIr } from '../lib/project/verify'
import type { ImplementationRequirements } from '../lib/ope-engine/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const prov = () => [{ fedVersion: 1, source: 'description' as const }]

// A fully valid, current, structurable IR (passes Module 2's validator).
const baseIr = (over: Partial<ImplementationRequirements> = {}): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current',
  fedRef: { fedId: 'fed-1', fedVersion: 1 },
  providerRef: { providerId: 'p', providerVersion: '1' },
  requirements: [
    { id: 'r1', description: 'Confirm the venue', phase: 'preparation', derivedFrom: prov() },
    { id: 'r2', description: 'Run the dinner', phase: 'day_of', derivedFrom: prov() },
  ],
  resourceNeeds: [], roleNeeds: [],
  dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' }],
  risks: [],
  timeline: [
    { id: 't1', phase: 'preparation', name: 'Preparation' },
    { id: 't2', phase: 'day_of', name: 'Day of' },
  ],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: null },
  createdAt: 't0',
  ...over,
})

const reasonOf = (v: unknown) => { const r = verifyIr(v); return r.ok ? '(ok)' : r.refusal.reason }

// ── 1. Invalid IR → invalid_ir ──────────────────────────────────────────────────────────
console.log('\n1 — invalid IR → invalid_ir')
{
  // current, ≥1 req, acyclic, but structurally invalid (bad requirement phase) → invalid_ir
  const bad = baseIr({
    requirements: [{ id: 'r1', description: 'x', phase: 'midnight' as unknown as 'day_of', derivedFrom: prov() }],
    dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
  })
  check('structurally invalid (bad phase) → invalid_ir', reasonOf(bad) === 'invalid_ir', reasonOf(bad))
  check('missing providerRef → invalid_ir', reasonOf(baseIr({ providerRef: undefined as unknown as { providerId: string; providerVersion: string } })) === 'invalid_ir')
}

// ── 2. Superseded IR → ir_not_current ───────────────────────────────────────────────────
console.log('\n2 — superseded IR → ir_not_current')
{
  check('status superseded → ir_not_current', reasonOf(baseIr({ status: 'superseded' })) === 'ir_not_current')
}

// ── 3. Zero requirements → unstructurable_requirements ──────────────────────────────────
console.log('\n3 — zero requirements → unstructurable_requirements')
{
  check('requirements [] → unstructurable_requirements', reasonOf(baseIr({ requirements: [], dependencies: [] })) === 'unstructurable_requirements')
}

// ── 4. Cyclic dependencies → unstructurable_requirements ────────────────────────────────
console.log('\n4 — cyclic dependencies → unstructurable_requirements')
{
  const cyclic = baseIr({
    requirements: [
      { id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() },
      { id: 'r2', description: 'B', phase: 'preparation', derivedFrom: prov() },
    ],
    dependencies: [
      { fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' },
      { fromRequirementId: 'r2', toRequirementId: 'r1', type: 'finish_to_start' },
    ],
    timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
  })
  check('2-cycle → unstructurable_requirements', reasonOf(cyclic) === 'unstructurable_requirements')
  // 3-cycle
  const c3 = baseIr({
    requirements: [
      { id: 'a', description: 'A', phase: 'preparation', derivedFrom: prov() },
      { id: 'b', description: 'B', phase: 'preparation', derivedFrom: prov() },
      { id: 'c', description: 'C', phase: 'preparation', derivedFrom: prov() },
    ],
    dependencies: [
      { fromRequirementId: 'a', toRequirementId: 'b', type: 'requires' },
      { fromRequirementId: 'b', toRequirementId: 'c', type: 'requires' },
      { fromRequirementId: 'c', toRequirementId: 'a', type: 'requires' },
    ],
    timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
  })
  check('3-cycle → unstructurable_requirements', reasonOf(c3) === 'unstructurable_requirements')
  // self-edge is NOT a cycle (dropped under lift) → valid
  const selfEdge = baseIr({
    requirements: [{ id: 'r1', description: 'A', phase: 'preparation', derivedFrom: prov() }],
    dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r1', type: 'requires' }],
    timeline: [{ id: 't', phase: 'preparation', name: 'p' }],
  })
  check('self-edge alone is acyclic → ok', verifyIr(selfEdge).ok)
}

// ── 5. Valid current structurable IR → ok ───────────────────────────────────────────────
console.log('\n5 — valid IR → ok')
{
  const r = verifyIr(baseIr())
  check('valid, current, acyclic, ≥1 requirement → ok', r.ok, r.ok ? '' : `${r.refusal.reason}: ${r.refusal.message}`)
}

// ── 6. Total — never throws for bad input ───────────────────────────────────────────────
console.log('\n6 — total and never throws')
{
  const inputs: unknown[] = [null, undefined, 123, 'x', {}, [], { ir_id: 'x' }, baseIr({ status: 'superseded' }), baseIr()]
  let threw = false
  const results = inputs.map((i) => { try { return verifyIr(i) } catch { threw = true; return null } })
  check('verifyIr never throws across all inputs', !threw)
  check('every result is a typed { ok } | { ok:false, refusal }', results.every((r) => r != null && (r.ok === true || (r.ok === false && typeof r.refusal?.reason === 'string'))))
  check('garbage inputs → invalid_ir', reasonOf(null) === 'invalid_ir' && reasonOf(123) === 'invalid_ir' && reasonOf({}) === 'invalid_ir' && reasonOf([]) === 'invalid_ir')
  // determinism
  const a = verifyIr(baseIr({ status: 'superseded' }))
  const b = verifyIr(baseIr({ status: 'superseded' }))
  check('deterministic — same input → identical result', JSON.stringify(a) === JSON.stringify(b))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

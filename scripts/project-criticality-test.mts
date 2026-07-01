// OPE V2 — Module 3 (Project) domain — Criticality producer test.
//   Run: npx tsx scripts/project-criticality-test.mts  (or: npm run test:project-criticality)

import { computeCriticality } from '../lib/project/criticality'
import { assembleProject, isProjectRefusal } from '../lib/project/assembly'
import type { Project } from '../lib/project/types'
import type { ImplementationRequirements } from '../lib/ope-engine/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const prov = () => [{ fedVersion: 1, source: 'description' as const }]

const ir = (reqs: { id: string; phase: 'preparation' | 'day_of' | 'after' }[], deps: [string, string][]): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current', fedRef: { fedId: 'fed-1', fedVersion: 1 }, providerRef: { providerId: 'p', providerVersion: '1' },
  requirements: reqs.map((r) => ({ id: r.id, description: r.id, phase: r.phase, derivedFrom: prov() })),
  resourceNeeds: [], roleNeeds: [],
  dependencies: deps.map(([f, t]) => ({ fromRequirementId: f, toRequirementId: t, type: 'finish_to_start' as const })),
  risks: [],
  timeline: [...new Set(reqs.map((r) => r.phase))].map((ph) => ({ id: `t-${ph}`, phase: ph, name: ph })),
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: null }, createdAt: 't',
})
const project = (reqs: { id: string; phase: 'preparation' | 'day_of' | 'after' }[], deps: [string, string][]): Project => {
  const r = assembleProject(ir(reqs, deps))
  if (isProjectRefusal(r)) throw new Error('fixture did not assemble: ' + r.reason)
  return r
}

// ── 1. Single work package → core ───────────────────────────────────────────────────────
console.log('\n1 — single work package')
{
  const c = computeCriticality(project([{ id: 'a', phase: 'preparation' }], []))
  check('single node is core, float 0', c.perWorkPackage['wp-a'].level === 'core' && c.perWorkPackage['wp-a'].float === 0)
  check('criticalPath = [wp-a]', eq(c.criticalPath, ['wp-a']))
}

// ── 2. Linear chain → all core, ordered path ────────────────────────────────────────────
console.log('\n2 — linear chain a→b→c')
{
  const c = computeCriticality(project([{ id: 'a', phase: 'preparation' }, { id: 'b', phase: 'day_of' }, { id: 'c', phase: 'after' }], [['a', 'b'], ['b', 'c']]))
  check('all on the chain are core', ['wp-a', 'wp-b', 'wp-c'].every((id) => c.perWorkPackage[id].level === 'core'))
  check('criticalPath = wp-a→wp-b→wp-c', eq(c.criticalPath, ['wp-a', 'wp-b', 'wp-c']))
  check('criticalCore = the three', eq([...c.criticalCore].sort(), ['wp-a', 'wp-b', 'wp-c']))
}

// ── 3. Chain + independent leaf → leaf is optional with slack ───────────────────────────
console.log('\n3 — chain a→b→c + leaf d')
{
  const c = computeCriticality(project([{ id: 'a', phase: 'preparation' }, { id: 'b', phase: 'day_of' }, { id: 'c', phase: 'after' }, { id: 'd', phase: 'preparation' }], [['a', 'b'], ['b', 'c']]))
  check('leaf wp-d is optional', c.perWorkPackage['wp-d'].level === 'optional')
  check('leaf wp-d has positive float (slack)', c.perWorkPackage['wp-d'].float > 0)
  check('critical path unaffected by the leaf', eq(c.criticalPath, ['wp-a', 'wp-b', 'wp-c']))
}

// ── 4. Diamond a→{b,c}→d → b,c high (low float), a,d core ────────────────────────────────
console.log('\n4 — diamond a→b,a→c,b→d,c→d')
{
  const c = computeCriticality(project([{ id: 'a', phase: 'preparation' }, { id: 'b', phase: 'preparation' }, { id: 'c', phase: 'preparation' }, { id: 'd', phase: 'day_of' }], [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]))
  // both b and c are on a longest path (a→b→d and a→c→d are equal length) → both core (float 0)
  check('a and d are core', c.perWorkPackage['wp-a'].level === 'core' && c.perWorkPackage['wp-d'].level === 'core')
  check('b and c are core (equal-length parallel paths)', c.perWorkPackage['wp-b'].level === 'core' && c.perWorkPackage['wp-c'].level === 'core')
  check('critical path is one deterministic longest chain (tie-break by id)', eq(c.criticalPath, ['wp-a', 'wp-b', 'wp-d']))
}

// ── 5. Determinism ──────────────────────────────────────────────────────────────────────
console.log('\n5 — determinism')
{
  const p = project([{ id: 'a', phase: 'preparation' }, { id: 'b', phase: 'day_of' }], [['a', 'b']])
  check('same Project → identical annotation', eq(computeCriticality(p), computeCriticality(p)))
  check('computedFrom references the Project', computeCriticality(p).computedFrom.projectId === p.project_id)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

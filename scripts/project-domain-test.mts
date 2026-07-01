// OPE V2 — Module 3 — Step 1 Project domain model test.
//   Run: npx tsx scripts/project-domain-test.mts  (or: npm run test:project-domain)

import { validateProject, validateProjectRefusal } from '../lib/project/project'
import type { Project, ProjectStatus, ProjectVersion } from '../lib/project/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const prov = () => [{ fedVersion: 1, source: 'description' as const }]

// A valid 2-work-package Project: wp-r1 (preparation) → wp-r2 (day_of).
const baseProject = (over: Partial<Project> = {}): Project => ({
  project_id: 'proj-1', version: 1, status: 'assembled',
  irRef: { id: 'ir-1', version: 1 }, fedRef: { id: 'fed-1', version: 1 },
  workPackages: [
    { id: 'wp-r1', name: 'Confirm the venue', phase: 'preparation', requirementIds: ['r1'], dependsOn: [], derivedFrom: prov() },
    { id: 'wp-r2', name: 'Run the dinner', phase: 'day_of', requirementIds: ['r2'], dependsOn: ['wp-r1'], derivedFrom: prov() },
  ],
  dependencyGraph: { edges: [{ fromWorkPackageId: 'wp-r1', toWorkPackageId: 'wp-r2', type: 'finish_to_start' }], order: ['wp-r1', 'wp-r2'] },
  timeline: { phases: [
    { phase: 'preparation', workPackageIds: ['wp-r1'], relativeWindow: 'before the event' },
    { phase: 'day_of', workPackageIds: ['wp-r2'], relativeWindow: 'day of' },
  ] },
  resourceNeeds: [], roleNeeds: [], risks: [],
  costSummary: { status: 'unpriced', range: null, lineItems: [], note: null },
  createdAt: 't0',
  ...over,
})

// ── 1. Valid Project ────────────────────────────────────────────────────────────────────
console.log('\n1 — valid Project')
{
  const r = validateProject(baseProject())
  check('a complete, consistent Project is valid', r.valid, r.errors.join('; '))
}

// ── 2. Invalid Project (missing/required fields, enums) ─────────────────────────────────
console.log('\n2 — invalid Project')
{
  check('empty project_id → invalid', !validateProject(baseProject({ project_id: '' })).valid)
  check('no work packages → invalid', !validateProject(baseProject({ workPackages: [] })).valid)
  check('bad work-package phase → invalid', !validateProject(baseProject({ workPackages: [{ id: 'wp-r1', name: 'x', phase: 'midnight' as unknown as 'day_of', requirementIds: ['r1'], dependsOn: [], derivedFrom: prov() }], dependencyGraph: { edges: [], order: ['wp-r1'] }, timeline: { phases: [{ phase: 'preparation', workPackageIds: ['wp-r1'], relativeWindow: null }] } })).valid)
  check('work-package name > 120 chars → invalid', !validateProject(baseProject({ workPackages: [{ id: 'wp-r1', name: 'x'.repeat(121), phase: 'preparation', requirementIds: ['r1'], dependsOn: [], derivedFrom: prov() }, baseProject().workPackages[1]] })).valid)
  check('missing provenance → invalid', !validateProject(baseProject({ workPackages: [{ id: 'wp-r1', name: 'x', phase: 'preparation', requirementIds: ['r1'], dependsOn: [], derivedFrom: [] }, baseProject().workPackages[1]] })).valid)
  check('bad costSummary status → invalid', !validateProject(baseProject({ costSummary: { status: 'free' as unknown as 'unpriced', range: null, lineItems: [], note: null } })).valid)
}

// ── 3. Dependency validation ────────────────────────────────────────────────────────────
console.log('\n3 — dependency validation')
{
  check('edge to non-existing work package → invalid', !validateProject(baseProject({ dependencyGraph: { edges: [{ fromWorkPackageId: 'wp-r1', toWorkPackageId: 'wp-MISSING', type: 'requires' }], order: ['wp-r1', 'wp-r2'] } })).valid)
  check('self-edge → invalid', !validateProject(baseProject({ dependencyGraph: { edges: [{ fromWorkPackageId: 'wp-r1', toWorkPackageId: 'wp-r1', type: 'requires' }], order: ['wp-r1', 'wp-r2'] } })).valid)
  check('bad dependency type → invalid', !validateProject(baseProject({ dependencyGraph: { edges: [{ fromWorkPackageId: 'wp-r1', toWorkPackageId: 'wp-r2', type: 'blocks' as unknown as 'requires' }], order: ['wp-r1', 'wp-r2'] } })).valid)
  check('order not a permutation (missing wp) → invalid', !validateProject(baseProject({ dependencyGraph: { edges: [], order: ['wp-r1'] } })).valid)
  check('order violates edge (non-topological / cyclic) → invalid', !validateProject(baseProject({ dependencyGraph: { edges: [{ fromWorkPackageId: 'wp-r1', toWorkPackageId: 'wp-r2', type: 'finish_to_start' }], order: ['wp-r2', 'wp-r1'] } })).valid)
  check('dependsOn referencing unknown wp → invalid', !validateProject(baseProject({ workPackages: [baseProject().workPackages[0], { ...baseProject().workPackages[1], dependsOn: ['wp-GHOST'] }] })).valid)
}

// ── 4. One WorkPackage per Requirement (partition) ──────────────────────────────────────
console.log('\n4 — one work package per requirement')
{
  check('two requirements in one work package → invalid', !validateProject(baseProject({ workPackages: [{ id: 'wp-r1', name: 'x', phase: 'preparation', requirementIds: ['r1', 'r2'], dependsOn: [], derivedFrom: prov() }], dependencyGraph: { edges: [], order: ['wp-r1'] }, timeline: { phases: [{ phase: 'preparation', workPackageIds: ['wp-r1'], relativeWindow: null }] } })).valid)
  check('same requirement in two work packages → invalid', !validateProject(baseProject({ workPackages: [{ id: 'wp-a', name: 'a', phase: 'preparation', requirementIds: ['r1'], dependsOn: [], derivedFrom: prov() }, { id: 'wp-b', name: 'b', phase: 'day_of', requirementIds: ['r1'], dependsOn: [], derivedFrom: prov() }], dependencyGraph: { edges: [], order: ['wp-a', 'wp-b'] }, timeline: { phases: [{ phase: 'preparation', workPackageIds: ['wp-a'], relativeWindow: null }, { phase: 'day_of', workPackageIds: ['wp-b'], relativeWindow: null }] } })).valid)
  check('exactly one requirement per package → valid', validateProject(baseProject()).valid)
}

// ── 5. Project version fixed to 1 ───────────────────────────────────────────────────────
console.log('\n5 — version fixed to 1')
{
  check('version 1 → valid', validateProject(baseProject()).valid)
  check('version 2 → invalid', !validateProject(baseProject({ version: 2 as unknown as ProjectVersion })).valid)
  check('version 0 → invalid', !validateProject(baseProject({ version: 0 as unknown as ProjectVersion })).valid)
}

// ── 6. Project status assembled ─────────────────────────────────────────────────────────
console.log('\n6 — status assembled')
{
  check("status 'assembled' → valid", validateProject(baseProject()).valid)
  check("status 'superseded' → invalid", !validateProject(baseProject({ status: 'superseded' as unknown as ProjectStatus })).valid)
}

// ── 7. Timeline coverage / consistency ──────────────────────────────────────────────────
console.log('\n7 — timeline coverage')
{
  check('timeline missing a work package → invalid', !validateProject(baseProject({ timeline: { phases: [{ phase: 'preparation', workPackageIds: ['wp-r1'], relativeWindow: null }] } })).valid)
  check('work package under wrong phase → invalid', !validateProject(baseProject({ timeline: { phases: [{ phase: 'preparation', workPackageIds: ['wp-r1', 'wp-r2'], relativeWindow: null }] } })).valid)
}

// ── 8. ProjectRefusal validation ────────────────────────────────────────────────────────
console.log('\n8 — ProjectRefusal validation')
{
  check('valid refusal reason → valid', validateProjectRefusal({ reason: 'ir_not_current' }).valid)
  check('valid refusal with message → valid', validateProjectRefusal({ reason: 'unstructurable_requirements', message: 'cycle' }).valid)
  check('unknown refusal reason → invalid', !validateProjectRefusal({ reason: 'nope' as unknown as 'invalid_ir' }).valid)
}

// ── 9. Deterministic validation ─────────────────────────────────────────────────────────
console.log('\n9 — deterministic validation')
{
  const p = baseProject({ project_id: '' }) // a deterministic set of errors
  const a = validateProject(p)
  const b = validateProject(p)
  check('same input → identical result (errors)', JSON.stringify(a) === JSON.stringify(b))
  const c = validateProject(baseProject())
  const d = validateProject(baseProject())
  check('valid input → identical (valid) result', JSON.stringify(c) === JSON.stringify(d) && c.valid)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

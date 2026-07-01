// OPE V2 — Module 2 — Step 1 IR domain model test.
//   Run: npx tsx scripts/ope-engine-domain-test.mts  (or: npm run test:ope-engine-domain)

import {
  validateImplementationRequirements, validateCostEstimate, validateRefusal,
  validateProviderReference, validateCurrentInvariant,
} from '../lib/ope-engine/ir'
import type { ImplementationRequirements, ProvenanceReference, CostEstimate, Refusal } from '../lib/ope-engine/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const prov = (): ProvenanceReference[] => [{ fedVersion: 1, source: 'context_element', contextElementId: 'ctx-1' }]

const baseIr = (over: Partial<ImplementationRequirements> = {}): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current',
  fedRef: { fedId: 'fed-1', fedVersion: 1 },
  providerRef: { providerId: 'frozen-adapter', providerVersion: '1.0.0' },
  requirements: [
    { id: 'r1', description: 'Confirm the venue', phase: 'preparation', derivedFrom: prov() },
    { id: 'r2', description: 'Run the dinner', phase: 'day_of', derivedFrom: prov() },
  ],
  resourceNeeds: [{ id: 'res1', kind: 'catering', quantity: 8, basis: 'per_guest', derivedFrom: prov() }],
  roleNeeds: [{ id: 'role1', role: 'host', count: 1, basis: 'flat', derivedFrom: prov() }],
  dependencies: [{ fromRequirementId: 'r2', toRequirementId: 'r1', type: 'finish_to_start' }],
  risks: [{ id: 'rk1', description: 'guest no-show', severity: 'low', mitigation: 'confirm RSVPs', derivedFrom: prov() }],
  timeline: [
    { id: 't1', phase: 'preparation', name: 'Preparation', relativeWindow: '2–3 weeks before' },
    { id: 't2', phase: 'day_of', name: 'Day of', relativeWindow: null },
  ],
  costEstimate: { status: 'estimated', range: { low: 200, likely: 400, high: 800 }, currency: 'USD', lineItems: [{ key: 'catering', amount: 300, basis: 'per_guest' }], note: null },
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

// ── 1. Valid IR ─────────────────────────────────────────────────────────────────────────
console.log('\n1 — valid IR')
{
  const r = validateImplementationRequirements(baseIr())
  check('a complete, consistent IR is valid', r.valid, r.errors.join('; '))
}

// ── 2. Missing required fields ──────────────────────────────────────────────────────────
console.log('\n2 — missing required fields')
{
  check('empty ir_id → invalid', !validateImplementationRequirements(baseIr({ ir_id: '' })).valid)
  check('no requirements → invalid', !validateImplementationRequirements(baseIr({ requirements: [] })).valid)
  check('no timeline → invalid', !validateImplementationRequirements(baseIr({ timeline: [] })).valid)
  check('version < 1 → invalid', !validateImplementationRequirements(baseIr({ version: 0 })).valid)
  // internal consistency
  check('dependency referencing a missing requirement → invalid', !validateImplementationRequirements(baseIr({ dependencies: [{ fromRequirementId: 'rX', toRequirementId: 'r1', type: 'requires' }] })).valid)
  check('requirement phase with no matching timeline → invalid', !validateImplementationRequirements(baseIr({ timeline: [{ id: 't1', phase: 'preparation', name: 'Prep' }] })).valid)
}

// ── 3. Enum validation ──────────────────────────────────────────────────────────────────
console.log('\n3 — enum validation')
{
  check('bad status → invalid', !validateImplementationRequirements(baseIr({ status: 'live' as unknown as 'current' })).valid)
  check('bad requirement phase → invalid', !validateImplementationRequirements(baseIr({ requirements: [{ id: 'r1', description: 'x', phase: 'midnight' as unknown as 'day_of', derivedFrom: prov() }], timeline: [{ id: 't', phase: 'day_of', name: 'x' }] })).valid)
  check('bad need basis → invalid', !validateImplementationRequirements(baseIr({ resourceNeeds: [{ id: 'n', kind: 'k', basis: 'per_hour' as unknown as 'flat', derivedFrom: prov() }] })).valid)
  check('bad risk severity → invalid', !validateImplementationRequirements(baseIr({ risks: [{ id: 'rk', description: 'x', severity: 'critical' as unknown as 'high', mitigation: 'm', derivedFrom: prov() }] })).valid)
  check('bad dependency type → invalid', !validateImplementationRequirements(baseIr({ dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'blocks' as unknown as 'requires' }] })).valid)
}

// ── 4. Provenance validation ────────────────────────────────────────────────────────────
console.log('\n4 — provenance validation')
{
  check('requirement with empty derivedFrom → invalid', !validateImplementationRequirements(baseIr({ requirements: [{ id: 'r1', description: 'x', phase: 'preparation', derivedFrom: [] }], timeline: [{ id: 't', phase: 'preparation', name: 'p' }], dependencies: [] })).valid)
  check('bad provenance source → invalid', !validateImplementationRequirements(baseIr({ requirements: [{ id: 'r1', description: 'x', phase: 'preparation', derivedFrom: [{ fedVersion: 1, source: 'guess' as unknown as 'description' }] }], timeline: [{ id: 't', phase: 'preparation', name: 'p' }], dependencies: [] })).valid)
  check('context_element provenance without id → invalid', !validateImplementationRequirements(baseIr({ requirements: [{ id: 'r1', description: 'x', phase: 'preparation', derivedFrom: [{ fedVersion: 1, source: 'context_element' }] }], timeline: [{ id: 't', phase: 'preparation', name: 'p' }], dependencies: [] })).valid)
  check('description-source provenance (no id needed) → valid', validateImplementationRequirements(baseIr({ requirements: [{ id: 'r1', description: 'x', phase: 'preparation', derivedFrom: [{ fedVersion: 1, source: 'description' }] }], resourceNeeds: [], roleNeeds: [], risks: [], dependencies: [], timeline: [{ id: 't', phase: 'preparation', name: 'p' }] })).valid)
}

// ── 5. CostEstimate validation ──────────────────────────────────────────────────────────
console.log('\n5 — CostEstimate validation')
{
  const ok = (ce: CostEstimate) => validateCostEstimate(ce).valid
  check('estimated with valid range → valid', ok({ status: 'estimated', range: { low: 1, likely: 2, high: 3 }, lineItems: [] }))
  check('estimated without range → invalid', !ok({ status: 'estimated', range: null, lineItems: [] }))
  check('estimated with low>likely → invalid', !ok({ status: 'estimated', range: { low: 5, likely: 2, high: 9 }, lineItems: [] }))
  check('unpriced with no range → valid', ok({ status: 'unpriced', range: null, lineItems: [], note: 'no pricing data' }))
  check('unpriced carrying a range → invalid', !ok({ status: 'unpriced', range: { low: 1, likely: 2, high: 3 }, lineItems: [] }))
  check('bad cost status → invalid', !ok({ status: 'free' as unknown as 'estimated', lineItems: [] }))
}

// ── 6. Refusal validation ───────────────────────────────────────────────────────────────
console.log('\n6 — Refusal validation')
{
  const ok = (r: Refusal) => validateRefusal(r).valid
  check('valid refusal reason → valid', ok({ reason: 'fed_not_locked' }))
  check('valid refusal with message → valid', ok({ reason: 'provider_failed', message: 'engine threw' }))
  check('unknown refusal reason → invalid', !ok({ reason: 'because' as unknown as 'invalid_fed' }))
}

// ── 7. ProviderReference validation ─────────────────────────────────────────────────────
console.log('\n7 — ProviderReference validation')
{
  check('valid provider ref → valid', validateProviderReference({ providerId: 'p', providerVersion: '1' }).valid)
  check('empty providerId → invalid', !validateProviderReference({ providerId: '', providerVersion: '1' }).valid)
  check('empty providerVersion → invalid', !validateProviderReference({ providerId: 'p', providerVersion: '' }).valid)
}

// ── 8. Version / current semantics ──────────────────────────────────────────────────────
console.log('\n8 — version / current semantics')
{
  const v1current = baseIr({ ir_id: 'ir-1', version: 1, status: 'current' })
  const v2current = baseIr({ ir_id: 'ir-2', version: 2, status: 'current' })
  const v1super = baseIr({ ir_id: 'ir-1', version: 1, status: 'superseded' })
  check('two current IRs for same FED → invalid', !validateCurrentInvariant([v1current, v2current]).valid)
  check('one current + one superseded → valid', validateCurrentInvariant([v1super, v2current]).valid)
  check('duplicate versions in a lineage → invalid', !validateCurrentInvariant([baseIr({ version: 2, status: 'superseded' }), baseIr({ version: 2, status: 'current' })]).valid)
  // a different FED lineage may have its own current
  check('different FED lineages may each have a current', validateCurrentInvariant([v1current, baseIr({ fedRef: { fedId: 'fed-2', fedVersion: 1 }, status: 'current' })]).valid)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

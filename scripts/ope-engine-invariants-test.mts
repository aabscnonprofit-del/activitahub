// OPE V2 — Module 2 — contract-level IR invariant enforcement test (MAJ-1 + MAJ-2 hardening).
//   Run: npx tsx scripts/ope-engine-invariants-test.mts  (or: npm run test:ope-engine-invariants)

import { produceImplementationRequirements } from '../lib/ope-engine/contract'
import { frozenEngineProvider } from '../lib/ope-engine/frozen-engine-adapter'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { EngineProvider } from '../lib/ope-engine/provider'
import type { ImplementationRequirements } from '../lib/ope-engine/types'
import type { FutureEventDescription, ContextElement, ContextElementType, ApprovalRecord } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const ctx = (elementType: ContextElementType, value: string, over: Partial<ContextElement> = {}): ContextElement => ({
  id: `ctx-${elementType}`, elementType, value, confidence: 'confirmed', sourceRefs: ['req-1'], ...over,
})
const approved: ApprovalRecord = { approvedBy: 'client-1', action: 'approved', fedVersion: 1, at: 't' }
const fed = (): FutureEventDescription => ({
  fedId: 'fed-1', version: 1, lockStatus: 'locked',
  clientRequest: 'birthday party for my wife, 8 adults, in our backyard',
  description: 'An adult birthday party in our backyard for 8 adults; she feels celebrated.',
  statedContext: [ctx('event_nature', 'adult birthday party'), ctx('desired_result', 'she feels celebrated'), ctx('audience_scale', '8 adults'), ctx('location', 'Honolulu, USA'), ctx('constraint', NONE_STATED)],
  openQuestions: [], approval: approved, createdAt: 't0', updatedAt: 't0',
})

// A structurally valid IR that correctly traces to the FED (base for mutation).
const baseIr = (f: FutureEventDescription): ImplementationRequirements => ({
  ir_id: `ir-${f.fedId}-1`, version: 1, status: 'current',
  fedRef: { fedId: f.fedId, fedVersion: f.version }, providerRef: { providerId: 'irstub', providerVersion: '1' },
  requirements: [{ id: 'r1', description: 'Confirm the venue', phase: 'preparation', derivedFrom: [{ fedVersion: f.version, source: 'description' }] }],
  resourceNeeds: [], roleNeeds: [], dependencies: [], risks: [],
  timeline: [{ id: 't1', phase: 'preparation', name: 'Preparation' }],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: null }, createdAt: 't',
})

// A provider that returns a fixed IR verbatim (to exercise the invariant gate).
const irStub = (ir: ImplementationRequirements): EngineProvider => ({
  provider_id: 'irstub', provider_version: '1', deterministic: true,
  produce: () => ({ kind: 'provider_output', providerRef: ir.providerRef, raw: ir }),
})

const rejects = (ir: ImplementationRequirements): boolean => {
  const r = produceImplementationRequirements(fed(), irStub(ir))
  return !r.ok && r.refusal.reason === 'provider_output_invalid'
}

// ── MAJ-2 traceability ──────────────────────────────────────────────────────────────────
console.log('\nMAJ-2 — FED ↔ IR traceability')
{
  const wrongFed = baseIr(fed()); wrongFed.fedRef = { fedId: 'other-fed', fedVersion: 1 }
  check('IR referencing a different FED → provider_output_invalid', rejects(wrongFed))

  const wrongVer = baseIr(fed()); wrongVer.fedRef = { fedId: 'fed-1', fedVersion: 2 }
  check('IR with wrong FED version → provider_output_invalid', rejects(wrongVer))

  const wrongProvVer = baseIr(fed()); wrongProvVer.requirements[0].derivedFrom = [{ fedVersion: 99, source: 'description' }]
  check('provenance fedVersion mismatch → provider_output_invalid', rejects(wrongProvVer))

  const badCtxRef = baseIr(fed()); badCtxRef.requirements[0].derivedFrom = [{ fedVersion: 1, source: 'context_element', contextElementId: 'ctx-DOES-NOT-EXIST' }]
  check('provenance to non-existing ContextElement → provider_output_invalid', rejects(badCtxRef))

  const goodCtxRef = baseIr(fed()); goodCtxRef.requirements[0].derivedFrom = [{ fedVersion: 1, source: 'context_element', contextElementId: 'ctx-event_nature' }]
  check('provenance to an EXISTING ContextElement → accepted', produceImplementationRequirements(fed(), irStub(goodCtxRef)).ok)

  const noProv = baseIr(fed()); noProv.requirements[0].derivedFrom = []
  check('substantive element with no derivedFrom → provider_output_invalid', rejects(noProv))
}

// ── MAJ-1 content-level invariants ──────────────────────────────────────────────────────
console.log('\nMAJ-1 — content-level prohibitions')
{
  const vendor = baseIr(fed()); vendor.resourceNeeds = [{ id: 'res1', kind: 'Acme Catering LLC, available 2026-06-12, contact: jane@acme.com', basis: 'flat', derivedFrom: [{ fedVersion: 1, source: 'description' }] }]
  check('live vendor/person/availability text → provider_output_invalid', rejects(vendor))

  const pay = baseIr(fed()); pay.requirements[0].description = 'Process the Stripe payment of $500 at checkout'
  check('Stripe/payment/charge text → provider_output_invalid', rejects(pay))

  const charge = baseIr(fed()); charge.risks = [{ id: 'rk1', description: 'Deposit risk', severity: 'low', mitigation: 'Confirm the $1,200 charge cleared', derivedFrom: [{ fedVersion: 1, source: 'description' }] }]
  check('real quote/charge text → provider_output_invalid', rejects(charge))

  const exec = baseIr(fed()); exec.requirements[0].description = 'Task completed; evidence collected and checked off'
  check('execution/completion state text → provider_output_invalid', rejects(exec))

  const engine = baseIr(fed()); engine.requirements[0].id = 'BC-T01'
  check('engine-specific field/id leak → provider_output_invalid', rejects(engine))
}

// ── valid output still passes ─────────────────────────────────────────────────────────────
console.log('\nValid output still passes')
{
  check('clean stub IR (correct trace, no prohibited content) → accepted', produceImplementationRequirements(fed(), irStub(baseIr(fed()))).ok)
  const r = produceImplementationRequirements(fed(), frozenEngineProvider)
  check('frozen adapter output passes invariant enforcement', r.ok, r.ok ? '' : `${r.refusal.reason}: ${r.refusal.message}`)
  check('frozen adapter IR still emits ready', r.ok && r.events.some((e) => e.type === 'ope.requirements_ready'))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

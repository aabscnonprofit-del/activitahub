// OPE V2 — Module 2 — Step 5 default-provider wiring + OPE domain events test.
//   Run: npx tsx scripts/ope-engine-events-test.mts  (or: npm run test:ope-engine-events)

import { produceImplementationRequirements } from '../lib/ope-engine/contract'
import { validateImplementationRequirements } from '../lib/ope-engine/ir'
import { getActiveProvider, setActiveProvider, resetActiveProvider } from '../lib/ope-engine/registry'
import { frozenEngineProvider } from '../lib/ope-engine/frozen-engine-adapter'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { EngineProvider, } from '../lib/ope-engine/provider'
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

// Adaptable by the frozen engine (adult birthday, 8 adults, backyard, Honolulu).
const supportedFed = (): FutureEventDescription => ({
  fedId: 'fed-1', version: 1, lockStatus: 'locked',
  clientRequest: 'birthday party for my wife, 8 adults, in our backyard',
  description: 'An adult birthday party in our backyard for 8 adults; she feels celebrated.',
  statedContext: [ctx('event_nature', 'adult birthday party'), ctx('desired_result', 'she feels celebrated'), ctx('audience_scale', '8 adults'), ctx('location', 'Honolulu, USA'), ctx('constraint', NONE_STATED)],
  openQuestions: [], approval: approved, createdAt: 't0', updatedAt: 't0',
})
const draftFed = (): FutureEventDescription => ({ ...supportedFed(), lockStatus: 'draft', approval: null })

// Deterministic stub providers (TEST ONLY — no real planning).
const minimalIr = (f: FutureEventDescription): ImplementationRequirements => ({
  ir_id: `ir-${f.fedId}-stub`, version: 1, status: 'current',
  fedRef: { fedId: f.fedId, fedVersion: f.version }, providerRef: { providerId: 'stub', providerVersion: '0.0.1' },
  requirements: [{ id: 'r1', description: 'Realize the approved event', phase: 'preparation', derivedFrom: [{ fedVersion: f.version, source: 'description' }] }],
  resourceNeeds: [], roleNeeds: [], dependencies: [], risks: [],
  timeline: [{ id: 't1', phase: 'preparation', name: 'Preparation' }],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: 'stub' }, createdAt: 't',
})
const stub: EngineProvider = { provider_id: 'stub', provider_version: '0.0.1', deterministic: true, produce: (f) => ({ kind: 'provider_output', providerRef: { providerId: 'stub', providerVersion: '0.0.1' }, raw: minimalIr(f) }) }
const failingStub: EngineProvider = { provider_id: 'failing', provider_version: '1', deterministic: true, produce: () => ({ kind: 'provider_failure', reason: 'failed', message: 'down' }) }

const types = (events: { type: string }[]) => events.map((e) => e.type)

// ── 1. Default provider produces a valid IR from a valid FED ────────────────────────────
console.log('\n1 — default provider produces a valid IR')
{
  check('default active provider is the frozen-engine adapter', getActiveProvider().provider_id === 'frozen-engine-adapter')
  const r = produceImplementationRequirements(supportedFed()) // no explicit provider
  check('produce(fed) with default provider → ok IR', r.ok, r.ok ? '' : `${r.refusal.reason}: ${r.refusal.message}`)
  if (r.ok) {
    check('IR is valid', validateImplementationRequirements(r.ir).valid)
    check('IR produced by the frozen adapter', r.ir.providerRef.providerId === 'frozen-engine-adapter')
    check('events include ope.requirements_ready', types(r.events).includes('ope.requirements_ready'))
  }
}

// ── 2. Explicit provider override still works ───────────────────────────────────────────
console.log('\n2 — explicit provider override')
{
  const r = produceImplementationRequirements(supportedFed(), stub)
  check('explicit stub override → ok with stub IR', r.ok && r.ir.providerRef.providerId === 'stub')
  // registry override path
  setActiveProvider(stub)
  const r2 = produceImplementationRequirements(supportedFed())
  check('setActiveProvider(stub) → produce uses the stub', r2.ok && r2.ir.providerRef.providerId === 'stub')
  resetActiveProvider()
  check('resetActiveProvider restores the frozen adapter', getActiveProvider().provider_id === 'frozen-engine-adapter')
}

// ── 3. Invalid FED emits ope.fed_rejected ───────────────────────────────────────────────
console.log('\n3 — invalid FED → ope.fed_rejected')
{
  const r = produceImplementationRequirements(draftFed(), stub)
  check('draft FED → refusal', !r.ok && r.refusal.reason === 'fed_not_locked')
  check('events = [requested, fed_rejected]', JSON.stringify(types(r.events)) === JSON.stringify(['ope.requirements_requested', 'ope.fed_rejected']))
}

// ── 4. Provider failure emits ope.requirements_failed ───────────────────────────────────
console.log('\n4 — provider failure → ope.requirements_failed')
{
  const r = produceImplementationRequirements(supportedFed(), failingStub)
  check('provider failure → refusal', !r.ok && r.refusal.reason === 'provider_failed')
  check('events = [requested, requirements_failed]', JSON.stringify(types(r.events)) === JSON.stringify(['ope.requirements_requested', 'ope.requirements_failed']))
}

// ── 5. Valid output emits assembled / validated / ready in order ────────────────────────
console.log('\n5 — success event order')
{
  const r = produceImplementationRequirements(supportedFed(), stub)
  check('success events in correct order', r.ok && JSON.stringify(types(r.events)) === JSON.stringify(['ope.requirements_requested', 'ope.requirements_assembled', 'ope.requirements_validated', 'ope.requirements_ready']))
}

// ── 6. No duplicate events ──────────────────────────────────────────────────────────────
console.log('\n6 — no duplicate events')
{
  const r = produceImplementationRequirements(supportedFed(), stub)
  const t = types(r.events)
  check('no duplicate event types in a single call', t.length === new Set(t).size)
  // also exercise the frozen adapter path for duplicate-freeness
  const r2 = produceImplementationRequirements(supportedFed(), frozenEngineProvider)
  const t2 = types(r2.events)
  check('frozen adapter path also has no duplicate events', t2.length === new Set(t2).size)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

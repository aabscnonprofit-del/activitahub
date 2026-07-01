// OPE V2 — Module 2 — Step 3 Engine Provider seam + stub provider test.
//   Run: npx tsx scripts/ope-engine-provider-test.mts  (or: npm run test:ope-engine-provider)

import { readFileSync } from 'node:fs'
import { produceImplementationRequirements } from '../lib/ope-engine/contract'
import { validateImplementationRequirements } from '../lib/ope-engine/ir'
import { setActiveProvider, resetActiveProvider } from '../lib/ope-engine/registry'
import type { EngineProvider } from '../lib/ope-engine/provider'
import type { ImplementationRequirements } from '../lib/ope-engine/types'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { FutureEventDescription, ContextElement, ContextElementType, ApprovalRecord } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// ── FED builders (a valid, locked, planning-ready FED) ──────────────────────────────────
const ctx = (elementType: ContextElementType, value: string, over: Partial<ContextElement> = {}): ContextElement => ({
  id: `ctx-${elementType}`, elementType, value, confidence: 'confirmed', sourceRefs: ['req-1'], ...over,
})
const fullContext = (): ContextElement[] => [
  ctx('event_nature', 'birthday dinner'), ctx('desired_result', 'feels celebrated'),
  ctx('audience_scale', 'about 8 close family'), ctx('location', 'a private room near home'),
  ctx('constraint', NONE_STATED),
]
const approved: ApprovalRecord = { approvedBy: 'client-1', action: 'approved', fedVersion: 1, at: 't' }
const fed = (over: Partial<FutureEventDescription> = {}): FutureEventDescription => ({
  fedId: 'fed-1', version: 1, lockStatus: 'locked',
  clientRequest: 'birthday dinner for my wife',
  description: 'An intimate birthday dinner where the guest of honour feels celebrated and surrounded by close family; the evening should feel warm and unhurried.',
  statedContext: fullContext(), openQuestions: [], approval: approved, createdAt: 't', updatedAt: 't', ...over,
})

// ── Stub providers (TEST ONLY — no real planning) ───────────────────────────────────────
const minimalIr = (f: FutureEventDescription): ImplementationRequirements => ({
  ir_id: `ir-${f.fedId}-v1`, version: 1, status: 'current',
  fedRef: { fedId: f.fedId, fedVersion: f.version },
  providerRef: { providerId: 'stub', providerVersion: '0.0.1' },
  requirements: [{ id: 'r1', description: 'Realize the approved event', phase: 'preparation', derivedFrom: [{ fedVersion: f.version, source: 'description' }] }],
  resourceNeeds: [], roleNeeds: [], dependencies: [], risks: [],
  timeline: [{ id: 't1', phase: 'preparation', name: 'Preparation' }],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: 'stub — no pricing' },
  createdAt: 't',
})
const stub: EngineProvider = {
  provider_id: 'stub', provider_version: '0.0.1', deterministic: true,
  produce: (f) => ({ kind: 'provider_output', providerRef: { providerId: 'stub', providerVersion: '0.0.1' }, raw: minimalIr(f) }),
}
const failingStub: EngineProvider = {
  provider_id: 'failing', provider_version: '1', deterministic: true,
  produce: () => ({ kind: 'provider_failure', message: 'engine unavailable' }),
}
const badOutputStub: EngineProvider = {
  provider_id: 'bad', provider_version: '1', deterministic: true,
  produce: () => ({ kind: 'provider_output', providerRef: { providerId: 'bad', providerVersion: '1' }, raw: { not: 'an IR' } }),
}
const throwingStub: EngineProvider = {
  provider_id: 'throws', provider_version: '1', deterministic: true,
  produce: () => { throw new Error('boom') },
}

// ── 1. Provider not called for invalid FED ──────────────────────────────────────────────
console.log('\n1 — provider NOT called for an invalid FED')
{
  let calls = 0
  const counting: EngineProvider = { provider_id: 'count', provider_version: '1', deterministic: true, produce: (f) => { calls++; return { kind: 'provider_output', providerRef: { providerId: 'count', providerVersion: '1' }, raw: minimalIr(f) } } }
  const r = produceImplementationRequirements(fed({ lockStatus: 'draft', approval: null }), counting)
  check('draft FED → refusal before provider', !r.ok && r.refusal.reason === 'fed_not_locked')
  check('provider was not called (0 calls)', calls === 0)
}

// ── 2. Provider called for a valid, locked, planning-ready FED ──────────────────────────
console.log('\n2 — provider called for a valid FED')
{
  let calls = 0
  const counting: EngineProvider = { provider_id: 'count', provider_version: '1', deterministic: true, produce: (f) => { calls++; return { kind: 'provider_output', providerRef: { providerId: 'count', providerVersion: '1' }, raw: minimalIr(f) } } }
  produceImplementationRequirements(fed(), counting)
  check('provider was called exactly once', calls === 1)
}

// ── 3. Provider failure → provider_failed ───────────────────────────────────────────────
console.log('\n3 — provider failure → provider_failed')
{
  const r = produceImplementationRequirements(fed(), failingStub)
  check('ProviderFailure → provider_failed', !r.ok && r.refusal.reason === 'provider_failed')
}

// ── 4. Invalid provider output → provider_output_invalid ────────────────────────────────
console.log('\n4 — invalid provider output → provider_output_invalid')
{
  const r = produceImplementationRequirements(fed(), badOutputStub)
  check('non-IR provider output → provider_output_invalid', !r.ok && r.refusal.reason === 'provider_output_invalid')
}

// ── 5. Stub provider returns a valid IR ─────────────────────────────────────────────────
console.log('\n5 — stub provider returns a valid IR')
{
  const r = produceImplementationRequirements(fed(), stub)
  check('valid FED + stub → ok with an IR', r.ok)
  if (r.ok) {
    check('returned IR is structurally valid', validateImplementationRequirements(r.ir).valid, validateImplementationRequirements(r.ir).errors.join('; '))
    check('IR traces to the FED', r.ir.fedRef.fedId === 'fed-1' && r.ir.fedRef.fedVersion === 1)
  }
}

// ── 6. Contract remains total and never throws ──────────────────────────────────────────
console.log('\n6 — contract total and never throws')
{
  const inputs: unknown[] = [null, undefined, 123, {}, fed({ lockStatus: 'draft', approval: null }), fed()]
  let threw = false
  const providers = [undefined, stub, failingStub, badOutputStub, throwingStub]
  for (const p of providers) for (const i of inputs) { try { const r = produceImplementationRequirements(i, p); if (r == null || typeof r.ok !== 'boolean') threw = true } catch { threw = true } }
  check('produce never throws / always returns a typed result across providers×inputs', !threw)
  check('throwing provider on valid FED → provider_failed (caught)', (() => { const r = produceImplementationRequirements(fed(), throwingStub); return !r.ok && r.refusal.reason === 'provider_failed' })())
  check('active provider used when none injected (Step 5 registry)', (() => { setActiveProvider(stub); const r = produceImplementationRequirements(fed()); resetActiveProvider(); return r.ok })())
}

// ── 7. No import/call to the frozen engine (lib/ope/*) ──────────────────────────────────
console.log('\n7 — no import/call to frozen engine')
{
  const files = ['types.ts', 'ir.ts', 'contract.ts', 'provider.ts']
  const frozenImport = /@\/lib\/ope[/']|\.\.\/ope[/']|['"]@\/lib\/ope['"]/
  let clean = true
  for (const f of files) {
    const src = readFileSync(new URL(`../lib/ope-engine/${f}`, import.meta.url), 'utf8')
    if (frozenImport.test(src)) { clean = false; console.log(`     ${f} references the frozen engine`) }
  }
  check('no lib/ope-engine file imports the frozen engine (lib/ope/*)', clean)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

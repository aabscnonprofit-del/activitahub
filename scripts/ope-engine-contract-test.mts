// OPE V2 — Module 2 — Step 2 contract envelope + FED verification test.
//   Run: npx tsx scripts/ope-engine-contract-test.mts  (or: npm run test:ope-engine-contract)

import { verifyFed, produceImplementationRequirements } from '../lib/ope-engine/contract'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { FutureEventDescription, ContextElement, ContextElementType, ApprovalRecord } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

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
  statedContext: fullContext(), openQuestions: [], approval: approved,
  createdAt: 't', updatedAt: 't', ...over,
})

const reasonOf = (v: unknown) => {
  const r = verifyFed(v)
  return r.ok ? '(ok)' : r.refusal.reason
}

// ── 1. Draft FED → fed_not_locked ───────────────────────────────────────────────────────
console.log('\n1 — draft FED → fed_not_locked')
{
  check('draft FED → fed_not_locked', reasonOf(fed({ lockStatus: 'draft', approval: null })) === 'fed_not_locked')
}

// ── 2. Locked FED without approval → fed_not_locked ─────────────────────────────────────
console.log('\n2 — locked FED without matching approval')
{
  check('locked, no approval → fed_not_locked', reasonOf(fed({ approval: null })) === 'fed_not_locked')
  check('locked, approval for wrong version → fed_not_locked', reasonOf(fed({ version: 2, approval: { ...approved, fedVersion: 1 } })) === 'fed_not_locked')
  check('locked, approval not "approved" → fed_not_locked', reasonOf(fed({ approval: { ...approved, action: 'rejected' } })) === 'fed_not_locked')
}

// ── 3. Invalid FED → invalid_fed ────────────────────────────────────────────────────────
console.log('\n3 — invalid FED → invalid_fed')
{
  check('not a FED (null) → invalid_fed', reasonOf(null) === 'invalid_fed')
  check('not a FED (garbage object) → invalid_fed', reasonOf({ hello: 'world' }) === 'invalid_fed')
  // locked + approved but content invalid (prohibited content → FED invariants fail)
  check('locked+approved but prohibited content → invalid_fed', reasonOf(fed({ description: 'A dinner with a budget of $5,000.' })) === 'invalid_fed')
}

// ── 4. Locked but not planning-ready → fed_not_planning_ready ───────────────────────────
console.log('\n4 — locked but not planning-ready')
{
  // valid, locked, approved, clean — but statedContext is missing event_nature → readiness fails
  const missingNature = fullContext().filter((e) => e.elementType !== 'event_nature')
  check('missing required readiness element → fed_not_planning_ready', reasonOf(fed({ statedContext: missingNature })) === 'fed_not_planning_ready')
}

// ── 5. Valid locked planning-ready FED passes verification ──────────────────────────────
console.log('\n5 — valid FED passes verification')
{
  const r = verifyFed(fed())
  check('valid, locked, approved, ready FED → ok', r.ok, r.ok ? '' : r.refusal.reason + ': ' + r.refusal.message)
}

// ── 6. Contract result is total and never throws for bad input ──────────────────────────
console.log('\n6 — contract is total and never throws')
{
  const inputs: unknown[] = [null, undefined, 123, 'x', {}, [], fed({ lockStatus: 'draft', approval: null }), fed()]
  let threw = false
  const results = inputs.map((i) => { try { return produceImplementationRequirements(i) } catch { threw = true; return null } })
  check('produce never throws across all inputs', !threw)
  check('every produce result is a typed { ok:false, refusal }', results.every((r) => r != null && r.ok === false && typeof r.refusal?.reason === 'string'))
  // bad FED → the verification refusal is surfaced
  check('draft FED through produce → fed_not_locked refusal', (() => { const r = produceImplementationRequirements(fed({ lockStatus: 'draft', approval: null })); return !r.ok && r.refusal.reason === 'fed_not_locked' })())
  // verified FED → a typed total result via the active provider (Step 5 wired a default provider).
  check('verified FED through produce → a typed total result', (() => { const r = produceImplementationRequirements(fed()); return r.ok ? !!r.ir : typeof r.refusal.reason === 'string' })())
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

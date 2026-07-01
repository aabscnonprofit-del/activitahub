// Stage 6C — native EventPlanV2 EngineProvider test.
//   Run: npx tsx scripts/native-ope-provider-test.mts

import { readFileSync } from 'node:fs'
import { produceImplementationRequirements } from '../lib/ope-engine/contract'
import { validateImplementationRequirements } from '../lib/ope-engine/ir'
import { nativeEventPlanV2Provider } from '../lib/planning/native-ope-provider'
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
const approved: ApprovalRecord = { approvedBy: 'client-1', action: 'approved', fedVersion: 1, at: 't' }

// A planned-able FED: relaxed birthday dinner with music, 8 guests, Honolulu.
const plannedFed = (): FutureEventDescription => ({
  fedId: 'fed-1', version: 1, lockStatus: 'locked',
  clientRequest: 'a relaxed birthday dinner with live music for my wife, about 8 guests',
  description: 'A relaxed birthday dinner with live music; she feels celebrated.',
  statedContext: [
    ctx('event_nature', 'birthday dinner with music'),
    ctx('desired_result', 'she feels celebrated'),
    ctx('audience_scale', '8 guests'),
    ctx('location', 'Honolulu, USA'),
    ctx('constraint', NONE_STATED),
  ],
  openQuestions: [], approval: approved, createdAt: 't0', updatedAt: 't0',
})

// A planning-ready FED with NO planning signal (no element/quality keywords) → V2 'needs_human_decision'.
const signalFreeFed = (): FutureEventDescription => ({
  ...plannedFed(),
  fedId: 'fed-2',
  clientRequest: 'We want to organize an occasion but are unsure of the format.',
  description: 'An occasion to be defined; the client will decide the specifics later.',
  statedContext: [
    ctx('event_nature', 'an undecided occasion'),
    ctx('desired_result', 'the client is satisfied'),
    ctx('audience_scale', 'a number of attendees'),
    ctx('location', 'Centerville, USA'),
    ctx('constraint', NONE_STATED),
  ],
})

// ── 1. Planned EventPlanV2 → ok IR ──────────────────────────────────────────────────────
console.log('\n1 — planned FED → ok IR via the native provider')
let okIr: import('../lib/ope-engine/types').ImplementationRequirements | null = null
{
  const r = produceImplementationRequirements(plannedFed(), nativeEventPlanV2Provider)
  check('produce returns ok:true with an IR', r.ok, r.ok ? '' : `${r.refusal.reason}: ${r.refusal.message}`)
  if (r.ok) {
    okIr = r.ir
    check('IR is structurally valid (contract-validated)', validateImplementationRequirements(r.ir).valid)
    check('providerRef identifies the native provider', r.ir.providerRef.providerId === 'native-event-plan-v2')
    check('IR has ≥1 requirement and ≥1 timeline element', r.ir.requirements.length >= 1 && r.ir.timeline.length >= 1)
    check('IR populates resourceNeeds and/or roleNeeds (semantic difference vs frozen)', r.ir.resourceNeeds.length + r.ir.roleNeeds.length >= 1, `res=${r.ir.resourceNeeds.length} role=${r.ir.roleNeeds.length}`)
  }
}

// ── 2. Provenance on every substantive element ──────────────────────────────────────────
console.log('\n2 — provenance on every substantive element')
{
  const subst = okIr ? [...okIr.requirements, ...okIr.resourceNeeds, ...okIr.roleNeeds, ...okIr.risks] : []
  check('every requirement/resource/role/risk has derivedFrom ≥1', okIr != null && subst.every((e) => Array.isArray(e.derivedFrom) && e.derivedFrom.length >= 1))
}

// ── 3. Non-planned EventPlanV2 → unsupported ────────────────────────────────────────────
console.log('\n3 — signal-free (non-planned) FED → unsupported_fed_content')
{
  const r = produceImplementationRequirements(signalFreeFed(), nativeEventPlanV2Provider)
  check('a non-planned EventPlanV2 → unsupported_fed_content', !r.ok && r.refusal.reason === 'unsupported_fed_content', r.ok ? 'unexpected ok' : r.refusal.reason)
}

// ── 4. Determinism ──────────────────────────────────────────────────────────────────────
console.log('\n4 — deterministic: identical FED → identical IR')
{
  const a = produceImplementationRequirements(plannedFed(), nativeEventPlanV2Provider)
  const b = produceImplementationRequirements(plannedFed(), nativeEventPlanV2Provider)
  check('two runs produce identical IR', a.ok && b.ok && JSON.stringify(a.ir) === JSON.stringify(b.ir))
  check('provider declares deterministic', nativeEventPlanV2Provider.deterministic === true)
}

// ── 5. No legacy dependency (static source scan of the native files) ─────────────────────
console.log('\n5 — native provider has no legacy Planning Layer dependency')
{
  const files = ['native-ope-provider.ts', 'event-plan-v2-to-ir.ts', 'discovery-fed-bridge.ts']
  const dir = new URL('../lib/planning/', import.meta.url)
  // Strip comments first — a boundary comment that NAMES what it prohibits ("no PlannerInput") is
  // legitimate documentation; we scan only real code (imports/usages).
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const legacyImport = /from ['"]@\/lib\/ope['"]|from ['"]@\/lib\/ope\/|from ['"]\.\.\/ope\//
  const generatePlanCall = /\bgeneratePlan\s*\(/
  const plannerInputType = /\bPlannerInput\b/
  const sectionAccess = /section_[a-f]\b/
  for (const f of files) {
    const src = stripComments(readFileSync(new URL(f, dir), 'utf8'))
    check(`${f}: imports lib/ope/* = 0`, !legacyImport.test(src))
    check(`${f}: calls generatePlan = 0`, !generatePlanCall.test(src))
    check(`${f}: references PlannerInput = 0`, !plannerInputType.test(src))
    check(`${f}: reads section_* = 0`, !sectionAccess.test(src))
  }
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

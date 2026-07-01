// OPE V2 — Module 2 — Step 4 frozen-engine adapter provider test.
//   Run: npx tsx scripts/ope-engine-adapter-test.mts  (or: npm run test:ope-engine-adapter)

import { readFileSync, readdirSync } from 'node:fs'
import { produceImplementationRequirements } from '../lib/ope-engine/contract'
import { validateImplementationRequirements } from '../lib/ope-engine/ir'
import { frozenEngineProvider } from '../lib/ope-engine/frozen-engine-adapter'
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

// A FED that adapts to a SUPPORTED plan: adult birthday, 8 adults, backyard, located Honolulu.
const supportedFed = (): FutureEventDescription => ({
  fedId: 'fed-1', version: 1, lockStatus: 'locked',
  clientRequest: 'birthday party for my wife, 8 adults, in our backyard',
  description: 'An adult birthday party in our backyard for 8 adults; she feels celebrated.',
  statedContext: [
    ctx('event_nature', 'adult birthday party'),
    ctx('desired_result', 'she feels celebrated'),
    ctx('audience_scale', '8 adults'),
    ctx('location', 'Honolulu, USA'),
    ctx('constraint', NONE_STATED),
  ],
  openQuestions: [], approval: approved, createdAt: 't0', updatedAt: 't0',
})

// A planning-ready FED whose event nature maps to NO supported category.
const unsupportedFed = (): FutureEventDescription => ({
  ...supportedFed(),
  clientRequest: 'a corporate conference for 200 people',
  description: 'A corporate conference for 200 professionals to network and learn.',
  statedContext: [
    ctx('event_nature', 'a corporate conference'),
    ctx('desired_result', 'attendees feel informed'),
    ctx('audience_scale', '200 professionals'),
    ctx('location', 'Honolulu, USA'),
    ctx('constraint', NONE_STATED),
  ],
})

// ── 1. Valid FED → ok IR ────────────────────────────────────────────────────────────────
console.log('\n1 — valid FED → ok IR via the frozen-engine adapter')
let okIr: import('../lib/ope-engine/types').ImplementationRequirements | null = null
{
  const r = produceImplementationRequirements(supportedFed(), frozenEngineProvider)
  check('produce returns ok:true with an IR', r.ok, r.ok ? '' : `${r.refusal.reason}: ${r.refusal.message}`)
  if (r.ok) {
    okIr = r.ir
    check('IR has ≥1 requirement and ≥1 timeline element', r.ir.requirements.length >= 1 && r.ir.timeline.length >= 1)
  }
}

// ── 2. Provider output passes IR validation ─────────────────────────────────────────────
console.log('\n2 — provider output passes IR validation')
{
  check('IR is structurally valid', okIr != null && validateImplementationRequirements(okIr).valid, okIr ? validateImplementationRequirements(okIr).errors.join('; ') : 'no IR')
}

// ── 3. Every substantive IR element has derivedFrom provenance ──────────────────────────
console.log('\n3 — provenance on every substantive element')
{
  const subst = okIr ? [...okIr.requirements, ...okIr.resourceNeeds, ...okIr.roleNeeds, ...okIr.risks] : []
  check('every requirement/resource/role/risk has derivedFrom ≥1', okIr != null && subst.every((e) => Array.isArray(e.derivedFrom) && e.derivedFrom.length >= 1))
}

// ── 4. providerRef contains the frozen provider id/version ──────────────────────────────
console.log('\n4 — providerRef identifies the frozen adapter')
{
  check('providerRef.providerId = frozen-engine-adapter', okIr?.providerRef.providerId === 'frozen-engine-adapter')
  check('providerRef.providerVersion present', !!okIr?.providerRef.providerVersion)
}

// ── 5. IR contains no engine-specific fields ────────────────────────────────────────────
console.log('\n5 — IR contains no engine-specific fields')
{
  const json = okIr ? JSON.stringify(okIr) : ''
  const leaks = ['section_', 'item_key', 'ucd', '_module', 'window_days_before', 'PlannerInput', 'pricing_source']
  const found = leaks.filter((k) => json.includes(k))
  check('no engine-internal field names leak into the IR', okIr != null && found.length === 0, found.join(', '))
  // engine task ids (e.g. BC-T01) must not appear as IR requirement ids
  check('requirement ids are IR-local (not engine ids)', okIr != null && okIr.requirements.every((r) => /^req-/.test(r.id)))
  // cost line keys are humanized (no snake_case engine keys)
  check('cost line keys are humanized', okIr != null && okIr.costEstimate.lineItems.every((li) => !li.key.includes('_')))
}

// ── 6. Unsupported FED content → unsupported_fed_content ─────────────────────────────────
console.log('\n6 — unsupported FED content → unsupported_fed_content')
{
  const r = produceImplementationRequirements(unsupportedFed(), frozenEngineProvider)
  check('a ready FED the adapter cannot plan → unsupported_fed_content', !r.ok && r.refusal.reason === 'unsupported_fed_content', r.ok ? 'unexpected ok' : r.refusal.reason)
}

// ── 7. Cost is an estimate, never a quote/charge ────────────────────────────────────────
console.log('\n7 — cost is an estimate only')
{
  check("costEstimate.status ∈ {estimated, unpriced}", okIr != null && ['estimated', 'unpriced'].includes(okIr.costEstimate.status))
}

// ── 8. Boundary: only the adapter imports lib/ope/* ─────────────────────────────────────
console.log('\n8 — boundary: only the adapter imports the frozen engine')
{
  const dir = new URL('../lib/ope-engine/', import.meta.url)
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'))
  const frozenImport = /from ['"]@\/lib\/ope['"]|@\/lib\/ope\/|\.\.\/ope[/']/
  const importers = files.filter((f) => frozenImport.test(readFileSync(new URL(f, dir), 'utf8')))
  check('exactly one lib/ope-engine file imports lib/ope/*', importers.length === 1, `importers: ${importers.join(', ')}`)
  check('that file is the frozen-engine adapter', importers[0] === 'frozen-engine-adapter.ts', importers.join(', '))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

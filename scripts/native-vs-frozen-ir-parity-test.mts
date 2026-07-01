// Stage 6C — parallel comparison: frozen-engine adapter vs native EventPlanV2 provider.
//   Run: npx tsx scripts/native-vs-frozen-ir-parity-test.mts
//
// Runs BOTH providers through the SAME OPE Contract (same FED verification + IR validation +
// invariants) over a corpus of locked FEDs, and prints a side-by-side report. Differences are
// EXPECTED and surfaced, not hidden. The only hard assertion: whenever a provider returns output,
// the contract accepted it (i.e. the native provider never yields provider_output_invalid).

import { produceImplementationRequirements, type ContractResult } from '../lib/ope-engine/contract'
import { frozenEngineProvider } from '../lib/ope-engine/frozen-engine-adapter'
import { nativeEventPlanV2Provider } from '../lib/planning/native-ope-provider'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { FutureEventDescription, ContextElement, ContextElementType, ApprovalRecord } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const ctx = (elementType: ContextElementType, value: string): ContextElement => ({
  id: `ctx-${elementType}`, elementType, value, confidence: 'confirmed', sourceRefs: ['req-1'],
})
const approved: ApprovalRecord = { approvedBy: 'c', action: 'approved', fedVersion: 1, at: 't' }

function fed(id: string, clientRequest: string, description: string, nature: string, scale: string, location = 'Honolulu, USA'): FutureEventDescription {
  return {
    fedId: id, version: 1, lockStatus: 'locked', clientRequest, description,
    statedContext: [
      ctx('event_nature', nature),
      ctx('desired_result', 'the client is happy with the outcome'),
      ctx('audience_scale', scale),
      ctx('location', location),
      ctx('constraint', NONE_STATED),
    ],
    openQuestions: [], approval: approved, createdAt: 't0', updatedAt: 't0',
  }
}

const corpus: FutureEventDescription[] = [
  fed('fed-birthday', 'birthday party for my wife, 8 adults, in our backyard',
    'An adult birthday party in our backyard for 8 adults; she feels celebrated.', 'adult birthday party', '8 adults'),
  fed('fed-conference', 'a corporate conference for 200 people to network and learn',
    'A corporate conference for 200 professionals with sessions and networking.', 'a corporate conference', '200 professionals'),
  fed('fed-yoga', 'a weekly yoga class for a small wellness group',
    'A relaxing weekly yoga class; participants feel restored.', 'a yoga class', '12 people'),
  fed('fed-vague', 'we want to organize an occasion but are unsure of the format',
    'An occasion to be defined; the client will decide the specifics later.', 'an undecided occasion', 'a number of attendees'),
]

function summarize(r: ContractResult): string {
  if (!r.ok) return `REFUSED(${r.refusal.reason})`
  const ir = r.ir
  return `OK req=${ir.requirements.length} res=${ir.resourceNeeds.length} role=${ir.roleNeeds.length} dep=${ir.dependencies.length} risk=${ir.risks.length} phases=[${ir.timeline.map((t) => t.phase).join(',')}] cost=${ir.costEstimate.status}`
}

console.log('\n── Parallel comparison: frozen adapter vs native EventPlanV2 provider ──')
const rows: { fed: string; frozen: ContractResult; native: ContractResult }[] = []
for (const f of corpus) {
  const frozen = produceImplementationRequirements(f, frozenEngineProvider)
  const native = produceImplementationRequirements(f, nativeEventPlanV2Provider)
  rows.push({ fed: f.fedId, frozen, native })
  console.log(`\n${f.fedId}`)
  console.log(`  frozen : ${summarize(frozen)}`)
  console.log(`  native : ${summarize(native)}`)
}

// ── Hard guarantees ─────────────────────────────────────────────────────────────────────
console.log('\n── Guarantees ──')
{
  // The native provider must never produce a structurally/invariant-invalid IR (the contract maps
  // such output to provider_output_invalid). Output is allowed to be ok or a typed unsupported/failed.
  const invalid = rows.filter((row) => !row.native.ok && row.native.refusal.reason === 'provider_output_invalid')
  check('native provider never yields provider_output_invalid', invalid.length === 0, invalid.map((r) => r.fed).join(', '))

  // Wherever native returned ok, the IR carries ≥1 requirement + ≥1 timeline element (contract-valid).
  const okRows = rows.filter((r) => r.native.ok)
  check('every native OK IR has ≥1 requirement and timeline', okRows.every((r) => r.native.ok && r.native.ir.requirements.length >= 1 && r.native.ir.timeline.length >= 1))
}

// ── Documented expected differences ─────────────────────────────────────────────────────
console.log('\n── Documented differences (expected, not failures) ──')
{
  // 1. Broader coverage: native plans some FEDs the frozen adapter refuses (no legacy category gate).
  const nativePlansFrozenRefuses = rows.filter((r) => r.native.ok && !r.frozen.ok)
  console.log(`  • native plans where frozen refused: ${nativePlansFrozenRefuses.map((r) => r.fed).join(', ') || '(none)'}`)

  // 2. Resource/role needs: native populates them; the frozen adapter always emitted empty.
  const frozenNeedsAlwaysEmpty = rows.every((r) => !r.frozen.ok || (r.frozen.ir.resourceNeeds.length === 0 && r.frozen.ir.roleNeeds.length === 0))
  const nativePopulatesNeeds = rows.some((r) => r.native.ok && (r.native.ir.resourceNeeds.length + r.native.ir.roleNeeds.length) > 0)
  console.log(`  • frozen resource/role needs always empty: ${frozenNeedsAlwaysEmpty}`)
  console.log(`  • native populates resource/role needs on ≥1 FED: ${nativePopulatesNeeds}`)
  check('frozen adapter emits empty resource/role needs (baseline)', frozenNeedsAlwaysEmpty)
  check('native provider populates resource/role needs (intentional difference)', nativePopulatesNeeds)

  // 3. Both refuse the signal-free FED.
  const vague = rows.find((r) => r.fed === 'fed-vague')!
  console.log(`  • signal-free FED — frozen: ${summarize(vague.frozen)}, native: ${summarize(vague.native)}`)
  check('both providers refuse the signal-free FED', !vague.frozen.ok && !vague.native.ok)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

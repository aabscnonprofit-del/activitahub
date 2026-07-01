// OPE V2 — Discovery Engine — Step 3 FED invariants + versioning/immutability test.
//   Run: npx tsx scripts/discovery-fed-invariants-test.mts  (or: npm run test:discovery-fed)

import { validateFedInvariants, reviseFed, checkImmutability } from '../lib/discovery/fed-invariants'
import type { FED, ContextElement } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const ctx = (over: Partial<ContextElement> = {}): ContextElement => ({
  id: 'ctx-1', elementType: 'event_nature', value: 'birthday dinner', confidence: 'confirmed', sourceRefs: ['req-1'], ...over,
})

const baseFed = (over: Partial<FED> = {}): FED => ({
  fedId: 'fed-1', version: 1, lockStatus: 'draft',
  clientRequest: 'I want a birthday dinner for my wife',
  description: 'An intimate birthday dinner where the guest of honour feels celebrated and surrounded by close family; the evening should feel warm and unhurried.',
  statedContext: [
    ctx(),
    ctx({ id: 'ctx-2', elementType: 'desired_result', value: 'feels celebrated and surrounded by family' }),
    ctx({ id: 'ctx-3', elementType: 'audience_scale', value: 'about 8 close family' }),
    ctx({ id: 'ctx-4', elementType: 'location', value: 'a private room near home' }),
  ],
  openQuestions: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const approved = { approvedBy: 'client-1', action: 'approved' as const, fedVersion: 1, at: '2026-01-01T00:00:00.000Z' }

// ── 1. Valid draft FED ──────────────────────────────────────────────────────────────────
console.log('\n1 — valid draft FED')
{
  const r = validateFedInvariants(baseFed())
  check('clean draft FED passes invariants', r.valid, r.errors.join('; '))
}

// ── 2. Valid locked FED ─────────────────────────────────────────────────────────────────
console.log('\n2 — valid locked FED')
{
  const locked = baseFed({ lockStatus: 'locked', approval: approved })
  const r = validateFedInvariants(locked)
  check('clean locked FED with approval passes invariants', r.valid, r.errors.join('; '))
}

// ── 3. Locked FED without approval rejected ─────────────────────────────────────────────
console.log('\n3 — locked FED without approval rejected')
{
  check('locked FED missing approval → invalid', !validateFedInvariants(baseFed({ lockStatus: 'locked' })).valid)
  check('locked FED with mismatched approval version → invalid', !validateFedInvariants(baseFed({ lockStatus: 'locked', version: 2, approval: { ...approved, fedVersion: 1 } })).valid)
}

// ── 4. Locked FED with critical (planning-essential) open question rejected ─────────────
console.log('\n4 — locked FED with critical open question rejected')
{
  const locked = baseFed({ lockStatus: 'locked', approval: approved, openQuestions: [{ id: 'q1', text: 'How many guests exactly?', planningEssential: true }] })
  check('locked FED with planning-essential open question → invalid', !validateFedInvariants(locked).valid)
  // a NON-essential open question does not block lock
  const lockedOkQ = baseFed({ lockStatus: 'locked', approval: approved, openQuestions: [{ id: 'q2', text: 'Any colour preference?', planningEssential: false }] })
  check('locked FED with only non-essential open question → valid', validateFedInvariants(lockedOkQ).valid, validateFedInvariants(lockedOkQ).errors.join('; '))
}

// ── 5. FED with prohibited content rejected ─────────────────────────────────────────────
console.log('\n5 — FED with prohibited content rejected')
{
  const budget = baseFed({ description: 'A birthday dinner with a budget of $5,000 for catering.' })
  check('budget/cost figure in description → invalid', !validateFedInvariants(budget).valid)
  const timeline = baseFed({ description: 'A birthday dinner. Timeline: 7pm guests arrive, 8pm cake.' })
  check('timeline/schedule in description → invalid', !validateFedInvariants(timeline).valid)
  const vendorCtx = baseFed({ statedContext: [ctx({ value: 'book the caterer and a vendor for the DJ' })] })
  check('prohibited content in a ContextElement value → invalid', !validateFedInvariants(vendorCtx).valid)
  // contradiction (within "no contradictions" invariant)
  const contra = baseFed({ statedContext: [ctx({ elementType: 'location', value: 'the beach', confidence: 'confirmed' }), ctx({ id: 'ctx-x', elementType: 'location', value: 'a ballroom', confidence: 'confirmed' })] })
  check('two differing confirmed locations → contradiction → invalid', !validateFedInvariants(contra).valid)
}

// ── 6. FED versioning ───────────────────────────────────────────────────────────────────
console.log('\n6 — FED versioning')
{
  const locked = baseFed({ lockStatus: 'locked', approval: approved })
  const next = reviseFed(locked, '2026-02-01T00:00:00.000Z')
  check('reviseFed increments version', next.version === locked.version + 1)
  check('reviseFed resets to draft', next.lockStatus === 'draft')
  check('reviseFed clears approval', next.approval === null)
  check('reviseFed keeps fedId (FED identity stable across versions)', next.fedId === locked.fedId)
  check('reviseFed does not mutate the input', locked.version === 1 && locked.lockStatus === 'locked')
}

// ── 7. Locked FED immutability ──────────────────────────────────────────────────────────
console.log('\n7 — locked FED immutability')
{
  const locked = baseFed({ lockStatus: 'locked', approval: approved })
  const inPlaceEdit: FED = { ...locked, description: 'edited in place — illegal' }
  check('in-place edit of a locked version (same id+version) → immutability violation', !checkImmutability(locked, inPlaceEdit).valid)
  const sameLocked: FED = { ...locked }
  check('identical locked snapshot → no violation', checkImmutability(locked, sameLocked).valid)
  const newVersion = reviseFed(locked, '2026-02-01T00:00:00.000Z')
  const editedNewVersion: FED = { ...newVersion, description: 'edited on a NEW draft version — allowed' }
  check('editing a new (different) version → allowed', checkImmutability(locked, editedNewVersion).valid)
  // a draft has no immutability constraint
  check('draft prev imposes no immutability constraint', checkImmutability(baseFed(), { ...baseFed(), description: 'x' }).valid)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

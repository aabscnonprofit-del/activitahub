// OPE V2 — Discovery Engine — Step 1 domain model test.
// Validates the FED Data Contract shape (lib/discovery/fed.ts) against the spec's §5 contract.
//   Run: npx tsx scripts/discovery-domain-test.mts   (or: npm run test:discovery-domain)

import { validateFedShape } from '../lib/discovery/fed'
import type { FutureEventDescription, ContextElement, OpenQuestion } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const ctx = (over: Partial<ContextElement> = {}): ContextElement => ({
  id: 'ctx-1', elementType: 'event_nature', value: 'birthday dinner', confidence: 'confirmed', sourceRefs: ['req-1'], ...over,
})

const baseFed = (over: Partial<FutureEventDescription> = {}): FutureEventDescription => ({
  fedId: 'fed-1', version: 1, lockStatus: 'draft',
  clientRequest: 'I want a birthday dinner for my wife',
  description: 'An intimate birthday dinner; she feels celebrated; result: a warm evening.',
  statedContext: [ctx(), ctx({ id: 'ctx-2', elementType: 'desired_result', value: 'feels celebrated' })],
  openQuestions: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

// ── 1. Valid draft FED shape ──────────────────────────────────────────────────────────
console.log('\n1 — valid draft FED shape')
{
  const r = validateFedShape(baseFed())
  check('valid draft FED passes shape validation', r.valid, r.errors.join('; '))
}

// ── 2. Invalid FED missing required fields ────────────────────────────────────────────
console.log('\n2 — invalid FED missing required fields')
{
  const bad = baseFed({ fedId: '' as unknown as string, description: '' as unknown as string })
  const r = validateFedShape(bad)
  check('missing fedId + description → invalid', !r.valid)
  check('reports fedId and description', r.errors.some((e) => e.includes('fedId')) && r.errors.some((e) => e.includes('description')))
  const noContext = baseFed({ statedContext: [] })
  check('empty statedContext → invalid', !validateFedShape(noContext).valid)
}

// ── 3. Locked FED requires approval ───────────────────────────────────────────────────
console.log('\n3 — locked FED requires approval')
{
  const lockedNoApproval = baseFed({ lockStatus: 'locked' })
  check('locked FED without approval → invalid', !validateFedShape(lockedNoApproval).valid)

  const lockedOk = baseFed({ lockStatus: 'locked', approval: { approvedBy: 'client-1', action: 'approved', fedVersion: 1, at: '2026-01-01T00:00:00.000Z' } })
  check('locked FED with matching approval → valid', validateFedShape(lockedOk).valid, validateFedShape(lockedOk).errors.join('; '))

  const lockedWrongVersion = baseFed({ lockStatus: 'locked', version: 2, approval: { approvedBy: 'client-1', action: 'approved', fedVersion: 1, at: 'x' } })
  check('locked FED with mismatched approval version → invalid', !validateFedShape(lockedWrongVersion).valid)

  const lockedNotApproved = baseFed({ lockStatus: 'locked', approval: { approvedBy: 'client-1', action: 'rejected', fedVersion: 1, at: 'x' } })
  check("locked FED whose approval.action != 'approved' → invalid", !validateFedShape(lockedNotApproved).valid)
}

// ── 4. ContextElement requires source_refs ────────────────────────────────────────────
console.log('\n4 — ContextElement requires source_refs')
{
  const noSrc = baseFed({ statedContext: [ctx({ sourceRefs: [] })] })
  check('ContextElement with empty sourceRefs → invalid', !validateFedShape(noSrc).valid)
  const okSrc = baseFed({ statedContext: [ctx({ sourceRefs: ['req-1', 'turn-3'] })] })
  check('ContextElement with ≥1 sourceRefs → valid', validateFedShape(okSrc).valid)
}

// ── 5. OpenQuestion supports planning_essential ───────────────────────────────────────
console.log('\n5 — OpenQuestion supports planning_essential')
{
  const q: OpenQuestion = { id: 'q1', text: 'How many guests?', planningEssential: true }
  const withQ = baseFed({ openQuestions: [q] })
  const r = validateFedShape(withQ)
  check('FED carrying a planning-essential open question is shape-valid', r.valid, r.errors.join('; '))
  check('planningEssential is a boolean on the type', typeof withQ.openQuestions[0].planningEssential === 'boolean')
  const badQ = baseFed({ openQuestions: [{ id: 'q2', text: 'x', planningEssential: 'yes' as unknown as boolean }] })
  check('OpenQuestion with non-boolean planningEssential → invalid', !validateFedShape(badQ).valid)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

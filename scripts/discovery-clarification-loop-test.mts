// OPE V2 — Discovery Engine — Step 5 Clarification Loop framework test.
//   Run: npx tsx scripts/discovery-clarification-loop-test.mts  (or: npm run test:discovery-loop)

import {
  startSession, addClientTurn, addOrUpdateContextElement, addOpenQuestion, resolveOpenQuestion, mayDraftFed,
} from '../lib/discovery/clarification-loop'
import { NONE_STATED } from '../lib/discovery/readiness'
import type { ContextElement, ContextElementType, DiscoverySession } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const el = (elementType: ContextElementType, value: string, over: Partial<ContextElement> = {}): ContextElement => ({
  id: `ctx-${elementType}`, elementType, value, confidence: 'confirmed', sourceRefs: ['req-1'], ...over,
})
const fullContext = (): ContextElement[] => [
  el('event_nature', 'birthday dinner'),
  el('desired_result', 'feels celebrated'),
  el('audience_scale', 'about 8 close family'),
  el('location', 'a private room near home'),
  el('constraint', NONE_STATED),
]
const start = (initialContext: ContextElement[] = []): DiscoverySession =>
  startSession({ id: 's1', projectId: 'p1', clientId: 'c1', request: { id: 'req-1', text: 'birthday dinner for my wife' }, at: 't0', initialContext })

// ── 1. Insufficient request enters clarification loop ───────────────────────────────────
console.log('\n1 — insufficient request enters clarification loop')
{
  const s = start([el('event_nature', 'birthday dinner')]) // partial only
  check('status → in_discovery', s.status === 'in_discovery')
  check('readiness not_sufficient', s.readiness?.readiness === 'not_sufficient')
  check('mayDraftFed is false', mayDraftFed(s) === false)
  check('client request recorded', s.clientRequest?.id === 'req-1')
}

// ── 2. New answer updates context ───────────────────────────────────────────────────────
console.log('\n2 — new answer updates context')
{
  let s = start([el('event_nature', 'birthday dinner')])
  const r1 = addClientTurn(s, 'It is for about 8 close family', 't1', 'turn-1')
  check('addClientTurn ok', r1.ok)
  if (r1.ok) {
    s = r1.session
    check('conversation grew by one client turn', s.conversation.length === 1 && s.conversation[0].role === 'client')
    const r2 = addOrUpdateContextElement(s, el('audience_scale', 'about 8 close family'), 't1', 'turn-1')
    check('addOrUpdateContextElement ok', r2.ok)
    if (r2.ok) {
      check('context now contains audience_scale', r2.session.contextElements.some((e) => e.elementType === 'audience_scale'))
      check('readiness recomputed after the turn', r2.session.readiness !== null)
    }
  }
}

// ── 3. Resolving a planning-essential question changes readiness ─────────────────────────
console.log('\n3 — resolving a planning-essential question changes readiness')
{
  let s = start(fullContext())
  check('full context starts sufficient (Path A)', s.status === 'readiness_sufficient' && mayDraftFed(s))
  const rAdd = addOpenQuestion(s, { id: 'q1', text: 'How many guests exactly?', planningEssential: true }, 't1', 'turn-1')
  check('adding a planning-essential question → not_sufficient (regression)', rAdd.ok && rAdd.session.status === 'in_discovery' && rAdd.session.readiness?.readiness === 'not_sufficient')
  if (rAdd.ok) {
    s = rAdd.session
    check('mayDraftFed now false', mayDraftFed(s) === false)
    const rResolve = resolveOpenQuestion(s, 'q1', 't2', 'turn-2')
    check('resolving the essential question → sufficient again', rResolve.ok && rResolve.session.status === 'readiness_sufficient' && rResolve.session.readiness?.readiness === 'sufficient')
    if (rResolve.ok) check('mayDraftFed true again', mayDraftFed(rResolve.session))
  }
}

// ── 4. Contradiction triggers readiness regression ──────────────────────────────────────
console.log('\n4 — contradiction triggers readiness regression')
{
  const s = start(fullContext())
  check('starts sufficient', s.status === 'readiness_sufficient')
  const r = addOrUpdateContextElement(s, el('location', 'the beach', { id: 'ctx-loc2' }), 't1', 'turn-1') // 2nd confirmed location
  check('adding a contradicting confirmed location → regression to in_discovery', r.ok && r.session.status === 'in_discovery' && r.session.readiness?.readiness === 'not_sufficient')
  if (r.ok) check('mayDraftFed false after contradiction', mayDraftFed(r.session) === false)
}

// ── 5. No FED draft before readiness sufficient ─────────────────────────────────────────
console.log('\n5 — no FED draft before readiness sufficient')
{
  let s = start([el('event_nature', 'birthday dinner')])
  check('mayDraftFed false while not sufficient', mayDraftFed(s) === false)
  // build up to sufficiency
  for (const e of [el('desired_result', 'feels celebrated'), el('audience_scale', 'about 8'), el('location', 'home'), el('constraint', NONE_STATED)]) {
    const r = addOrUpdateContextElement(s, e, 't1', 'turn-x')
    if (r.ok) s = r.session
    if (e.elementType !== 'constraint') check(`still not draftable after adding ${e.elementType}`, mayDraftFed(s) === false)
  }
  check('mayDraftFed true only once sufficient', mayDraftFed(s) === true)
  check('loop never created a FED (fedVersions stays empty)', s.fedVersions.length === 0)
  // guard: loop op on a non-loop status fails
  const handed = { ...s, status: 'handed_off' as const }
  check('addClientTurn rejected when loop not active', !addClientTurn(handed, 'x', 't', 'turn-z').ok)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

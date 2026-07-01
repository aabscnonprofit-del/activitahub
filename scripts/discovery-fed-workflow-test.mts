// OPE V2 — Discovery Engine — Step 6 FED drafting / presentation / approval test.
//   Run: npx tsx scripts/discovery-fed-workflow-test.mts  (or: npm run test:discovery-workflow)

import { startSession, addOrUpdateContextElement } from '../lib/discovery/clarification-loop'
import { NONE_STATED } from '../lib/discovery/readiness'
import { checkImmutability } from '../lib/discovery/fed-invariants'
import { draftFed, presentFed, approveFed, rejectFed, revise, handoff, handoffReady, currentFed } from '../lib/discovery/fed-workflow'
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

// Helper: reach a presented FED on Path A.
function toPresented(): { session: DiscoverySession } {
  const d = draftFed(start(fullContext()), { fedId: 'fed-1', at: 't1' })
  if (!d.ok) throw new Error('setup draft failed: ' + d.error)
  const p = presentFed(d.session)
  if (!p.ok) throw new Error('setup present failed: ' + p.error)
  return { session: p.session }
}

// ── 1. Path A: sufficient initial request drafts FED without clarification ───────────────
console.log('\n1 — Path A: drafts FED without clarification')
{
  const s = start(fullContext())
  check('initial request is draft-ready (readiness_sufficient)', s.status === 'readiness_sufficient')
  const d = draftFed(s, { fedId: 'fed-1', at: 't1' })
  check('draftFed ok', d.ok, d.ok ? '' : d.error)
  if (d.ok) {
    check('status → fed_drafted', d.session.status === 'fed_drafted')
    check('FED version 1, draft', d.fed.version === 1 && d.fed.lockStatus === 'draft')
    check('no clarification turns were needed', d.session.conversation.length === 0)
    check('FED description is non-empty and contains no prohibited content (validated)', d.fed.description.length > 0)
  }
}

// ── 2. Path B: clarification required before FED drafting ────────────────────────────────
console.log('\n2 — Path B: clarification required first')
{
  let s = start([el('event_nature', 'birthday dinner')]) // insufficient
  const blocked = draftFed(s, { fedId: 'fed-1', at: 't1' })
  check('draftFed blocked while not sufficient', !blocked.ok)
  for (const e of [el('desired_result', 'feels celebrated'), el('audience_scale', 'about 8'), el('location', 'home'), el('constraint', NONE_STATED)]) {
    const r = addOrUpdateContextElement(s, e, 't1', 'turn-x'); if (r.ok) s = r.session
  }
  const d = draftFed(s, { fedId: 'fed-1', at: 't2' })
  check('draftFed ok after clarification reaches sufficiency', d.ok, d.ok ? '' : d.error)
}

// ── 3. FED presentation ─────────────────────────────────────────────────────────────────
console.log('\n3 — FED presentation')
{
  const d = draftFed(start(fullContext()), { fedId: 'fed-1', at: 't1' })
  const p = d.ok ? presentFed(d.session) : { ok: false as const, error: 'no draft' }
  check('presentFed ok → fed_presented', p.ok && p.session.status === 'fed_presented')
  check('cannot present from non-drafted status', !presentFed(start(fullContext())).ok)
}

// ── 4. Approval locks FED ───────────────────────────────────────────────────────────────
console.log('\n4 — approval locks FED')
{
  const { session } = toPresented()
  const a = approveFed(session, { approvedBy: 'client-1', at: 't3' })
  check('approveFed ok', a.ok, a.ok ? '' : a.error)
  if (a.ok) {
    check('status → fed_locked', a.session.status === 'fed_locked')
    check('FED is locked with matching approval', a.fed.lockStatus === 'locked' && a.fed.approval?.action === 'approved' && a.fed.approval?.fedVersion === a.fed.version)
    check('handoffReady true after lock', handoffReady(a.session))
  }
}

// ── 5. Rejection prevents handoff ───────────────────────────────────────────────────────
console.log('\n5 — rejection prevents handoff')
{
  const { session } = toPresented()
  const r = rejectFed(session, { at: 't3' })
  check('rejectFed ok → fed_rejected', r.ok && r.session.status === 'fed_rejected')
  if (r.ok) {
    check('FED was NOT locked', currentFed(r.session)?.lockStatus !== 'locked')
    check('handoffReady false after rejection', handoffReady(r.session) === false)
    check('handoff() refused after rejection', !handoff(r.session, { at: 't4' }).ok)
  }
}

// ── 6. Revision creates a new version ───────────────────────────────────────────────────
console.log('\n6 — revision creates a new version')
{
  const { session } = toPresented()
  const v = revise(session, { at: 't3' })
  check('revise ok', v.ok, v.ok ? '' : v.error)
  if (v.ok) {
    check('new version created (v2)', v.fed.version === 2 && v.fed.lockStatus === 'draft' && v.fed.approval === null)
    check('version history retained (2 versions)', v.session.fedVersions.length === 2)
    check('status returns to fed_drafted (re-presentable)', v.session.status === 'fed_drafted')
    const p2 = presentFed(v.session)
    check('the revised version can be presented again', p2.ok && p2.session.status === 'fed_presented')
  }
}

// ── 7. Handoff only after approval and lock ─────────────────────────────────────────────
console.log('\n7 — handoff only after approval and lock')
{
  const d = draftFed(start(fullContext()), { fedId: 'fed-1', at: 't1' })
  check('not handoff-ready at fed_drafted', d.ok && !handoffReady(d.session))
  const p = d.ok ? presentFed(d.session) : { ok: false as const }
  check('not handoff-ready at fed_presented', p.ok && !handoffReady(p.session))
  check('handoff() refused before lock', p.ok && !handoff(p.session, { at: 't9' }).ok)
  const a = p.ok ? approveFed(p.session, { approvedBy: 'client-1', at: 't3' }) : { ok: false as const }
  check('handoff-ready after lock', a.ok && handoffReady(a.session))
  const h = a.ok ? handoff(a.session, { at: 't4' }) : { ok: false as const }
  check('handoff ok after lock → handed_off (terminal), carries the locked FED', h.ok && h.session.status === 'handed_off' && h.fed.lockStatus === 'locked')
}

// ── 8. Locked FED cannot be modified ────────────────────────────────────────────────────
console.log('\n8 — locked FED cannot be modified')
{
  const { session } = toPresented()
  const a = approveFed(session, { approvedBy: 'client-1', at: 't3' })
  if (a.ok) {
    const locked = a.fed
    check('draftFed refused after lock', !draftFed(a.session, { fedId: 'fed-2', at: 't5' }).ok)
    check('presentFed refused after lock', !presentFed(a.session).ok)
    check('approveFed refused after lock', !approveFed(a.session, { approvedBy: 'x', at: 't5' }).ok)
    check('rejectFed refused after lock', !rejectFed(a.session, { at: 't5' }).ok)
    check('revise refused after lock', !revise(a.session, { at: 't5' }).ok)
    const h = handoff(a.session, { at: 't4' })
    check('locked FED unchanged through handoff (immutability)', h.ok && checkImmutability(locked, currentFed(h.session)!).valid && JSON.stringify(currentFed(h.session)) === JSON.stringify(locked))
  } else {
    check('setup approve ok', false, a.error)
  }
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

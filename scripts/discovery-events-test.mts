// OPE V2 — Discovery Engine — Step 7 domain event model test.
//   Run: npx tsx scripts/discovery-events-test.mts  (or: npm run test:discovery-events)

import { startSession, addClientTurn, addOrUpdateContextElement } from '../lib/discovery/clarification-loop'
import { draftFed, presentFed, approveFed, rejectFed, handoff } from '../lib/discovery/fed-workflow'
import { pauseSession, resumeSession, abandonSession } from '../lib/discovery/events'
import { NONE_STATED } from '../lib/discovery/readiness'
import { DISCOVERY_EVENT_TYPES } from '../lib/discovery/types'
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
  el('event_nature', 'birthday dinner'), el('desired_result', 'feels celebrated'),
  el('audience_scale', 'about 8 close family'), el('location', 'a private room near home'),
  el('constraint', NONE_STATED),
]
const start = (initialContext: ContextElement[] = []): DiscoverySession =>
  startSession({ id: 's1', projectId: 'p1', clientId: 'c1', request: { id: 'req-1', text: 'birthday dinner' }, at: 't0', initialContext })

const types = (s: DiscoverySession) => s.events.map((e) => e.type)
const delta = (before: DiscoverySession, after: DiscoverySession) => after.events.slice(before.events.length).map((e) => e.type)

// ── 0. Enum reconciliation sanity ───────────────────────────────────────────────────────
console.log('\n0 — canonical event enum')
{
  const set = DISCOVERY_EVENT_TYPES as readonly string[]
  check('no removed duplicate/sourceless events', !set.includes('discovery.started') && !set.includes('discovery.turn_recorded') && !set.includes('discovery.answer_received') && !set.includes('discovery.assumption_added') && !set.includes('discovery.question_asked'))
  check('input_rejected is defined (reserved)', set.includes('discovery.input_rejected'))
}

// ── 1. Event emitted on session start (+ 2. readiness evaluated) ─────────────────────────
console.log('\n1–2 — session start + readiness evaluation')
{
  const s = start(fullContext())
  check('session start emits session_started then readiness_evaluated, exactly', JSON.stringify(types(s)) === JSON.stringify(['discovery.session_started', 'discovery.readiness_evaluated']))
  check('readiness_evaluated is present', types(s).includes('discovery.readiness_evaluated'))
}

// ── 3. Event emitted on context update (no duplicates) ──────────────────────────────────
console.log('\n3 — context update')
{
  const s0 = start(fullContext())
  const r = addOrUpdateContextElement(s0, el('mandatory_moment', 'the toast must happen'), 't1', 'turn-1')
  check('addOrUpdateContextElement ok', r.ok)
  if (r.ok) check('emits exactly [context_updated, readiness_evaluated]', JSON.stringify(delta(s0, r.session)) === JSON.stringify(['discovery.context_updated', 'discovery.readiness_evaluated']))
  // a client turn emits [turn_received, readiness_evaluated]
  const t = addClientTurn(s0, 'about 8 of us', 't1', 'turn-1')
  if (t.ok) check('client turn emits exactly [turn_received, readiness_evaluated]', JSON.stringify(delta(s0, t.session)) === JSON.stringify(['discovery.turn_received', 'discovery.readiness_evaluated']))
}

// ── 4. Event emitted on FED draft (no duplicates) ───────────────────────────────────────
console.log('\n4 — FED draft')
{
  const s0 = start(fullContext())
  const d = draftFed(s0, { fedId: 'fed-1', at: 't1' })
  check('draftFed ok', d.ok)
  if (d.ok) check('draft emits exactly [fed_drafted]', JSON.stringify(delta(s0, d.session)) === JSON.stringify(['discovery.fed_drafted']))
}

// ── 5. Event emitted on FED approval / lock (exactly once each) ─────────────────────────
console.log('\n5 — FED approval / lock')
{
  const d = draftFed(start(fullContext()), { fedId: 'fed-1', at: 't1' })
  const p = d.ok ? presentFed(d.session) : { ok: false as const }
  const a = p.ok ? approveFed(p.session, { approvedBy: 'client-1', at: 't3' }) : { ok: false as const }
  check('approve ok', a.ok)
  if (a.ok && p.ok) {
    check('approve emits exactly [fed_approved, fed_locked]', JSON.stringify(delta(p.session, a.session)) === JSON.stringify(['discovery.fed_approved', 'discovery.fed_locked']))
    check('exactly one fed_locked total', types(a.session).filter((t) => t === 'discovery.fed_locked').length === 1)
  }
  if (p.ok) check('present emitted exactly [fed_presented]', JSON.stringify(delta(d.ok ? d.session : p.session, p.session)) === JSON.stringify(['discovery.fed_presented']))
}

// ── 6. No duplicate events across the full happy path ───────────────────────────────────
console.log('\n6 — no duplicate events for one transition (full path)')
{
  let s = start(fullContext())
  const d = draftFed(s, { fedId: 'fed-1', at: 't1' }); s = d.ok ? d.session : s
  const p = presentFed(s); s = p.ok ? p.session : s
  const a = approveFed(s, { approvedBy: 'client-1', at: 't3' }); s = a.ok ? a.session : s
  const seq = types(s)
  check('full sequence is exactly the expected order', JSON.stringify(seq) === JSON.stringify([
    'discovery.session_started', 'discovery.readiness_evaluated',
    'discovery.fed_drafted', 'discovery.fed_presented',
    'discovery.fed_approved', 'discovery.fed_locked',
  ]))
}

// ── 7. Terminal handoff emits final event ───────────────────────────────────────────────
console.log('\n7 — terminal handoff emits final event')
{
  const d = draftFed(start(fullContext()), { fedId: 'fed-1', at: 't1' })
  const p = d.ok ? presentFed(d.session) : { ok: false as const }
  const a = p.ok ? approveFed(p.session, { approvedBy: 'client-1', at: 't3' }) : { ok: false as const }
  const h = a.ok ? handoff(a.session, { at: 't4' }) : { ok: false as const }
  check('handoff ok → handed_off', h.ok && h.session.status === 'handed_off')
  if (h.ok && a.ok) {
    check('handoff emits exactly [handoff_ready]', JSON.stringify(delta(a.session, h.session)) === JSON.stringify(['discovery.handoff_ready']))
    check('handoff_ready is the final event', types(h.session)[types(h.session).length - 1] === 'discovery.handoff_ready')
  }
}

// ── 8. Pause / resume / abandon events ──────────────────────────────────────────────────
console.log('\n8 — pause / resume / abandon events')
{
  const s0 = start([el('event_nature', 'x')]) // in_discovery
  const ps = pauseSession(s0, 't5')
  check('pauseSession ok → paused, emits session_paused', ps.ok && ps.session.status === 'paused' && delta(s0, ps.session).join() === 'discovery.session_paused')
  if (ps.ok) {
    const rs = resumeSession(ps.session, 't6')
    check('resumeSession ok → in_discovery, emits session_resumed', rs.ok && rs.session.status === 'in_discovery' && delta(ps.session, rs.session).join() === 'discovery.session_resumed')
    if (rs.ok) {
      const ab = abandonSession(rs.session, 't7')
      check('abandonSession ok → abandoned, emits session_abandoned', ab.ok && ab.session.status === 'abandoned' && delta(rs.session, ab.session).join() === 'discovery.session_abandoned')
    }
  }
  // rejection emits fed_rejected (and no handoff_ready)
  const d = draftFed(start(fullContext()), { fedId: 'fed-1', at: 't1' })
  const p = d.ok ? presentFed(d.session) : { ok: false as const }
  const rj = p.ok ? rejectFed(p.session, { at: 't3' }) : { ok: false as const }
  if (rj.ok && p.ok) check('reject emits exactly [fed_rejected], no handoff_ready', JSON.stringify(delta(p.session, rj.session)) === JSON.stringify(['discovery.fed_rejected']) && !types(rj.session).includes('discovery.handoff_ready'))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

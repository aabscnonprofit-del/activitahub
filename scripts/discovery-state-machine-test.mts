// OPE V2 — Discovery Engine — Step 2 state machine test.
// Exercises lifecycle status transitions (lib/discovery/state-machine.ts) per spec §13.
//   Run: npx tsx scripts/discovery-state-machine-test.mts  (or: npm run test:discovery-state)

import {
  transition, pause, resume, abandon, canTransition, isTerminalStatus, isActiveStatus,
} from '../lib/discovery/state-machine'
import type { DiscoverySession, DiscoveryStatus } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const mkSession = (status: DiscoveryStatus, pausedFrom: DiscoveryStatus | null = null): DiscoverySession => ({
  id: 's1', projectId: 'p1', clientId: 'c1', status, pausedFrom,
  clientRequest: null, conversation: [], contextElements: [], openQuestions: [],
  fedVersions: [], readiness: null, events: [], createdAt: 't', updatedAt: 't',
})

function runPath(start: DiscoveryStatus, path: DiscoveryStatus[]): { ok: boolean; final?: DiscoveryStatus; err?: string } {
  let s = mkSession(start)
  for (const to of path) {
    const r = transition(s, to)
    if (!r.ok) return { ok: false, err: `${s.status}→${to}: ${r.error}` }
    s = r.session
  }
  return { ok: true, final: s.status }
}

// ── 1. Valid transition path ───────────────────────────────────────────────────────────
console.log('\n1 — valid transition path')
{
  const happy = runPath('created', ['in_discovery', 'readiness_sufficient', 'fed_drafted', 'fed_presented', 'fed_approved', 'fed_locked', 'handed_off'])
  check('full happy path created → handed_off', happy.ok && happy.final === 'handed_off', happy.err)
  check('Path A: created → readiness_sufficient → fed_drafted', runPath('created', ['readiness_sufficient', 'fed_drafted']).ok)
  check('readiness regression: fed_drafted → in_discovery', runPath('created', ['in_discovery', 'readiness_sufficient', 'fed_drafted', 'in_discovery']).ok)
  check('rejection returns to loop: fed_rejected → in_discovery', runPath('created', ['in_discovery', 'readiness_sufficient', 'fed_drafted', 'fed_presented', 'fed_rejected', 'in_discovery']).ok)
  // purity
  const s0 = mkSession('created'); transition(s0, 'in_discovery')
  check('transition is pure (input unchanged)', s0.status === 'created' && s0.pausedFrom === null)
  // logical "one active per project"
  check('active while non-terminal, inactive when terminal', isActiveStatus('in_discovery') && isActiveStatus('paused') && !isActiveStatus('handed_off') && !isActiveStatus('abandoned'))
}

// ── 2. Invalid transition rejection ────────────────────────────────────────────────────
console.log('\n2 — invalid transition rejection')
{
  check('created → fed_locked rejected', !transition(mkSession('created'), 'fed_locked').ok)
  check('in_discovery → handed_off rejected', !transition(mkSession('in_discovery'), 'handed_off').ok)
  check('fed_drafted → handed_off rejected', !transition(mkSession('fed_drafted'), 'handed_off').ok)
  check('fed_approved → handed_off (must lock first) rejected', !transition(mkSession('fed_approved'), 'handed_off').ok)
  check('canTransition false for an illegal target', !canTransition(mkSession('created'), 'fed_approved'))
  check('canTransition true for a legal target', canTransition(mkSession('fed_approved'), 'fed_locked'))
}

// ── 3. Pause / resume ──────────────────────────────────────────────────────────────────
console.log('\n3 — pause / resume')
{
  const p = pause(mkSession('in_discovery'))
  check('pause from in_discovery → paused, remembers origin', p.ok && p.session.status === 'paused' && p.session.pausedFrom === 'in_discovery')
  const rs = p.ok ? resume(p.session) : { ok: false as const }
  check('resume restores in_discovery and clears pausedFrom', rs.ok && rs.session.status === 'in_discovery' && rs.session.pausedFrom === null)
  check('resume when not paused → error', !resume(mkSession('in_discovery')).ok)
  check('double pause → error', !pause(mkSession('paused', 'in_discovery')).ok)
  const p2 = pause(mkSession('fed_presented'))
  check('pause from fed_presented remembers fed_presented', p2.ok && p2.session.pausedFrom === 'fed_presented')
  const p3 = pause(mkSession('fed_locked'))
  check('pause from fed_locked allowed (non-terminal), remembers fed_locked', p3.ok && p3.session.pausedFrom === 'fed_locked')
}

// ── 4. Abandon ─────────────────────────────────────────────────────────────────────────
console.log('\n4 — abandon')
{
  const a = abandon(mkSession('in_discovery'))
  check('abandon from in_discovery → abandoned', a.ok && a.session.status === 'abandoned')
  const ap = abandon(mkSession('paused', 'fed_drafted'))
  check('abandon from paused → abandoned', ap.ok && ap.session.status === 'abandoned')
  check('abandon from abandoned → error (terminal)', !abandon(mkSession('abandoned')).ok)
  check('abandon from handed_off → error (terminal)', !abandon(mkSession('handed_off')).ok)
}

// ── 5. handed_off terminal behavior ────────────────────────────────────────────────────
console.log('\n5 — handed_off terminal behavior')
{
  check('handed_off is terminal', isTerminalStatus('handed_off'))
  check('no transition out of handed_off', !transition(mkSession('handed_off'), 'fed_locked').ok)
  check('no pause from handed_off', !pause(mkSession('handed_off')).ok)
  check('handed_off has no outgoing for any target', (['in_discovery', 'fed_locked', 'abandoned', 'paused'] as DiscoveryStatus[]).every((t) => !transition(mkSession('handed_off'), t).ok))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

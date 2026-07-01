// OPE V2 — Module 4 — Phase 2 Workspace Lifecycle & Gates test.
//   Run: npx tsx scripts/workspace-lifecycle-test.mts  (or: npm run test:workspace-lifecycle)

import { openWorkspace, setActivityStatus, validateWorkspace, isWorkspaceRefusal } from '../lib/organizer-workspace/workspace'
import { advancePhase, recordGateDecision, requiredGatesFor, isGateApproved } from '../lib/organizer-workspace/lifecycle'
import { assembleProject, isProjectRefusal } from '../lib/project/assembly'
import type { Project } from '../lib/project/types'
import type { Workspace, GateDecider } from '../lib/organizer-workspace/types'
import type { ImplementationRequirements } from '../lib/ope-engine/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const prov = () => [{ fedVersion: 1, source: 'description' as const }]
const HUMAN: GateDecider = { id: 'org-1', kind: 'human' }
const AI: GateDecider = { id: 'ai-1', kind: 'ai' }

const baseIr = (): ImplementationRequirements => ({
  ir_id: 'ir-1', version: 1, status: 'current', fedRef: { fedId: 'fed-1', fedVersion: 1 }, providerRef: { providerId: 'p', providerVersion: '1' },
  requirements: [
    { id: 'r1', description: 'Confirm the venue', phase: 'preparation', derivedFrom: prov() },
    { id: 'r2', description: 'Run the dinner', phase: 'day_of', derivedFrom: prov() },
  ],
  resourceNeeds: [], roleNeeds: [],
  dependencies: [{ fromRequirementId: 'r1', toRequirementId: 'r2', type: 'finish_to_start' }],
  risks: [],
  timeline: [{ id: 't1', phase: 'preparation', name: 'Preparation' }, { id: 't2', phase: 'day_of', name: 'Day of' }],
  costEstimate: { status: 'unpriced', range: null, lineItems: [], note: null }, createdAt: 't0',
})
const buildProject = (): Project => { const r = assembleProject(baseIr()); if (isProjectRefusal(r)) throw new Error(r.reason); return r }
const open = (): Workspace => { const r = openWorkspace(buildProject(), { at: 't0' }); if (isWorkspaceRefusal(r)) throw new Error(r.reason); return r }
const ws = (r: { ok: true; workspace: Workspace } | { ok: false }): Workspace => (r as { workspace: Workspace }).workspace

// ── 1. Gates seeded at open ─────────────────────────────────────────────────────────────
console.log('\n1 — gates seeded at open')
{
  const w = open()
  check('phase starts at planning', w.phase === 'planning')
  check('a required go_no_go gate guards ready, undecided', w.gates.length === 1 && w.gates[0].id === 'go_no_go' && w.gates[0].guardsPhase === 'ready' && w.gates[0].required && w.gates[0].decision === null)
  check('requiredGatesFor(ready) = [go_no_go]', requiredGatesFor(w, 'ready').map((g) => g.id).join() === 'go_no_go')
  check('validateWorkspace passes', validateWorkspace(w).valid, validateWorkspace(w).errors.join('; '))
}

// ── 2. Advance planning → preparation (no required gate) ─────────────────────────────────
console.log('\n2 — advance planning → preparation')
{
  const r = advancePhase(open(), 'preparation', { at: 't1' })
  check('advance succeeds', r.ok)
  if (r.ok) {
    check('phase is preparation', r.workspace.phase === 'preparation')
    check('journal records workspace.phase_advanced (planning→preparation)', r.workspace.journal.at(-1)!.type === 'workspace.phase_advanced' && eq(r.workspace.journal.at(-1)!.payload, { from: 'planning', to: 'preparation' }))
    check('validateWorkspace passes in preparation', validateWorkspace(r.workspace).valid)
  }
}

// ── 3. Cannot move to ready without the gate approved ───────────────────────────────────
console.log('\n3 — ready blocked without approved gate')
{
  const prep = ws(advancePhase(open(), 'preparation', { at: 't1' }))
  const r = advancePhase(prep, 'ready', { at: 't2' })
  check('advance to ready rejected (gate not approved)', !r.ok && r.rejection.reason === 'gate_not_approved')
  // blocked / needs_change do NOT unlock ready
  const blocked = ws(recordGateDecision(prep, 'go_no_go', { outcome: 'blocked', decidedBy: HUMAN, at: 't2' }))
  check('blocked gate still blocks ready', !advancePhase(blocked, 'ready', { at: 't3' }).ok)
  const needs = ws(recordGateDecision(prep, 'go_no_go', { outcome: 'needs_change', decidedBy: HUMAN, at: 't2' }))
  check('needs_change gate still blocks ready', !advancePhase(needs, 'ready', { at: 't3' }).ok)
}

// ── 4. Gate decisions are HUMAN-owned — AI must not decide ──────────────────────────────
console.log('\n4 — human-owned gate decisions')
{
  const prep = ws(advancePhase(open(), 'preparation', { at: 't1' }))
  const r = recordGateDecision(prep, 'go_no_go', { outcome: 'approved', decidedBy: AI, at: 't2' })
  check('AI approval rejected (decision_not_human)', !r.ok && r.rejection.reason === 'decision_not_human')
  const auto = recordGateDecision(prep, 'go_no_go', { outcome: 'approved', decidedBy: { id: 'bot', kind: 'automation' }, at: 't2' })
  check('automation approval rejected', !auto.ok && auto.rejection.reason === 'decision_not_human')
  check('human approval accepted', recordGateDecision(prep, 'go_no_go', { outcome: 'approved', decidedBy: HUMAN, at: 't2' }).ok)
}

// ── 5. Full go/no-go path → ready ───────────────────────────────────────────────────────
console.log('\n5 — approved gate → advance to ready')
let READY: Workspace
{
  let w = ws(advancePhase(open(), 'preparation', { at: 't1' }))
  const gd = recordGateDecision(w, 'go_no_go', { outcome: 'approved', decidedBy: HUMAN, at: 't2', note: 'all confirmed' })
  check('gate decision recorded', gd.ok)
  w = ws(gd)
  check('gate now approved (latest decision)', isGateApproved(w.gates[0]) && w.gates[0].decision!.decidedBy.kind === 'human')
  check('gate.decision_recorded journaled', w.journal.at(-1)!.type === 'gate.decision_recorded')
  const adv = advancePhase(w, 'ready', { at: 't3' })
  check('advance to ready succeeds with approved gate', adv.ok)
  READY = ws(adv)
  check('phase is ready', READY.phase === 'ready')
  check('validateWorkspace passes at ready', validateWorkspace(READY).valid, validateWorkspace(READY).errors.join('; '))
}

// ── 6. Freeze at ready ──────────────────────────────────────────────────────────────────
console.log('\n6 — frozen at ready')
{
  check('setActivityStatus after ready → phase_locked', (() => { const r = setActivityStatus(READY, 'wp-r1', 'done', 't4'); return !r.ok && r.rejection.reason === 'phase_locked' })())
  check('recordGateDecision after ready → phase_locked', (() => { const r = recordGateDecision(READY, 'go_no_go', { outcome: 'approved', decidedBy: HUMAN, at: 't4' }); return !r.ok && r.rejection.reason === 'phase_locked' })())
  check('advancePhase from ready → invalid_transition (terminal)', (() => { const r = advancePhase(READY, 'ready' as never, { at: 't4' }); return !r.ok && r.rejection.reason === 'invalid_transition' })())
}

// ── 7. Invalid transitions ──────────────────────────────────────────────────────────────
console.log('\n7 — invalid transitions')
{
  const w = open()
  check('skip planning → ready → invalid_transition', (() => { const r = advancePhase(w, 'ready', { at: 't1' }); return !r.ok && r.rejection.reason === 'invalid_transition' })())
  const prep = ws(advancePhase(w, 'preparation', { at: 't1' }))
  check('backward preparation → planning → invalid_transition', (() => { const r = advancePhase(prep, 'planning', { at: 't2' }); return !r.ok && r.rejection.reason === 'invalid_transition' })())
  check('garbage target phase → invalid_transition', (() => { const r = advancePhase(w, 'nope' as never, { at: 't1' }); return !r.ok && r.rejection.reason === 'invalid_transition' })())
}

// ── 8. Gate rejections ──────────────────────────────────────────────────────────────────
console.log('\n8 — gate decision rejections')
{
  const w = open()
  check('unknown gate → unknown_gate', (() => { const r = recordGateDecision(w, 'nope', { outcome: 'approved', decidedBy: HUMAN }); return !r.ok && r.rejection.reason === 'unknown_gate' })())
  check('invalid outcome → invalid_decision_outcome', (() => { const r = recordGateDecision(w, 'go_no_go', { outcome: 'maybe' as never, decidedBy: HUMAN }); return !r.ok && r.rejection.reason === 'invalid_decision_outcome' })())
}

// ── 9. Append-only journal + re-decision history + lineage untouched ────────────────────
console.log('\n9 — append-only journal, lineage integrity')
{
  const w0 = open()
  const lineage0 = JSON.stringify(w0.lineage)
  let w = ws(advancePhase(w0, 'preparation', { at: 't1' }))
  w = ws(recordGateDecision(w, 'go_no_go', { outcome: 'needs_change', decidedBy: HUMAN, at: 't2' }))
  w = ws(recordGateDecision(w, 'go_no_go', { outcome: 'approved', decidedBy: HUMAN, at: 't3' }))
  const types = w.journal.map((j) => j.type)
  check('journal seqs are 1..n monotonic', eq(w.journal.map((j) => j.seq), [1, 2, 3, 4]))
  check('journal records every lifecycle/gate change in order', eq(types, ['workspace.opened', 'workspace.phase_advanced', 'gate.decision_recorded', 'gate.decision_recorded']))
  check('re-decision is append-only (both recorded; gate holds latest = approved)', w.gates[0].decision!.outcome === 'approved' && w.journal.filter((j) => j.type === 'gate.decision_recorded').length === 2)
  check('prior journal entries never mutated', w.journal[0].type === 'workspace.opened' && w.journal[0].seq === 1)
  check('lineage NOT modified by lifecycle/gate ops', JSON.stringify(w.lineage) === lineage0)
}

// ── 10. Cannot bypass human decision (the only path to ready) ───────────────────────────
console.log('\n10 — cannot bypass human decision')
{
  // No sequence of non-human actions can reach ready: advancing requires the human-approved gate.
  let w = ws(advancePhase(open(), 'preparation', { at: 't1' }))
  // AI tries to approve → rejected; gate stays undecided; advance still blocked.
  recordGateDecision(w, 'go_no_go', { outcome: 'approved', decidedBy: AI })
  check('after AI attempt, gate still undecided', w.gates[0].decision === null)
  check('advance to ready still blocked', !advancePhase(w, 'ready', { at: 't2' }).ok)
  // Only a human approval unlocks it.
  w = ws(recordGateDecision(w, 'go_no_go', { outcome: 'approved', decidedBy: HUMAN, at: 't2' }))
  check('human approval is the only unlock', advancePhase(w, 'ready', { at: 't3' }).ok)
}

// ── 11. validateWorkspace integrity: ready with unapproved gate is invalid ──────────────
console.log('\n11 — validation integrity')
{
  const bad = { ...open(), phase: 'ready' as const } // forced into ready with the gate still undecided
  check('hand-forced ready + unapproved gate → validateWorkspace invalid', !validateWorkspace(bad).valid)
  check('a stored AI gate decision → validateWorkspace invalid', (() => {
    const w = open()
    const tampered = { ...w, gates: [{ ...w.gates[0], decision: { outcome: 'approved' as const, decidedBy: AI, at: 't' } }] }
    return !validateWorkspace(tampered).valid
  })())
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

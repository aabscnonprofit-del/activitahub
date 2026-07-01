// Stage 6C — native EventPlanV2 → IR mapper test.
//   Run: npx tsx scripts/event-plan-v2-to-ir-test.mts

import { eventPlanV2ToIr } from '../lib/planning/event-plan-v2-to-ir'
import { validateImplementationRequirements, validateIrInvariants } from '../lib/ope-engine/ir'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'
import type { FutureEventDescription } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// A verified-shape FED (only the fields the mapper reads: fedId, version, updatedAt). statedContext
// ids are supplied so the invariants' context check has a real set to validate against.
const fed: FutureEventDescription = {
  fedId: 'fed-x', version: 1, lockStatus: 'locked',
  clientRequest: 'a relaxed birthday dinner with live music for my wife',
  description: 'A relaxed birthday dinner with live music; she feels celebrated.',
  statedContext: [
    { id: 'ctx-1', elementType: 'event_nature', value: 'birthday dinner', confidence: 'confirmed', sourceRefs: ['req-1'] },
    { id: 'ctx-2', elementType: 'location', value: 'Honolulu, USA', confidence: 'confirmed', sourceRefs: ['req-1'] },
  ],
  openQuestions: [], approval: { approvedBy: 'c', action: 'approved', fedVersion: 1, at: 't' },
  createdAt: 't0', updatedAt: 't0',
}

const t = (servesIntention: string) => ({ servesIntention })

// A hand-built EventPlanV2 with known content, to assert precise mapping/phase derivation.
const plan: EventPlanV2 = {
  experienceDesign: { intendedFeeling: 'relaxing', arc: 'dinner → music', trace: t('x') },
  structure: { concept: 'A relaxed evening', trace: t('x') },
  itinerary: [
    { name: 'The meal', purpose: 'Delivers the dining the client asked for', timing: 'first', origin: 'client_intention', trace: t('dining') },
    { name: 'Music', purpose: 'Delivers the music the client asked for', timing: 'finally', origin: 'client_intention', trace: t('music') },
  ],
  logistics: [
    { description: 'Reserve a dining setting matching the desired ambiance', forMoment: 'The meal', origin: 'client_intention', trace: t('dining') },
    { description: 'Arrange the music/sound', forMoment: 'Music', origin: 'client_intention', trace: t('music') },
  ],
  resources: [
    { label: 'A dining setting matching the desired ambiance', forMoment: 'The meal', origin: 'client_intention', trace: t('dining') },
    { label: 'Music / sound provision', forMoment: 'Music', origin: 'client_intention', trace: t('music') },
  ],
  staffing: [
    { role: 'Event coordinator', reason: 'Keeps the evening running smoothly', trace: t('coordination') },
  ],
  suitability: [],
  safety: [
    { risk: 'Outdoor exposure (sun, heat, footing)', safeguard: 'Shade, water, and weather-appropriate timing' },
  ],
  contingencies: [
    { ifThisFails: 'The chosen dining setting falls through', fallback: 'An alternative venue with a similar ambiance' },
  ],
  costEstimate: { low: 400, likely: 500, high: 650, currency: 'USD', basis: 'Nominal planning estimate from 2 resource need(s) and 1 role(s); to be priced in Budget.' },
  feasibility: { verdict: 'planned', notes: 'Planned from the client’s intention.' },
  assumptions: [],
  originalIntention: 'a relaxed birthday dinner with live music for my wife',
}

const ir = eventPlanV2ToIr(fed, plan)

// ── 1. Structural validity ──────────────────────────────────────────────────────────────
console.log('\n1 — mapper output passes validateImplementationRequirements')
{
  const v = validateImplementationRequirements(ir)
  check('IR is structurally valid', v.valid, v.errors.join('; '))
}

// ── 2. IR invariants (FED↔IR traceability + content prohibitions) ───────────────────────
console.log('\n2 — mapper output passes validateIrInvariants')
{
  const v = validateIrInvariants(ir, { fedId: fed.fedId, fedVersion: fed.version, contextElementIds: new Set(fed.statedContext.map((c) => c.id)) })
  check('IR satisfies invariants against the FED', v.valid, v.errors.join('; '))
}

// ── 3. Phase derivation is predictable ──────────────────────────────────────────────────
console.log('\n3 — phase derivation: logistics → preparation, itinerary → day_of')
{
  const prep = ir.requirements.filter((r) => r.phase === 'preparation')
  const day = ir.requirements.filter((r) => r.phase === 'day_of')
  const after = ir.requirements.filter((r) => r.phase === 'after')
  check('2 preparation requirements (from logistics)', prep.length === 2, `got ${prep.length}`)
  check('2 day_of requirements (from itinerary)', day.length === 2, `got ${day.length}`)
  check('0 after requirements (EventPlanV2 models no post-event work)', after.length === 0, `got ${after.length}`)
  check('timeline declares exactly the phases used', ir.timeline.map((t2) => t2.phase).sort().join(',') === 'day_of,preparation')
  check('every requirement.phase has a matching timeline element', ir.requirements.every((r) => ir.timeline.some((tl) => tl.phase === r.phase)))
}

// ── 4. Provenance on every substantive element ──────────────────────────────────────────
console.log('\n4 — provenance: every requirement/resource/role/risk has valid derivedFrom')
{
  const subst = [...ir.requirements, ...ir.resourceNeeds, ...ir.roleNeeds, ...ir.risks]
  check('all substantive elements carry derivedFrom ≥1', subst.every((e) => Array.isArray(e.derivedFrom) && e.derivedFrom.length >= 1))
  check('all provenance fedVersion matches the FED', subst.every((e) => e.derivedFrom.every((p) => p.fedVersion === fed.version)))
  check('all provenance source is description-level', subst.every((e) => e.derivedFrom.every((p) => p.source === 'description')))
}

// ── 5. Resource/role needs populated (the intentional semantic difference vs frozen) ────
console.log('\n5 — resource/role needs are populated from EventPlanV2 (frozen emitted none)')
{
  check('resourceNeeds = 2 (from resources[])', ir.resourceNeeds.length === 2, `got ${ir.resourceNeeds.length}`)
  check('roleNeeds = 1 (from staffing[])', ir.roleNeeds.length === 1, `got ${ir.roleNeeds.length}`)
  check('resource basis is unspecified, quantity null (no scaling in EventPlanV2)', ir.resourceNeeds.every((n) => n.basis === 'unspecified' && n.quantity === null))
  check('role basis is unspecified, count null', ir.roleNeeds.every((n) => n.basis === 'unspecified' && n.count === null))
}

// ── 6. Risks from safety + contingencies; cost from EventPlanV2 range ────────────────────
console.log('\n6 — risks (safety+contingency) and cost estimate')
{
  check('risks = 2 (1 safety + 1 contingency)', ir.risks.length === 2, `got ${ir.risks.length}`)
  check('safety risk severity medium, contingency severity low',
    ir.risks.some((r) => r.id.startsWith('risk-safety') && r.severity === 'medium') &&
    ir.risks.some((r) => r.id.startsWith('risk-contingency') && r.severity === 'low'))
  check('costEstimate is estimated with the EventPlanV2 range', ir.costEstimate.status === 'estimated' && ir.costEstimate.range?.likely === 500)
  check('dependencies empty (no graph in EventPlanV2 — same as frozen)', ir.dependencies.length === 0)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

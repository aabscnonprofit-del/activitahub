// OPE Output Contract V1 — assembler/validator test.
//
// Proves: all 8 sections present; budget/risks/timeline map verbatim from the
// deterministic PlannerOutput; and a minimal/empty plan (no breakdown, no risks,
// no timeline, no venue) assembles without crashing into safe empties + explicit
// organizer-decision items.
//
//   Run:  npx tsx scripts/ope-output-contract-test.mts   (or: npm run test:ope-contract)
//
// Exit 0 = all assertions pass. Exit 1 = failure.

import { generatePlan } from '../lib/ope/index'
import { assembleOpeOutput, validateOpeOutput } from '../lib/ope/output-contract'
import type { PlannerInput, PlannerOutput } from '../lib/ope/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`)
  } else {
    failures++
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const SECTIONS = [
  'event_summary', 'timeline', 'resources', 'staffing',
  'venue_requirements', 'budget', 'risks', 'organizer_decisions_required',
] as const

function assertAllSections(label: string, o: Record<string, unknown>) {
  for (const s of SECTIONS) check(`${label}: has ${s}`, s in o && o[s] !== undefined)
}

// ── Case A: real priced plan — verbatim mapping ─────────────────────────────
console.log('Case A — priced plan (birthday/honolulu/kids):')
{
  const input: PlannerInput = {
    category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
    specialRequirements: ['superhero theme', 'nut allergy'],
    location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: '96815' },
  }
  const res = generatePlan(input)
  check('A: plan_ready', res.status === 'plan_ready' && res.plan !== null)
  const plan = res.plan as PlannerOutput
  const out = assembleOpeOutput(plan)

  assertAllSections('A', out as unknown as Record<string, unknown>)

  const v = validateOpeOutput(out)
  check('A: validator ok', v.ok, `missing=${v.missing.join(',')} issues=${v.issues.join('; ')}`)

  // Budget maps verbatim (no recompute).
  check('A: budget.is_priced matches', out.budget.is_priced === plan.section_c_budget.is_priced)
  check('A: budget.estimate matches',
    JSON.stringify(out.budget.estimate) === JSON.stringify(plan.section_c_budget.estimate ?? null))
  check('A: budget.breakdown length matches',
    out.budget.breakdown.length === (plan.section_c_budget.breakdown?.length ?? 0))
  check('A: budget currency/source preserved',
    out.budget.pricing_source === plan.section_c_budget.pricing_source &&
    out.budget.is_fallback === plan.section_c_budget.is_fallback)

  // Risks map verbatim.
  const srcRisks = plan.section_d_key_risks.risks
  check('A: risks length matches', out.risks.length === srcRisks.length)
  if (srcRisks.length) {
    check('A: first risk mapped',
      out.risks[0].name === srcRisks[0].name &&
      out.risks[0].severity === srcRisks[0].severity &&
      out.risks[0].mitigation === srcRisks[0].mitigation)
  }

  // Timeline maps verbatim.
  const srcTl = plan.section_b_your_plan.timeline
  check('A: timeline length matches', out.timeline.length === srcTl.length)
  if (srcTl.length) {
    check('A: first phase mapped',
      out.timeline[0].name === srcTl[0].name &&
      out.timeline[0].when === srcTl[0].when &&
      out.timeline[0].goal === srcTl[0].goal)
  }

  // Event summary minimums.
  check('A: headcount.total === guest_count',
    out.event_summary.headcount.total === plan.section_a_what_you_told_us.guest_count)
  check('A: resources derived from breakdown',
    out.resources.length === (plan.section_c_budget.breakdown?.length ?? 0))
}

// ── Case B: real fallback plan — surfaces a budget decision ─────────────────
console.log('Case B — fallback-priced plan (birthday/berlin):')
{
  const input: PlannerInput = {
    category: 'birthday', guestCount: 20, adults: 8, kids: 12, venueType: 'backyard_home', budget: 600,
    specialRequirements: ['superhero theme'],
    location: { city: 'Berlin', state: null, country: 'Germany', postalCode: null },
  }
  const res = generatePlan(input)
  const plan = res.plan as PlannerOutput
  const out = assembleOpeOutput(plan)
  assertAllSections('B', out as unknown as Record<string, unknown>)
  check('B: validator ok', validateOpeOutput(out).ok)
  if (plan.section_c_budget.is_fallback) {
    check('B: fallback surfaces a budget decision',
      out.organizer_decisions_required.some((d) => d.impacts === 'budget'))
  } else {
    console.log('  (note) plan not fallback in this environment — skipping fallback-decision assertion')
  }
}

// ── Case C: minimal/empty plan — must not crash, safe empties + decisions ───
console.log('Case C — minimal/empty PlannerOutput (resilience):')
{
  const empty: PlannerOutput = {
    _meta: { kind: 'plan', format: 'v1', modules_used: [], ai_layer: 'off' },
    section_a_what_you_told_us: {
      activity_type: 'gathering', guest_count: 0, guest_breakdown: null, age_group: 'mixed',
      venue_type: null, location: { city: '', country: '' }, region: '', budget: null, special_requirements: [],
    },
    section_b_your_plan: {
      summary: null, headline: null, timeline: [],
      preparation_checklist: [], day_of_checklist: [], after_event_checklist: [],
    },
    section_c_budget: { is_priced: false, pricing_source: 'none', is_fallback: false, fallback_note: null },
    section_d_key_risks: { risks: [], excluded_conditional: [] },
    section_e_ready_messages: {},
    section_f_upgrade_path: { current_scale: 0, threshold_hint: null, text: null },
  }

  let out: ReturnType<typeof assembleOpeOutput> | null = null
  let threw = false
  try {
    out = assembleOpeOutput(empty)
  } catch {
    threw = true
  }
  check('C: assembler does not throw on empty plan', !threw && out !== null)
  if (out) {
    assertAllSections('C', out as unknown as Record<string, unknown>)
    check('C: validator ok (all sections present)', validateOpeOutput(out).ok)
    check('C: timeline empty array', Array.isArray(out.timeline) && out.timeline.length === 0)
    check('C: resources empty array', Array.isArray(out.resources) && out.resources.length === 0)
    check('C: staffing self_serviceable when no staff',
      out.staffing.roles.length === 0 && out.staffing.staffing_status === 'self_serviceable')
    check('C: venue_requirements present with null venue_type',
      out.venue_requirements.venue_type === null && Array.isArray(out.venue_requirements.must_haves))
    check('C: budget unpriced flagged', out.budget.is_priced === false && out.budget.estimate === null)
    check('C: risks empty array', Array.isArray(out.risks) && out.risks.length === 0)
    check('C: unpriced + no-venue surface organizer decisions',
      out.organizer_decisions_required.some((d) => d.id === 'budget_unpriced') &&
      out.organizer_decisions_required.some((d) => d.id === 'venue_choose'))
  }
}

console.log('')
if (failures === 0) {
  console.log('OPE Output Contract V1 OK — all 8 sections assembled; budget/risks/timeline map verbatim; empty plan is resilient.')
  process.exit(0)
} else {
  console.log(`OPE Output Contract V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

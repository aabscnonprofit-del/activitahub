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

  // Budget linkage preserved: every priced line appears as a budget-linked resource.
  const linked = new Set(out.resources.map((r) => r.linked_budget_item_key).filter(Boolean))
  const allLinesLinked = (plan.section_c_budget.breakdown ?? []).every((l) => linked.has(l.item_key))
  check('A: every budget line is a linked resource', allLinesLinked)
  check('A: resource classification (venue=space, food/cake=material)',
    out.resources.every((r) =>
      !(/venue/.test(r.id) && r.type !== 'space') &&
      !(/cake|food/.test(r.id) && r.type !== 'material')))

  // Staffing improvement: a kids birthday with no staff line derives a Host role.
  check('A: staffing derived (Host) for birthday with no staff line',
    out.staffing.roles.some((r) => /host/i.test(r.role)) && out.staffing.staffing_status === 'unknown')
  check('A: derived staff is a resource (type staff, not budget-linked)',
    out.resources.some((r) => r.type === 'staff' && r.linked_budget_item_key === null))
  check('A: low-confidence staffing creates an organizer decision',
    out.organizer_decisions_required.some((d) => d.id === 'staffing_estimated'))
}

// ── Case E: bbq derives a Host (no staff budget line) ───────────────────────
console.log('Case E — bbq staffing derivation:')
{
  const input: PlannerInput = {
    category: 'bbq', guestCount: 30, adults: 24, kids: 6, venueType: 'public_park', budget: 450,
    specialRequirements: ['vegetarian options'],
    location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
  }
  const out = assembleOpeOutput(generatePlan(input).plan as PlannerOutput)
  check('E: validator ok', validateOpeOutput(out).ok)
  check('E: Host role derived', out.staffing.roles.some((r) => r.role === 'Host'))
  check('E: Host headcount estimated as 1', out.staffing.roles.find((r) => r.role === 'Host')?.headcount === 1)
  check('E: staffing_status unknown (derived)', out.staffing.staffing_status === 'unknown')
  check('E: staffing_estimated decision present',
    out.organizer_decisions_required.some((d) => d.id === 'staffing_estimated'))
}

// ── Case F: class instructor comes from the BUDGET line (staff is a resource) ─
console.log('Case F — class instructor from budget line:')
{
  const input: PlannerInput = {
    category: 'fitness_class', guestCount: 12, adults: 12, kids: 0, venueType: null, budget: null,
    specialRequirements: ['yoga'], instructor: 'need', materials: 'provided',
    location: { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null },
  }
  const plan = generatePlan(input).plan as PlannerOutput
  const out = assembleOpeOutput(plan)
  check('F: validator ok', validateOpeOutput(out).ok)
  const instructor = out.staffing.roles.find((r) => /instructor/i.test(r.role))
  check('F: instructor role present from budget', !!instructor)
  check('F: instructor resource is budget-linked (not derived)',
    out.resources.some((r) => r.type === 'staff' && r.linked_budget_item_key !== null))
  check('F: staffing_status needs_hiring (priced staff, none derived)', out.staffing.staffing_status === 'needs_hiring')
  check('F: priced staff → staffing_source decision (not estimated)',
    out.organizer_decisions_required.some((d) => d.id === 'staffing_source') &&
    !out.organizer_decisions_required.some((d) => d.id === 'staffing_estimated'))
}

// ── Case G: venue null + derived staffing → venue-affects-staffing decision ──
console.log('Case G — venue assumption affects staffing (hand-built):')
{
  const built: PlannerOutput = {
    _meta: { kind: 'plan', format: 'v1', modules_used: [], ai_layer: 'off' },
    section_a_what_you_told_us: {
      activity_type: 'BBQ / Family Picnic', guest_count: 30, guest_breakdown: null, age_group: 'mixed',
      venue_type: null, location: { city: 'X', country: 'Y' }, region: 'Y', budget: null, special_requirements: [],
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
  const out = assembleOpeOutput(built)
  check('G: Host derived despite no budget', out.staffing.roles.some((r) => r.role === 'Host'))
  check('G: venue_affects_staffing decision present',
    out.organizer_decisions_required.some((d) => d.id === 'venue_affects_staffing'))
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
      // Unrecognized type → no staff derivation (keeps this a pure empty-resilience case).
      activity_type: 'unspecified', guest_count: 0, guest_breakdown: null, age_group: 'mixed',
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

// ── Case D: read-path guard — saved result with no plan → null, no crash ────
// Mirrors the plan-detail read path: `result.plan ? assembleOpeOutput(plan) : null`.
console.log('Case D — read-path guard (saved plan with no PlannerOutput):')
{
  const guard = (plan: PlannerOutput | null) => (plan ? assembleOpeOutput(plan) : null)
  check('D: null plan yields null OpeOutput (no crash)', guard(null) === null)

  // A non-ready generation (needs_clarification / unsupported) carries plan === null;
  // the guard must produce null for it too.
  const sparse = generatePlan({
    category: 'birthday', guestCount: 1,
    location: { city: '', state: null, country: '', postalCode: null },
  } as PlannerInput)
  const out = guard(sparse.plan)
  check('D: guard is safe for a real non-ready result',
    sparse.plan === null ? out === null : out !== null && validateOpeOutput(out).ok)
}

console.log('')
if (failures === 0) {
  console.log('OPE Output Contract V1 OK — all 8 sections assembled; budget/risks/timeline map verbatim; empty plan is resilient.')
  process.exit(0)
} else {
  console.log(`OPE Output Contract V1 FAILED — ${failures} assertion(s) failed.`)
  process.exit(1)
}

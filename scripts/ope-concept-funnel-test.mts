// Concept Funnel V1 — deterministic pre-stage test (see docs/OPE_CONCEPT_FUNNEL_V1.md).
//
// Proves: a vague/themed idea produces CONCEPT OPTIONS before any plan; an operationally
// clear brief BYPASSES the funnel; selecting a concept lets the UNCHANGED planning pipeline
// continue; the output contract is well-formed; and the stage is deterministic.
//
//   Run:  npx tsx scripts/ope-concept-funnel-test.mts   (or: npm run test:concept)

import {
  runConceptFunnel,
  selectConcept,
  assessConceptEntry,
  type ConceptFunnelResult,
  type ConceptOption,
} from '../lib/ope/concept-funnel'
import { planFromIdea } from '../lib/ope/concept-plan'
import { generatePlan } from '../lib/ope/index'
import type { PlannerInput, PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const OPTION_FIELDS: (keyof ConceptOption)[] = [
  'title', 'interpretation', 'mood', 'suitable_for', 'risks_or_safety_notes', 'why_this_matches_request',
]
function optionWellFormed(o: ConceptOption): boolean {
  return OPTION_FIELDS.every((f) => typeof o[f] === 'string' && (o[f] as string).trim().length > 0)
}

// ── Case 1 — Antarctica (the acceptance example): options BEFORE any plan ─────────────
console.log('\nCase 1 — "Antarctica-themed birthday party for my children"')
{
  const req = 'I want an Antarctica-themed birthday party for my children.'
  const r = runConceptFunnel(req)
  check('status = concept_selection_needed', r.status === 'concept_selection_needed', r.status)
  check('detected_event_category = birthday', r.detected_event_category === 'birthday', String(r.detected_event_category))
  check('>= 3 concept options', r.concept_options.length >= 3, String(r.concept_options.length))
  check('options reference the theme "Antarctica"', r.concept_options.every((o) => /antarctica/i.test(o.title)))
  check('all options well-formed (6 fields each)', r.concept_options.every(optionWellFormed))
  check('children → safety note mentions supervision/child-safety', r.concept_options.some((o) => /child|supervis|age-appropriate/i.test(o.risks_or_safety_notes)))
  check('selected_concept is null before choosing', r.selected_concept === null)
  check('clarification_prompt is present', r.clarification_prompt.trim().length > 0)

  // ACCEPTANCE: planFromIdea with no selection produces options and NO plan.
  const out = planFromIdea(req, LOC)
  check('planFromIdea → stage "concept" (no plan yet)', out.stage === 'concept', out.stage)
  check('planFromIdea → plan is null at concept stage', out.plan === null)
}

// ── Case 2 — Operationally clear brief: BYPASS ────────────────────────────────────────
console.log('\nCase 2 — "Plan a BBQ for 12 adults at Ala Moana Beach on Saturday 2pm–6pm with a $600 budget"')
{
  const req = 'Plan a BBQ for 12 adults at Ala Moana Beach on Saturday from 2pm to 6pm with a $600 budget.'
  const r = runConceptFunnel(req)
  check('status = bypass_concept_funnel', r.status === 'bypass_concept_funnel', r.status)
  check('no concept options on bypass', r.concept_options.length === 0)

  const out = planFromIdea(req, LOC)
  check('planFromIdea → stage "plan" (bypass continues to pipeline)', out.stage === 'plan', out.stage)
  // It reaches the real planner; a clear BBQ brief is buildable and produces a plan envelope.
  check('planFromIdea → built a PlannerInput', out.stage === 'plan' && out.input !== null)
  check('planFromIdea → planner returned a result', out.stage === 'plan' && out.plan !== null)
}

// ── Case 3 — Concept selected → normal planning continues ─────────────────────────────
console.log('\nCase 3 — themed idea WITH headcount, then a concept is selected')
{
  const req = 'An Antarctica-themed birthday for 12 children.'
  const out = planFromIdea(req, LOC, { selection: 0 })
  check('funnel recorded a selected_concept', out.funnel.selected_concept !== null)
  check('funnel status = concept_selected', out.funnel.status === 'concept_selected', out.funnel.status)
  check('stage = plan (pipeline continued after selection)', out.stage === 'plan', out.stage)
  check('a PlannerInput was built', out.stage === 'plan' && out.input !== null)
  check('a plan result was produced', out.stage === 'plan' && out.plan !== null)
  // The deterministic plan is unchanged by the concept (direction is captured, not costed in V1).
  if (out.stage === 'plan' && out.input) {
    const direct = generatePlan(out.input as PlannerInput)
    check('plan status matches a direct generatePlan on the same input', out.plan?.status === direct.status, `${out.plan?.status} vs ${direct.status}`)
  }
}

// ── Case 4 — Vague, NO theme: still explores DIRECTION (style lenses) ─────────────────
console.log('\nCase 4 — vague, un-themed: "I want a birthday party for my kid"')
{
  const r = runConceptFunnel('I want a birthday party for my kid')
  check('status = concept_selection_needed', r.status === 'concept_selection_needed', r.status)
  check('produces style/direction options', r.concept_options.length >= 3, String(r.concept_options.length))
  check('options well-formed', r.concept_options.every(optionWellFormed))
}

// ── Case 5 — selectConcept by title, and status contract ─────────────────────────────
console.log('\nCase 5 — selection by title + status enum')
{
  const r = runConceptFunnel('A jungle-themed birthday for my daughter')
  const title = r.concept_options[1]?.title ?? ''
  const sel = selectConcept(r, title)
  check('selecting by title sets selected_concept', sel.selected_concept?.title === title)
  check('status becomes concept_selected', sel.status === 'concept_selected')
  const valid = new Set(['concept_selection_needed', 'concept_selected', 'bypass_concept_funnel'])
  check('all statuses are within the contract enum', valid.has(r.status) && valid.has(sel.status))
}

// ── Case 6 — determinism ──────────────────────────────────────────────────────────────
console.log('\nCase 6 — deterministic')
{
  const req = 'I want an Antarctica-themed birthday party for my children.'
  const a = runConceptFunnel(req)
  const b = runConceptFunnel(req)
  check('same input → identical result', JSON.stringify(a) === JSON.stringify(b))
  const sig = assessConceptEntry(req)
  check('assessConceptEntry exposes theme = Antarctica', sig.theme === 'Antarctica', String(sig.theme))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

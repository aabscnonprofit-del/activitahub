// Idea-first public planner flow test (see docs/OPE_CONCEPT_FUNNEL_V1.md).
//
// Proves the corrected AI-first entry: the primary planner action consumes a RAW IDEA and
// returns CONCEPT OPTIONS before any plan; an operationally-clear brief bypasses; selecting
// a concept lets the UNCHANGED engine plan; AI is off in tests so the deterministic fallback
// runs; and the live PlannerClient is idea-first (not questionnaire-first).
//
//   Run:  npx tsx scripts/ope-idea-flow-test.mts   (or: npm run test:idea)

import { readFileSync } from 'node:fs'
import { analyzeIdeaAction } from '../lib/actions/planner'
import { planFromIdeaCore } from '../lib/ope/plan-from-idea'
import { runConceptFunnelAI } from '../lib/ai/concept-generation'
import { runConceptFunnel, deriveWhatShouldHappen } from '../lib/ope/concept-funnel'
import type { PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// ── 1. Primary entry takes RAW TEXT and returns concepts, NOT a plan ─────────────────
console.log('\n1 — analyzeIdeaAction (the primary entry) consumes raw idea text')
{
  check('analyzeIdeaAction is a function', typeof analyzeIdeaAction === 'function')
  const res = await analyzeIdeaAction('I want an Antarctica-themed birthday party for my children.')
  check('returns ok', res.ok === true)
  if (res.ok) {
    check('AnalyzeIdeaResult carries a funnel, NOT a plan', !('plan' in res) && !('result' in res))
    check('status = concept_selection_needed', res.funnel.status === 'concept_selection_needed', res.funnel.status)
    check('>= 3 concept options BEFORE any plan', res.funnel.concept_options.length >= 3, String(res.funnel.concept_options.length))
    check('options reference the theme "Antarctica"', res.funnel.concept_options.every((o) => /antarctica/i.test(o.title)))
    check('prefill detected category = birthday', res.prefill.category === 'birthday', String(res.prefill.category))
  }
}

// ── 2. Acceptance: Antarctica → concepts before plan; then select → plan ─────────────
console.log('\n2 — Antarctica: concepts first, then planning continues after selection')
{
  const idea = 'An Antarctica-themed birthday for 12 children.'
  const analysis = await analyzeIdeaAction(idea)
  check('Antarctica analysis needs concept selection', analysis.ok && analysis.funnel.status === 'concept_selection_needed')
  if (analysis.ok) {
    const chosen = analysis.funnel.concept_options[0]
    const planned = await planFromIdeaCore({
      idea,
      selectedConcept: chosen,
      approvedWhatShouldHappen: deriveWhatShouldHappen(idea),
      details: { category: 'birthday', guestCount: 12, kids: 12 },
      location: LOC,
    })
    check('planning after selection returns ok', planned.ok === true)
    if (planned.ok) {
      const s = planned.result.status
      check('engine ran (plan_ready or needs_clarification — clarification AFTER concept)', s === 'plan_ready' || s === 'needs_clarification', s)
    }
  }
}

// ── 3. Operationally clear BBQ → bypass concept selection ─────────────────────────────
console.log('\n3 — operationally clear BBQ bypasses the Concept Funnel')
{
  const res = await analyzeIdeaAction('Plan a BBQ for 12 adults at Ala Moana Beach on Saturday from 2pm to 6pm with a $600 budget.')
  check('returns ok', res.ok === true)
  if (res.ok) {
    check('status = bypass_concept_funnel', res.funnel.status === 'bypass_concept_funnel', res.funnel.status)
    check('no concept options on bypass', res.funnel.concept_options.length === 0)
    check('prefill carried category=bbq, guests=12, budget=600', res.prefill.category === 'bbq' && res.prefill.guestCount === 12 && res.prefill.budget === 600)
  }
}

// ── 4. Open-ended proposal idea → concepts before plan (deterministic generic; AI = rich) ─
console.log('\n4 — "propose to my girlfriend in a beautiful way" → concepts before plan')
{
  const res = await analyzeIdeaAction('I want to propose to my girlfriend in a beautiful way.')
  check('returns ok', res.ok === true)
  if (res.ok) {
    check('status = concept_selection_needed (no immediate plan)', res.funnel.status === 'concept_selection_needed', res.funnel.status)
    check('>= 1 concept option offered', res.funnel.concept_options.length >= 1, String(res.funnel.concept_options.length))
  }
}

// ── 5. AI off → runConceptFunnelAI === deterministic Concept Funnel ──────────────────
console.log('\n5 — AI disabled: AI funnel falls back to the deterministic funnel')
{
  const idea = 'I want an Antarctica-themed birthday party for my children.'
  const ai = await runConceptFunnelAI(idea)
  const det = runConceptFunnel(idea)
  check('AI-off funnel equals deterministic funnel', JSON.stringify(ai) === JSON.stringify(det))
}

// ── 6. The live PlannerClient is IDEA-FIRST, not questionnaire-first ─────────────────
console.log('\n6 — /plan-an-event PlannerClient is idea-first (source guardrail)')
{
  const src = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')
  check('imports the idea-first action (analyzeIdeaAction)', src.includes('analyzeIdeaAction'))
  check('initial step is "idea"', /useState<Step>\(\s*'idea'\s*\)/.test(src))
  check('shows the required first-screen copy', src.includes('Tell us what you want to create.'))
  check('first screen renders a free-text textarea, not the category form', src.includes('<textarea'))
  // Convergence: the legacy category questionnaire is GONE. After the idea/discovery, the flow
  // goes to the WSH approval step and then straight into planning — no structured category grid.
  check('no legacy category questionnaire remains (idea → WSH → planning)',
    !src.includes('sectionActivity') && src.includes("step === 'wsh'"))
}

// ── 7. License CTA is NOT nested inside any planner <form> (nested forms are invalid HTML
//      and silently break the Stripe checkout submit). BuyEventLicenseButton renders its own
//      <form>. After convergence the CTA lives in the WSH step, which has NO <form> at all —
//      so it can never be nested. The WSH step is emitted before the idea/discovery forms, so
//      the CTA precedes every onSubmit form in the source. ────────────────────────────────
console.log('\n7 — BuyEventLicenseButton is not nested inside any planner <form>')
{
  const src = readFileSync(new URL('../components/planner/PlannerClient.tsx', import.meta.url), 'utf8')
  const ctaIdx = src.indexOf('<BuyEventLicenseButton')
  const firstFormIdx = src.indexOf('onSubmit=')
  check('BuyEventLicenseButton is rendered (license gate)', ctaIdx > -1)
  check('license CTA is not nested in any planner <form> (it precedes every form)',
    ctaIdx > -1 && firstFormIdx > -1 && ctaIdx < firstFormIdx)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

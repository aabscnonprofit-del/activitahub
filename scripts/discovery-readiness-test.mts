// OPE V2 — Discovery Engine — Step 4 Planning Readiness Evaluation test.
//   Run: npx tsx scripts/discovery-readiness-test.mts  (or: npm run test:discovery-readiness)

import { evaluateReadiness, REQUIRED_SINGULAR, NONE_STATED } from '../lib/discovery/readiness'
import type { ContextElement, ContextElementType, OpenQuestion } from '../lib/discovery/types'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const el = (elementType: ContextElementType, value: string, over: Partial<ContextElement> = {}): ContextElement => ({
  id: `ctx-${elementType}`, elementType, value, confidence: 'confirmed', sourceRefs: ['req-1'], ...over,
})

// A full, planning-ready set: the four singular elements + an explicit "none stated" constraint.
const fullSet = (): ContextElement[] => [
  el('event_nature', 'birthday dinner'),
  el('desired_result', 'feels celebrated'),
  el('audience_scale', 'about 8 close family'),
  el('location', 'a private room near home'),
  el('constraint', NONE_STATED),
]
const without = (type: ContextElementType): ContextElement[] => fullSet().filter((e) => e.elementType !== type)
const sufficient = (els: ContextElement[], qs: OpenQuestion[] = []) => evaluateReadiness(els, qs).readiness === 'sufficient'

// ── 1. All required elements present → sufficient ───────────────────────────────────────
console.log('\n1 — all required present → sufficient')
{
  const r = evaluateReadiness(fullSet(), [])
  check('full set is sufficient', r.readiness === 'sufficient', r.reason)
}

// ── 2–5. Missing each singular required element → not_sufficient ─────────────────────────
console.log('\n2–5 — missing a singular required element → not_sufficient')
{
  check('missing event_nature → not_sufficient', !sufficient(without('event_nature')))
  check('missing desired_result → not_sufficient', !sufficient(without('desired_result')))
  check('missing audience_scale → not_sufficient', !sufficient(without('audience_scale')))
  check('missing location → not_sufficient', !sufficient(without('location')))
}

// ── 6. Constraints/moments requirement ──────────────────────────────────────────────────
console.log('\n6 — constraints/mandatory moments requirement')
{
  check('missing constraints/moments without explicit none → not_sufficient', !sufficient(without('constraint')))
  // explicit "none stated" satisfies it
  check('explicit "none stated" → sufficient', sufficient(fullSet()))
  // a real constraint also satisfies it
  const withRealConstraint = [...without('constraint'), el('constraint', 'no alcohol')]
  check('a real constraint → sufficient', sufficient(withRealConstraint))
  // a mandatory_moment also satisfies it
  const withMoment = [...without('constraint'), el('mandatory_moment', 'the toast must happen')]
  check('a mandatory_moment → sufficient', sufficient(withMoment))
}

// ── 7. Planning-essential open question blocks; non-essential does not ───────────────────
console.log('\n7 — planning-essential open question')
{
  const essential: OpenQuestion = { id: 'q1', text: 'How many guests exactly?', planningEssential: true }
  check('planning-essential open question → not_sufficient', !sufficient(fullSet(), [essential]))
  const nonEssential: OpenQuestion = { id: 'q2', text: 'Any colour preference?', planningEssential: false }
  check('non-essential open question → still sufficient', sufficient(fullSet(), [nonEssential]))
}

// ── 8. Contradicted ContextElement → not_sufficient ─────────────────────────────────────
console.log('\n8 — contradicted ContextElement')
{
  const contra = [...fullSet(), el('location', 'the beach', { id: 'ctx-loc2' })] // two differing confirmed locations
  check('two differing confirmed locations → not_sufficient', !sufficient(contra))
}

// ── 9. Excluded fields never block sufficiency ──────────────────────────────────────────
console.log('\n9 — excluded fields (date/budget/vendors/resources) never block')
{
  // The full set has NO date/budget/vendor/staffing/resource/logistics info, yet it is sufficient.
  check('no date/budget/vendor/resource info present, still sufficient', sufficient(fullSet()))
  const excluded = ['date', 'time', 'schedule', 'budget', 'cost', 'vendor', 'vendors', 'staffing', 'resources', 'logistics']
  check('REQUIRED_SINGULAR contains none of the excluded planning fields', REQUIRED_SINGULAR.every((t) => !excluded.includes(t)))
  check('REQUIRED_SINGULAR is exactly the 4 contract elements', REQUIRED_SINGULAR.length === 4)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

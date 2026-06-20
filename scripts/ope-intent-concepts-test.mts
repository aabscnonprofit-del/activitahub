// Intent-concept quality test — proves the deterministic Concept Funnel produces
// ORGANIZER-QUALITY, input-specific concept directions for vague/emotional/creative dreams
// (AI OFF). It FAILS if any required example returns generic mood labels
// (Relaxed / Active / Special) and checks that titles/interpretations are specific to the input.
//
//   Run:  npx tsx scripts/ope-intent-concepts-test.mts   (or: npm run test:intent)

import { runConceptFunnel } from '../lib/ope/concept-funnel'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// A concept is "generic" if its title is one of the mood-only fallbacks.
const GENERIC = /(Relaxed (and|&) Social|Active (and|&) Playful|Special (and|&) Memorable)\b/i
function noneGeneric(titles: string[]): boolean {
  return titles.every((t) => !GENERIC.test(t))
}
function joined(titles: string[], interps: string[], whys: string[]): string {
  return [...titles, ...interps, ...whys].join(' • ').toLowerCase()
}

function probe(idea: string) {
  const r = runConceptFunnel(idea)
  const titles = r.concept_options.map((o) => o.title)
  const interps = r.concept_options.map((o) => o.interpretation)
  const whys = r.concept_options.map((o) => o.why_this_matches_request)
  const risks = r.concept_options.map((o) => o.risks_or_safety_notes)
  return { r, titles, interps, whys, risks, blob: joined(titles, interps, whys) }
}

// 1 — Antarctica birthday → Antarctica-specific
console.log('\n1 — Antarctica-themed birthday (children)')
{
  const p = probe('I want an Antarctica-themed birthday party for my children.')
  check('status concept_selection_needed', p.r.status === 'concept_selection_needed', p.r.status)
  check('>=3 options', p.titles.length >= 3, String(p.titles.length))
  check('every title is Antarctica-specific', p.titles.every((t) => /antarctica/i.test(t)))
  check('NO generic mood labels', noneGeneric(p.titles), JSON.stringify(p.titles))
}

// 2 — Proposal → proposal-specific
console.log('\n2 — Marriage proposal')
{
  const p = probe('I want to propose to my girlfriend in a beautiful way.')
  check('status concept_selection_needed', p.r.status === 'concept_selection_needed')
  check('>=3 options', p.titles.length >= 3, String(p.titles.length))
  check('proposal-specific (titles mention proposal)', p.titles.filter((t) => /proposal/i.test(t)).length >= 3, JSON.stringify(p.titles))
  check('content mentions proposal-direction words', /sunset|dinner|surprise|adventure|rooftop|private/.test(p.blob))
  check('NO generic mood labels', noneGeneric(p.titles), JSON.stringify(p.titles))
}

// 3 — Luxury yoga → luxury/wellness-specific
console.log('\n3 — Yoga for very rich people')
{
  const p = probe('I want a yoga event for very rich people.')
  check('status concept_selection_needed', p.r.status === 'concept_selection_needed')
  check('>=3 options', p.titles.length >= 3, String(p.titles.length))
  check('luxury/wellness-specific content', /luxur|premium|villa|retreat|oceanfront|executive|high-end|wellness/.test(p.blob), p.blob.slice(0, 120))
  check('NO generic mood labels', noneGeneric(p.titles), JSON.stringify(p.titles))
}

// 4 — Elderly retirement → elderly-safe evening concepts
console.log('\n4 — Evening activity for elderly in a retirement home')
{
  const p = probe('I want an evening activity for elderly people in a retirement home.')
  check('status concept_selection_needed', p.r.status === 'concept_selection_needed')
  check('>=3 options', p.titles.length >= 3, String(p.titles.length))
  check('elderly-appropriate content', /gentle|memory|chair|storytelling|tea|movement|seated/.test(p.blob), p.blob.slice(0, 120))
  check('safety notes address access/mobility/hearing', p.risks.some((s) => /access|mobility|seat|hearing|step-free|fall|choking/i.test(s)))
  check('NO generic mood labels', noneGeneric(p.titles), JSON.stringify(p.titles))
}

// 5 — Feng shui coworking → feng-shui/workspace concepts
console.log('\n5 — Coworking event based on feng shui')
{
  const p = probe('I want a coworking event based on feng shui.')
  check('status concept_selection_needed', p.r.status === 'concept_selection_needed')
  check('>=3 options', p.titles.length >= 3, String(p.titles.length))
  check('feng-shui / workspace content', /workspace|coworking|feng|flow|desk|focus|energy|productivity/.test(p.blob), p.blob.slice(0, 120))
  check('NO generic mood labels', noneGeneric(p.titles), JSON.stringify(p.titles))
}

// 6 — Operational BBQ → bypass still works
console.log('\n6 — Operationally clear BBQ bypasses')
{
  const p = probe('Plan a BBQ for 12 adults at Ala Moana Beach on Saturday from 2pm to 6pm with a $600 budget.')
  check('status bypass_concept_funnel', p.r.status === 'bypass_concept_funnel', p.r.status)
  check('no options on bypass', p.titles.length === 0)
}

// Cross-check: all five creative examples must have meaningfully DIFFERENT options.
console.log('\n7 — options are meaningfully different (distinct titles per idea)')
for (const idea of [
  'I want to propose to my girlfriend in a beautiful way.',
  'I want a yoga event for very rich people.',
  'I want an evening activity for elderly people in a retirement home.',
  'I want a coworking event based on feng shui.',
]) {
  const p = probe(idea)
  check(`distinct titles — ${idea.slice(0, 32)}…`, new Set(p.titles).size === p.titles.length && p.titles.length >= 3)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Intent Discovery V3 — Slice 1 acceptance (AI-driven).
//
// Verifies the AI-driven Discovery slice against docs/DISCOVERY_PRODUCT_BEHAVIOR_SPEC.md. The AI decision is
// injected via the `complete` seam (canned model JSON — no network, no keyword logic), so the tests exercise
// how Discovery behaves given the AI's decision: understand → at most ONE meaning-question → re-evaluate →
// statement of understanding, with the non-goals enforced.
//
//   Run:  npx tsx scripts/intent-discovery-v3-test.mts

import { readFileSync } from 'node:fs'
import { discoverIntent, type DiscoverIntentOptions } from '../lib/intent-discovery/discover-intent'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}
const FIELD_WORDS = /\bbudget\b|how many|guest|head ?count|\bwhen\b|\bwhere\b|\bvenue\b|\bdate\b|vendor|timeline|\$/i

/** Build an options object whose AI seam returns a fixed decision (as the model would). */
const ai = (decision: object): DiscoverIntentOptions => ({ complete: async () => JSON.stringify(decision) })

// SKIP — AI understands → understood, statement passed through, no question.
{
  const r = await discoverIntent(
    { message: 'a small backyard birthday party for my son' },
    ai({ understandable: true, clarificationQuestion: null, statementOfUnderstanding: "So you'd like a relaxed backyard birthday for your son. Have I got that right?" }),
  )
  check('AI understands → understood', r.status === 'understood')
  check('AI understands → statement passed through', r.status === 'understood' && /have i got that right/i.test(r.statementOfUnderstanding))
  check('AI understands → no question exposed', r.status === 'understood' && !('question' in r))
}

// EMOTIONAL — AI understands the desired feeling, asks nothing (the exact V2-failure case).
{
  const r = await discoverIntent(
    { message: 'I want my dad to feel like a king' },
    ai({ understandable: true, clarificationQuestion: null, statementOfUnderstanding: 'So the heart of this is your dad feeling honoured and celebrated. Have I got that right?' }),
  )
  check('emotional → understood (not intake)', r.status === 'understood')
  check('emotional → statement carries no fields', r.status === 'understood' && !FIELD_WORDS.test(r.statementOfUnderstanding))
}

// TOO THIN — AI asks exactly one meaning question → passed through as the clarification.
{
  const r = await discoverIntent(
    { message: 'help me plan something' },
    ai({ understandable: false, clarificationQuestion: 'What are you hoping this will be — what should happen, or how should it feel?', statementOfUnderstanding: null }),
  )
  check('too vague → needs_clarification', r.status === 'needs_clarification')
  check('one meaning question passed through', r.status === 'needs_clarification' && /what should happen|how should it feel/i.test(r.question))
  check('clarification asks no fields', r.status === 'needs_clarification' && !FIELD_WORDS.test(r.question))
}

// GUARD — if the AI drifts and asks a forbidden planning field, Discovery substitutes a safe meaning question.
{
  const r = await discoverIntent(
    { message: 'a get-together' },
    ai({ understandable: false, clarificationQuestion: 'What is your budget and how many guests?', statementOfUnderstanding: null }),
  )
  check('forbidden-field AI question → sanitized', r.status === 'needs_clarification' && !FIELD_WORDS.test(r.question))
  check('sanitized question is meaning-level', r.status === 'needs_clarification' && /what should happen|how do you want it to feel|hoping to create/i.test(r.question))
}

// RE-EVALUATE — after the one answer, AI produces the statement → understood.
{
  const r = await discoverIntent(
    { message: 'help me plan something', clarificationAnswer: "a cozy dinner for my parents' 40th anniversary" },
    ai({ understandable: true, clarificationQuestion: null, statementOfUnderstanding: "So this is a cozy dinner to mark your parents' 40th anniversary. Have I got that right?" }),
  )
  check('after one answer → understood', r.status === 'understood')
  check('after one answer → statement reflects the answer', r.status === 'understood' && /anniversary/i.test(r.statementOfUnderstanding))
}

// ONE-QUESTION CAP — even if the AI wrongly asks again on re-eval, Discovery stops with a statement.
{
  const r = await discoverIntent(
    { message: 'help me plan something', clarificationAnswer: 'a surprise for my wife' },
    ai({ understandable: false, clarificationQuestion: 'Can you tell me more?', statementOfUnderstanding: null }),
  )
  check('re-eval never asks a second question', r.status === 'understood')
}

// DEGRADED — AI unavailable (seam returns null): ask the one question first; after an answer, stop with a reflection.
{
  const down: DiscoverIntentOptions = { complete: async () => null }
  const first = await discoverIntent({ message: 'help me plan something' }, down)
  check('AI down, not asked → one meaning question', first.status === 'needs_clarification' && !FIELD_WORDS.test(first.question))
  const after = await discoverIntent({ message: 'help me plan something', clarificationAnswer: 'a cozy dinner' }, down)
  check('AI down, answered → understood (reflection), no second question', after.status === 'understood')
}

// INVALID AI OUTPUT — malformed JSON is handled gracefully (treated as unavailable).
{
  const bad: DiscoverIntentOptions = { complete: async () => 'not json {' }
  const r = await discoverIntent({ message: 'help me plan something' }, bad)
  check('invalid AI JSON → graceful (needs_clarification)', r.status === 'needs_clarification')
}

// STRUCTURAL — the rejected keyword mechanism is gone, and the module is AI-driven.
{
  const src = readFileSync(new URL('../lib/intent-discovery/discover-intent.ts', import.meta.url), 'utf8')
  check('no ACTIVITY_ANCHORS keyword list', !src.includes('ACTIVITY_ANCHORS'))
  check('no FEELING_CUES keyword list', !src.includes('FEELING_CUES'))
  check('no SUBJECT_CUES keyword list', !src.includes('SUBJECT_CUES'))
  check('no isUnderstandable keyword classifier', !src.includes('isUnderstandable'))
  check('uses AI (openai + product prompt + json schema)', src.includes("from 'openai'") && src.includes('SYSTEM_PROMPT') && src.includes('json_schema'))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

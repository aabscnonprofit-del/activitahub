// Future Event Description V1 — Slice 1 acceptance (AI-driven).
//
// Verifies the FED slice against docs/FUTURE_EVENT_DESCRIPTION_SPEC.md. The AI output is injected via the
// `complete` seam (canned model JSON — no network), so the tests exercise the behavior: generate the FED
// from an approved Statement of Understanding → review → approve (STOP) or reject+feedback (revise & return
// for approval). Non-goals enforced: the FED never contains operational planning; approval never enters
// Planning.
//
//   Run:  npx tsx scripts/future-event-description-v1-test.mts

import { readFileSync } from 'node:fs'
import { describeFutureEvent, type DescribeFutureEventOptions } from '../lib/future-event-description/describe-future-event'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}
const PLANNING = /\bbudget\b|\bvendors?\b|\btimeline\b|\bschedule\b|\bitinerary\b|\blogistics\b|\bstaffing\b|\bcheck ?list\b|\binvoice\b|\btask list\b|\$\s?\d/i
const ai = (description: string): DescribeFutureEventOptions => ({ complete: async () => JSON.stringify({ futureEventDescription: description }) })

const SOU = "You want your dad to feel honoured and celebrated by his oldest friends over a relaxed evening."

// GENERATE — from an approved Statement of Understanding, the AI's FED is returned for approval.
{
  const r = await describeFutureEvent(
    { statementOfUnderstanding: SOU },
    ai('As the evening opens, your dad is surrounded by the friends who have known him longest. The mood is warm and unhurried; laughter and old stories fill the room, and he feels quietly honoured — the guest of honour among people who matter to him.'),
  )
  check('generate → awaiting_approval', r.status === 'awaiting_approval')
  check('generate → returns the AI description', r.status === 'awaiting_approval' && /honoured|guest of honour/i.test(r.futureEventDescription))
  check('generate → contains NO planning content', r.status === 'awaiting_approval' && !PLANNING.test(r.futureEventDescription))
}

// APPROVE — the client approves the reviewed description → approved, STOP (no regeneration, no Planning).
{
  const approvedText = 'A warm, unhurried evening where your dad feels celebrated by his oldest friends.'
  const r = await describeFutureEvent(
    { statementOfUnderstanding: SOU, priorDescription: approvedText, clientDecision: { decision: 'approve' } },
    ai('THIS SHOULD NOT APPEAR — approval must not regenerate'),
  )
  check('approve → status approved', r.status === 'approved')
  check('approve → returns the reviewed description (no regeneration)', r.status === 'approved' && r.futureEventDescription === approvedText)
  check('approve → no Planning entered (result is only approved/awaiting)', r.status === 'approved')
}

// REJECT + feedback — the description is revised and returned for approval (never Planning).
{
  const prior = 'A large, lively party for your dad.'
  const r = await describeFutureEvent(
    { statementOfUnderstanding: SOU, priorDescription: prior, clientDecision: { decision: 'reject', feedback: 'smaller and calmer — just his closest friends' } },
    ai('A small, calm gathering of your dad and his closest friends — an intimate evening where he feels deeply appreciated.'),
  )
  check('reject → awaiting_approval again (revised)', r.status === 'awaiting_approval')
  check('reject → revised description reflects the feedback', r.status === 'awaiting_approval' && /small|calm|intimate|closest/i.test(r.futureEventDescription))
  check('reject → revision has no planning content', r.status === 'awaiting_approval' && !PLANNING.test(r.futureEventDescription))
}

// GUARD — if the AI drifts into planning content, NO FED is produced; generation fails (no fabrication).
{
  const r = await describeFutureEvent(
    { statementOfUnderstanding: SOU },
    ai('A celebration for your dad. Budget: $5000. Vendors: caterer and DJ. Timeline: 6pm dinner, 8pm speeches.'),
  )
  check('AI drifted into planning → generation_failed (planning_content)', r.status === 'generation_failed' && r.reason === 'planning_content')
  check('AI drifted → no FED fabricated', !('futureEventDescription' in r))
}

// FAIL-SAFE — AI unavailable → generation_failed; no FED fabricated (no handwritten fallback).
{
  const down: DescribeFutureEventOptions = { complete: async () => null }
  const r = await describeFutureEvent({ statementOfUnderstanding: SOU }, down)
  check('AI unavailable → generation_failed (ai_unavailable)', r.status === 'generation_failed' && r.reason === 'ai_unavailable')
  check('AI unavailable → no FED produced', !('futureEventDescription' in r))
}

// INVALID AI OUTPUT — malformed JSON → generation_failed; no FED fabricated.
{
  const bad: DescribeFutureEventOptions = { complete: async () => 'not json {' }
  const r = await describeFutureEvent({ statementOfUnderstanding: SOU }, bad)
  check('invalid AI JSON → generation_failed (invalid_output)', r.status === 'generation_failed' && r.reason === 'invalid_output')
  check('invalid AI JSON → no FED produced', !('futureEventDescription' in r))
}

// STRUCTURAL — AI-driven; no handwritten fabrication; no Planning functionality introduced.
{
  const src = readFileSync(new URL('../lib/future-event-description/describe-future-event.ts', import.meta.url), 'utf8')
  check('uses AI (openai + product prompt + json schema)', src.includes("from 'openai'") && src.includes('SYSTEM_PROMPT') && src.includes('json_schema'))
  check('no handwritten FED fallback (degradedDescription removed)', !src.includes('degradedDescription'))
  check('has the distinct failure state generation_failed', src.includes("'generation_failed'"))
  check('no Planning next-stage state', !/status: 'planning'|planning_ready|next_stage/i.test(src))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

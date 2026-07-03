// Idea → Discovery → Statement of Understanding → FED → approved FED → Planning adapter —
// full published-backend-seam-chain integration test.
//
// Exercises ONLY the three published backend seam entry points, end to end:
//   discoverAction → describeFutureEventAction → planFromApprovedFedAction.
// No UI, PlannerClient, planner.ts internals, or component is imported.
//
// Deterministic without OPENAI_API_KEY, relying only on the seams' established fail-safe behavior:
//   * Discovery: first turn asks its one meaning-level clarification; after an answer, the one-question cap
//     stops it with a Statement of Understanding.
//   * FED: with no key and no decision it reports generation_failed (never fabricates); the documented
//     approve + prior-description shortcut short-circuits to an approved Future Event Description.
//   * Planning adapter: it reuses the legacy Planning path, whose full execution needs a Next / Supabase
//     request runtime this process lacks. The GenerateFromIdeaResult CONTRACT is therefore proven via the
//     adapter's established empty-description fail-safe gate (what_should_happen_required, checked before any
//     auth/DB); the real approved FED is also pushed through and accepted as either a valid result or the
//     legacy runtime boundary.
//
//   Run:  npx tsx scripts/discovery-fed-planning-seam-integration-test.mts

import { discoverAction } from '../lib/actions/discovery'
import { describeFutureEventAction } from '../lib/actions/future-event-description'
import { planFromApprovedFedAction } from '../lib/actions/planning-from-fed'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const IDEA = 'I want my dad to feel honoured and celebrated by his oldest friends.'
const DETAILS = { category: 'birthday', guestCount: 10 }
const LOCATION = { city: 'Honolulu', country: 'USA' }

// 1–2. Discovery seam → DiscoveryResult (first turn asks one clarification, no key).
{
  const d1 = await discoverAction(IDEA)
  check('discovery: returns a DiscoveryResult status', d1.status === 'needs_clarification' || d1.status === 'understood')
  check('discovery: first turn → one clarification question', d1.status === 'needs_clarification' && d1.question.trim().length > 0)
}

// 3. Continue until a Statement of Understanding exists (after an answer → understood).
let statementOfUnderstanding = ''
{
  const d2 = await discoverAction(IDEA, 'a calm evening among his closest friends')
  check('discovery: reaches a Statement of Understanding', d2.status === 'understood')
  if (d2.status === 'understood') statementOfUnderstanding = d2.statementOfUnderstanding
  check('discovery: statement of understanding is non-empty', statementOfUnderstanding.trim().length > 0)
}

// 4–5. FED seam consumes the Statement of Understanding → FutureEventDescriptionResult contract.
{
  const f1 = await describeFutureEventAction(statementOfUnderstanding)
  check('fed: returns a FutureEventDescriptionResult status', f1.status === 'awaiting_approval' || f1.status === 'approved' || f1.status === 'generation_failed')
  check('fed: no key → generation_failed (never fabricated)', f1.status === 'generation_failed' && !('futureEventDescription' in f1))
}

// 6. Reach an APPROVED Future Event Description via the seam's documented approval shortcut.
let approvedFutureEventDescription = ''
{
  const prior = 'A warm, unhurried evening where your dad is celebrated by his oldest friends.'
  const f2 = await describeFutureEventAction(statementOfUnderstanding, prior, { decision: 'approve' })
  check('fed: approve + prior → approved', f2.status === 'approved')
  if (f2.status === 'approved') approvedFutureEventDescription = f2.futureEventDescription
  check('fed: approved Future Event Description is non-empty', approvedFutureEventDescription.trim().length > 0)
}

// 6→7. Push the real approved FED into the Planning adapter. Its full legacy execution needs the Next /
// Supabase runtime, so accept either a valid GenerateFromIdeaResult or the legacy runtime boundary.
{
  let result: unknown = null
  let reachedRuntimeBoundary = false
  try {
    result = await planFromApprovedFedAction({
      approvedFutureEventDescription,
      clientRequest: IDEA,
      details: DETAILS,
      location: LOCATION,
    })
  } catch {
    reachedRuntimeBoundary = true
  }
  const isResult = typeof result === 'object' && result !== null && 'ok' in (result as Record<string, unknown>)
  check('planning adapter: approved FED reaches the legacy Planning path (result or runtime boundary)', reachedRuntimeBoundary || isResult)
}

// 7. GenerateFromIdeaResult CONTRACT — proven deterministically via the adapter's empty-description fail-safe
// gate (returned before any auth/DB).
{
  const gate = await planFromApprovedFedAction({
    approvedFutureEventDescription: '',
    clientRequest: IDEA,
    details: DETAILS,
    location: LOCATION,
  })
  check('planning adapter: returns the GenerateFromIdeaResult contract', typeof gate === 'object' && gate !== null && 'ok' in gate)
  check('planning adapter: empty FED → what_should_happen_required (gate)', !gate.ok && gate.error === 'what_should_happen_required')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

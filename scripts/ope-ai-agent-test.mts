// OPE AI Agent test — the AI is the FIRST decider. Uses MOCKED AI responses (no network) via
// the `complete` seam, and proves: the validated verdict is honoured; product rules are enforced
// on top of the AI output; invalid/malformed AI output → null (caller falls back to deterministic).
//
//   Run:  npx tsx scripts/ope-ai-agent-test.mts   (or: npm run test:agent-ai)

import { runOpeAgent, decideRequest } from '../lib/ai/ope-agent'
import type { OpeAgentVerdict } from '../lib/ope/agent'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

// A mock AI: maps each request to a canned, schema-shaped JSON verdict.
function mockVerdict(v: OpeAgentVerdict, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    verdict: v,
    confidence: 0.9,
    reason: `mock:${v}`,
    missingFields: [],
    discoveryQuestions: v === 'discovery_required' ? ['What should actually happen?'] : [],
    operationalSummary: null,
    whatShouldHappenDraft: null,
    mayDraftWsh: true,   // deliberately permissive — rules must override for blocked verdicts
    mayRunPlanner: true,
    ...extra,
  })
}

const RESPONSES: Record<string, string> = {
  'I want to visit heaven': mockVerdict('discovery_required', { whatShouldHappenDraft: 'a heavenly day' }), // draft must be stripped
  'I want the best day of my life': mockVerdict('discovery_required'),
  'I want to surprise my wife': mockVerdict('interpretation_required', {
    whatShouldHappenDraft: 'What happens: a heartfelt surprise for your wife. What people experience: delight and warmth.',
  }),
  'birthday party for 12 kids in our backyard on Saturday, $300': mockVerdict('sufficient_data'),
}

const complete = async (input: { rawText: string }) => RESPONSES[input.rawText] ?? null

console.log('A. heaven / best-day → discovery_required, WSH stripped, no plan')
for (const text of ['I want to visit heaven', 'I want the best day of my life']) {
  const v = await runOpeAgent({ rawText: text }, { complete })
  check(`"${text}" → verdict discovery_required`, v?.verdict === 'discovery_required', v?.verdict)
  check(`"${text}" → mayDraftWsh false (rule enforced)`, v?.mayDraftWsh === false)
  check(`"${text}" → mayRunPlanner false (rule enforced)`, v?.mayRunPlanner === false)
  check(`"${text}" → whatShouldHappenDraft stripped to null`, v?.whatShouldHappenDraft === null,
    JSON.stringify(v?.whatShouldHappenDraft))
  check(`"${text}" → source ai`, v?.source === 'ai')
}

console.log('\nB. surprise my wife → interpretation_required WITH a WSH draft, but no planner')
{
  const v = await runOpeAgent({ rawText: 'I want to surprise my wife' }, { complete })
  check('verdict interpretation_required', v?.verdict === 'interpretation_required', v?.verdict)
  check('mayDraftWsh true', v?.mayDraftWsh === true)
  check('mayRunPlanner false (no plan without approved WSH)', v?.mayRunPlanner === false)
  check('whatShouldHappenDraft present', !!v?.whatShouldHappenDraft && v.whatShouldHappenDraft.length > 0)
}

console.log('\nC. concrete birthday → sufficient_data (planner may proceed after field confirmation)')
{
  const v = await runOpeAgent({ rawText: 'birthday party for 12 kids in our backyard on Saturday, $300' }, { complete })
  check('verdict sufficient_data or plan_ready', v?.verdict === 'sufficient_data' || v?.verdict === 'plan_ready', v?.verdict)
  check('mayRunPlanner true', v?.mayRunPlanner === true)
  check('not discovery_required', v?.verdict !== 'discovery_required')
}

console.log('\nD. Invalid / malformed AI output → null (caller falls back to deterministic)')
{
  const invalidJson = await runOpeAgent({ rawText: 'x' }, { complete: async () => 'not json at all' })
  check('invalid JSON → null', invalidJson === null)
  const badVerdict = await runOpeAgent({ rawText: 'x' }, { complete: async () => JSON.stringify({ verdict: 'banana', confidence: 1, reason: 'r', missingFields: [], discoveryQuestions: [], operationalSummary: null, whatShouldHappenDraft: null, mayDraftWsh: true, mayRunPlanner: true }) })
  check('unknown verdict → null', badVerdict === null)
  const empty = await runOpeAgent({ rawText: 'x' }, { complete: async () => null })
  check('no content → null', empty === null)
}

console.log('\nE. decideRequest falls back to deterministic when AI returns null')
{
  // AI yields null → deterministic assessRequest must classify "visit heaven" as discovery.
  const v = await decideRequest({ rawText: 'I want to visit heaven' }, { complete: async () => null })
  check('fallback verdict discovery_required', v.verdict === 'discovery_required', v.verdict)
  check('fallback source deterministic', v.source === 'deterministic', v.source)
  check('fallback never invents WSH', v.whatShouldHappenDraft === null && v.mayDraftWsh === false)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

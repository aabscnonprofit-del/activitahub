// Public Planner Pipeline Convergence — the public Planner runs ONE pipeline:
//   idea → Discovery → WSH (approve) → Planning Engine V2.
// The legacy category/details form (the hybrid transition) is gone, and the route locale is
// threaded through the visible AI outputs so the Planner answers in the visitor's language.
//
//   Run:  npx tsx scripts/planner-convergence-test.mts

import { readFileSync } from 'node:fs'
import { languageDirective, languageName } from '../lib/ai/language.ts'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const planner = read('components/planner/PlannerClient.tsx')
const action = read('lib/actions/planner.ts')
const agent = read('lib/ai/ope-agent.ts')
const concept = read('lib/ai/concept-generation.ts')
const opeAgent = read('lib/ope/agent.ts')

// ── Convergence: the legacy category/details form is gone ────────────────────────────
check("Step type no longer has a 'details' step", /type Step = 'idea' \| 'wsh'/.test(planner) && !/'details'/.test(planner))
check('no transition into a details step remains', !planner.includes("setStep('details')"))
check('the category taxonomy button list (cats) is removed', !/const cats:/.test(planner))
check('the venue button list (venues) is removed', !/const venues:/.test(planner))
check('the location/guest/budget form Sections are removed', !/<Section/.test(planner) && !/function Section\(/.test(planner))

// ── Convergence: WSH approval leads straight into Planning ────────────────────────────
check('WSH approval triggers planning (submitDetails) directly', /onClick=\{\(\) => void submitDetails\(\)\}/.test(planner))
check('both scenario paths route to the WSH step for approval', (planner.match(/setStep\('wsh'\)/g) ?? []).length >= 2)
check('the sign-in gate still renders (preserved in the WSH step)', planner.includes("gate === 'signin'"))
check('the One Event License gate still renders (preserved in the WSH step)', planner.includes("gate === 'license'"))
check('BuyEventLicenseButton is still wired for the license gate', planner.includes('<BuyEventLicenseButton'))

// ── Planning behavior preserved (Planning Engine V2 seam untouched) ───────────────────
check('planning still goes through generateFromIdeaAction → FED', planner.includes('generateFromIdeaAction(') && planner.includes('buildFutureEventDescription('))
check('guestCount is guarded against NaN now the required field is gone', planner.includes('Number.isFinite(guests)'))

// ── Locale propagation through the visible AI pipeline ────────────────────────────────
check('OpeAgentInput carries a locale', /locale\?: string \| null/.test(opeAgent))
check('PlannerClient passes locale into analyzeIdeaAction (both calls)',
  planner.includes('analyzeIdeaAction(idea, undefined, locale)') && planner.includes('analyzeIdeaAction(idea, toConversation(nextMsgs), locale)'))
check('analyzeIdeaAction accepts and forwards locale to decideRequest', /analyzeIdeaAction\(idea: string, conversation\?: DiscoveryTurn\[\], locale\?: string\)/.test(action) && action.includes('decideRequest({ rawText: text, conversation, locale })'))
check('analyzeIdeaAction forwards locale to composeWhatShouldHappen', action.includes('composeWhatShouldHappen(effective, locale)'))
check('the Organizer AI call injects the language directive', agent.includes('languageDirective(input.locale)'))
check('the WSH composer injects the language directive', concept.includes('languageDirective(locale)'))

// ── The directive itself: English no-op, other locales localized ──────────────────────
check("languageDirective('en') is null (no directive for the default)", languageDirective('en') === null)
check('languageDirective(undefined) is null', languageDirective(undefined) === null)
check("languageDirective('ru') instructs Russian output", (languageDirective('ru') ?? '').includes('Russian'))
check("languageDirective('fr') instructs French output", (languageDirective('fr') ?? '').includes('French'))
check("languageName('pt') resolves to Portuguese", languageName('pt') === 'Portuguese')
check('a directive never renames JSON fields (structure preserved)', (languageDirective('ru') ?? '').includes('Do NOT change the'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

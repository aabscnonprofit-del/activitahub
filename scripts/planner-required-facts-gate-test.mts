// Required-facts gate — analyzeIdeaAction must not advance to a WSH/plan until guestCount (always)
// and instructor (class-type activities) are known, capturing them from the SAME Discovery
// conversation (a natural follow-up), never the removed Details form. This locks the wiring at the
// source level (the pure capture logic is covered by required-facts-test).
//
//   Run:  npx tsx scripts/planner-required-facts-gate-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const action = read('lib/actions/planner.ts')
const planner = read('components/planner/PlannerClient.tsx')

// ── Capture: facts are read from the idea + latest answer, and carried in the prefill/FED ─────
check('imports the required-facts capture helpers',
  action.includes("from '@/lib/planning/required-facts'") &&
  ['readHeadcount', 'readBareCount', 'readInstructor', 'readInstructorAnswer', 'missingRequiredFact'].every((f) => action.includes(f)))
check('headcount is captured from idea + short answer (never a silent default)',
  action.includes('ext.guestCount ?? readHeadcount(effective) ?? readBareCount(lastAnswer)'))
check('instructor is captured from idea + short answer',
  action.includes('readInstructor(effective) ?? readInstructorAnswer(lastAnswer)'))
check('IdeaPrefill carries instructor', /instructor: 'have' \| 'need' \| null/.test(action))
check('prefill carries the captured guestCount + instructor', action.includes('guestCount: headcount') && /\n\s*instructor,\n/.test(action))

// ── Gate: hold in Discovery for the one missing fact, only after the Organizer is WSH-ready ───
check('the gate runs only when the Organizer would draft a WSH (after the !mayDraftWsh return)',
  action.indexOf('!verdict.mayDraftWsh') < action.indexOf('missingRequiredFact(ext.category, headcount, instructor)'))
check('a missing fact holds in Discovery (scenario_needed, whatShouldHappen null, missingFact set)',
  /const missing = missingRequiredFact\([^)]*\)\n\s*if \(missing\) \{/.test(action) &&
  action.includes('missingFact: missing') && action.includes('whatShouldHappen: null'))
check('ScenarioState carries the structured missingFact (guests | instructor)',
  /missingFact\?: 'guests' \| 'instructor' \| null/.test(action))
check('the follow-up question is localized CLIENT-side (route language), not via server getTranslations',
  !action.includes('getTranslations') &&
  planner.includes("tf('facts.askGuests')") && planner.includes("tf('facts.askInstructor')"))

// ── No legacy form, no new flow: the gate reuses the existing Discovery return shape ──────────
check('no Details step was reintroduced', !planner.includes("'details'") && !planner.includes('setStep(\'details\')'))
check('client carries the captured instructor into the FED via applyPrefill',
  planner.includes('if (p.instructor) setInstructor(p.instructor)'))

// ── Localized question strings exist for every supported locale ───────────────────────────────
for (const loc of ['en', 'de', 'es', 'fr', 'pt', 'ru']) {
  const m = JSON.parse(read(`messages/${loc}.json`))
  const facts = m?.planner?.form?.facts
  check(`${loc}: planner.form.facts has ack/askGuests/askInstructor`,
    !!facts && !!facts.ack && !!facts.askGuests && !!facts.askInstructor)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

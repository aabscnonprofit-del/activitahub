// Quick Activity + Scheduling — the acceptance guarantees for this feature.
//
// Both entry modes (Quick Activity / Plan with AI) create the SAME canonical Project; Quick Activity uses NO
// AI/OPE and creates NO legacy `activities` row; one-time scheduling yields exactly one valid Occurrence; the
// public page + discovery read that Occurrence; a public discoverable activity can never be published with no
// date; and no second date source of truth is introduced (Occurrence stays canonical).
//
//   Run:  npx tsx scripts/quick-activity-and-scheduling-test.mts

import { readFileSync } from 'node:fs'
import { expandSchedule, validateSchedule, type ScheduleSpec } from '../lib/scheduling/schedule.ts'
import { quickActivityEventPlan } from '../lib/planning/quick-activity-plan.ts'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
/** Source with line-comments stripped, so a token in prose never satisfies an implementation check. */
const code = (p: string) => read(p).replace(/\/\/.*$/gm, '')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else {
    failures++
    console.log(`  FAIL ${name}`)
  }
}

const quickAction = code('../lib/actions/quick-activity.ts')
const quickPlan = code('../lib/planning/quick-activity-plan.ts')
const planner = code('../lib/actions/planner.ts')
const scheduleAction = code('../lib/actions/schedule.ts')
const projectsAction = code('../lib/actions/projects.ts')
const publicPage = code('../app/[locale]/p/[projectId]/page.tsx')
const discovery = code('../lib/activity-marketplace/cards.ts')
const workspace = code('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

// ── 1. Both entry modes create the SAME canonical Project ────────────────────────────────────────────────
// Both go through resolveProjectForPlan (the single canonical creation entry) + persist an EventPlanV2.
check('Quick uses the canonical Project creation entry (resolveProjectForPlan)', quickAction.includes('resolveProjectForPlan'))
check('Assisted uses the same canonical Project creation entry', planner.includes('resolveProjectForPlan'))
check('Quick persists the canonical EventPlanV2 (same contract as assisted)', quickAction.includes('persistEventPlanV2'))
check('Assisted persists the same canonical EventPlanV2', planner.includes('persistEventPlanV2'))
check('Quick introduces NO separate project type/table', !/Quick(Project|Activity)Table|from\(['"]quick|['"]activity_project/i.test(quickAction))
// The minimal plan is a structurally valid EventPlanV2 marked planned (so approval + public projection accept it).
const qp = quickActivityEventPlan({ title: 'Yoga at Magic Island', description: 'Sunset beach yoga.' })
check('quick plan is a valid EventPlanV2 (title→intendedFeeling, desc→concept, planned)',
  qp.experienceDesign.intendedFeeling === 'Yoga at Magic Island' &&
  qp.structure.concept === 'Sunset beach yoga.' &&
  qp.feasibility.verdict === 'planned' &&
  Array.isArray(qp.itinerary))

// ── 2. Quick Activity does NOT call AI / OPE generation ──────────────────────────────────────────────────
check('Quick imports no AI module', !/from ['"]@\/lib\/ai\//.test(quickAction))
check('Quick does not run Planning Engine V2 / OPE', !quickAction.includes('planningEngineV2') && !quickAction.includes('concept-funnel') && !quickAction.includes('runConceptFunnel'))
check('Quick consumes no event license (no paid AI generation)', !quickAction.includes('consume_event_license'))

// ── 3. One-time scheduling creates exactly ONE valid Occurrence ──────────────────────────────────────────
const oneTime: ScheduleSpec = { kind: 'one_time', timeZone: 'UTC', start: { date: '2026-08-01', time: '18:00' }, duration: { kind: 'minutes', minutes: 60 } }
const ot = expandSchedule(oneTime)
check('one-time expands to exactly one occurrence window', ot.windows.length === 1)
check('the one window has a concrete start instant', ot.windows[0].startsAt === '2026-08-01T18:00:00.000Z')
check('schedule action applies one_time (in-place) vs weekly (series) modes', scheduleAction.includes("spec.kind === 'weekly' ? 'series' : 'one_time'"))

// ── 4. The public page reads that Occurrence ─────────────────────────────────────────────────────────────
check('public page reads occurrences via listPublicFutureOccurrences', publicPage.includes('listPublicFutureOccurrences'))
check('public page renders the occurrence date', publicPage.includes('o.starts_at') || publicPage.includes('occurrences.map'))

// ── 5. Project discovery reads that Occurrence ───────────────────────────────────────────────────────────
check('discovery reads the same occurrences table', discovery.includes("from('occurrences')"))
check('discovery pairs the occurrence with the public EventPlan title', discovery.includes('getPublicEventPlan') && discovery.includes('starts_at'))

// ── 6. Readiness — a public discoverable activity can never be published with no date ────────────────────
check('publish is gated on a future occurrence when public', projectsAction.includes('hasFutureOccurrence') && projectsAction.includes("'no_future_occurrence'"))
check('publish gate keys on public visibility', /visibility === 'public'[\s\S]{0,120}hasFutureOccurrence/.test(projectsAction))
check('setting public on a published project is also gated', /isPublished[\s\S]{0,120}hasFutureOccurrence/.test(projectsAction))
// The pure readiness check rejects a past-only schedule.
const past = validateSchedule({ kind: 'one_time', timeZone: 'UTC', start: { date: '2000-01-01', time: '10:00' }, duration: { kind: 'none' } }, '2026-07-01T00:00:00.000Z')
check('a past-only schedule is rejected as not-ready', !past.ok && past.reason === 'no_future_occurrence')

// ── 7. No legacy `activities` row is created ─────────────────────────────────────────────────────────────
check('Quick writes no legacy activities row', !quickAction.includes("from('activities')") && !quickAction.includes('createActivity'))

// ── 8. Existing assisted planning still works (unchanged authoritative producer) ─────────────────────────
check('assisted still runs Planning Engine V2 as the authority', planner.includes('planningEngineV2.plan'))
check('assisted still persists + reflects the plan', planner.includes('persistEventPlanV2') && planner.includes('generateFromIdeaAction'))

// ── 9. No second date source of truth ────────────────────────────────────────────────────────────────────
// The EventPlanV2 builder carries NO date; Quick writes dates ONLY through the Occurrence store; the workspace
// reads dates ONLY from occurrences.
check('quick EventPlanV2 carries no date field', !/starts_at|scheduled_at|event_date|['"]date['"]\s*:/.test(quickPlan))
check('Quick writes dates only via applyOccurrenceWindows (no raw occurrence/project date insert)',
  quickAction.includes('applyOccurrenceWindows') && !/from\(['"]occurrences['"]\)\s*\.insert/.test(quickAction) && !/updateProject\([^)]*starts_at/.test(quickAction))
check('workspace reads dates from occurrences (listProjectOccurrences), not a project/plan date', workspace.includes('listProjectOccurrences'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

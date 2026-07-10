// Organizer journey (P2) — one identity, one terminology across the whole Quick Activity → Publish → Public
// journey. The activity's NAME must come from a single source (experienceDesign.intendedFeeling) on the
// organizer side (list + workspace) exactly as the public projection uses it — so an organizer recognizes the
// activity they created everywhere they see it.
//
//   Run:  npx tsx scripts/organizer-journey-identity-test.mts

import { readFileSync } from 'node:fs'
import { activityTitleFromPlan, UNTITLED_ACTIVITY } from '../lib/planning/activity-identity.ts'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2.ts'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const code = (p: string) => read(p).replace(/\/\/.*$/gm, '')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Single identity source (logic) ───────────────────────────────────────────────────────────────────────
const sample = { experienceDesign: { intendedFeeling: '  Yoga at Magic Island  ', arc: '', trace: { servesIntention: '' } }, structure: { concept: 'x', trace: { servesIntention: '' } }, itinerary: [], logistics: [], resources: [], staffing: [], suitability: [], safety: [], contingencies: [], costEstimate: { low: 0, likely: 0, high: 0, currency: 'USD', basis: '' }, feasibility: { verdict: 'planned', notes: '' }, assumptions: [], originalIntention: '' } as unknown as EventPlanV2
check('activityTitleFromPlan reads experienceDesign.intendedFeeling (trimmed)', activityTitleFromPlan(sample) === 'Yoga at Magic Island')
check('activityTitleFromPlan returns null when no plan', activityTitleFromPlan(null) === null)
check('UNTITLED_ACTIVITY fallback is defined', typeof UNTITLED_ACTIVITY === 'string' && UNTITLED_ACTIVITY.length > 0)

// The public projection uses the SAME field — so organizer and public identity can never diverge.
const projection = code('../lib/planning/public-event-projection.ts')
check('public projection derives title from the SAME field (experienceDesign.intendedFeeling)',
  projection.includes('eventPlan.experienceDesign.intendedFeeling'))

// ── Organizer surfaces show the name from that source ───────────────────────────────────────────────────
const list = code('../app/[locale]/dashboard/projects/page.tsx')
check('activities list loads names via getActivityTitles (batch, single source)', list.includes('getActivityTitles('))
check('activities list renders the activity name, not a raw id slice', list.includes('titles[p.id]') && !list.includes('p.id.slice'))
check('activities list is titled for activities, not internal "Projects"', list.includes('Your activities'))

const workspace = code('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('workspace derives the title from the same identity source', workspace.includes('activityTitleFromPlan(workerPlan)'))
check('workspace H1 is the activity name (not "Project Workspace" + raw id)', workspace.includes('{activityTitle}') && !workspace.includes('font-mono text-sm text-slate-500">{projectId}'))

// ── Success feedback: Quick Activity → workspace confirms creation ──────────────────────────────────────
const quickForm = code('../components/activities/QuickActivityForm.tsx')
check('Quick Activity redirects with a created flag', quickForm.includes('?created=1'))
check('workspace shows a creation confirmation when just created', workspace.includes('justCreated') && workspace.includes('Activity created'))

// ── Publish step: terminology "activity"; no dead "Coming Soon" placeholders ────────────────────────────
const publish = code('../components/projects/PublishPanel.tsx')
check('publish success says "Activity published" (not "Project Published")', publish.includes('Activity published') && !publish.includes('Project Published'))
check('publish CTA says "Publish this activity"', publish.includes('Publish this activity'))
check('dead "Organizer toolkit / Coming Soon" placeholders removed', !publish.includes('Organizer toolkit') && !publish.includes('Coming Soon'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

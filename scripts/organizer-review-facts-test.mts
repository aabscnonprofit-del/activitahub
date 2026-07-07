// Organizer Review Facts — read-only projection contract test.
//
// Objective review facts on the public Organizer Page: reviews received / reviewed activities / latest review
// date, counted ONLY over the organizer's completed public activities (reuses the shared completed projection;
// private/draft excluded). No ratings/stars/score/reputation/ranking; never reads the Ticket System; owns no
// data. Existing Organizer Facts unchanged. Pure logic (imported) + source analysis.
//
//   Run:  npx tsx scripts/organizer-review-facts-test.mts

import { readFileSync } from 'node:fs'
import { getOrganizerReviewFacts } from '../lib/reviews/organizer-review-facts'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const facts = read('../lib/reviews/organizer-review-facts.ts')
const view = read('../components/organizer/OrganizerPublicView.tsx')
const page = read('../app/[locale]/organizers/[id]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Empty projection — no completed activities → all-zero facts, latest = null (→ "Coming soon" in UI).
{
  const f = await getOrganizerReviewFacts([])
  check('empty: reviewsReceived 0 / reviewedActivities 0 / latestReviewDate null',
    f.reviewsReceived === 0 && f.reviewedActivities === 0 && f.latestReviewDate === null)
}

// 2. Source rules — activity_review items only, scoped to the given completed public project ids; no ticket read.
check('counts only activity_review items', facts.includes("eq('memory_type', 'activity_review')"))
check('scoped to completed public project ids (.in project_id)', facts.includes("in('project_id', ids)"))
check('reviewed activities = distinct projects with a review', facts.includes('new Set(rows.map((r) => r.project_id)).size'))
check('latest review date = newest created_at', facts.includes('r.created_at > max ? r.created_at : max'))
check('owns no data / never reads the Ticket System', !/CREATE TABLE|insert\(|upsert\(|ticket/i.test(facts.replace(/\/\/.*$/gm, '')))

// 3. Reuses the completed projection — page derives ids from the completed set (completion not re-derived here).
check('page computes review facts from the completed activities', page.includes('getOrganizerReviewFacts(completed.map((c) => c.projectId))'))
check('no completion logic duplicated in the projection', !/isProjectCompleted|ends_at|starts_at/.test(facts))

// 4. Display — new section with the three facts; latest empty → "Coming soon".
check('view renders the three review facts', view.includes("label: 'Reviews received'") && view.includes("label: 'Reviewed activities'") && view.includes("label: 'Latest review'"))
check('latest review empty state is "Coming soon"', view.includes("reviewFacts.latestReviewDate ?") && view.includes("'Coming soon'"))
check('Organizer review facts section present, label/value style', view.includes('Organizer review facts') && view.includes('reviewFactsList.map'))

// 5. NO ratings/stars/score/reputation/ranking/charts.
check('no average/stars/score/reputation/ranking/trust/sentiment/recommend',
  !/\b(average|stars?|score|reputation|ranking|rank|trust|sentiment|recommend|weighting|percentage|chart|graph)\b/i.test((facts + view).replace(/\/\/.*$/gm, '').replace(/no ratings[^\n]*/gi, '')))

// 6. Existing Organizer Facts unchanged (still its own list + section).
check('existing Organizer Facts untouched (Organizer since / Public Activities / Completed Activities / Verification)',
  ["label: 'Organizer since'", "label: 'Public Activities'", "label: 'Completed Activities'", "label: 'Verification'"].every((s) => view.includes(s)))

// 7. No schema/migration for the projection.
check('no new migration for review facts', (() => { try { read('../supabase/migrations/068_organizer_review_facts.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

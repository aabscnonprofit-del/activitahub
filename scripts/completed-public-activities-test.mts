// Completed Public Activities — canonical projection contract test.
//
// A completed public activity is a READ-ONLY PROJECTION over Project + Occurrence state (no new entity, no new
// lifecycle, no "completed" Project status): published + visibility = 'public' + approved, and every occurrence
// finished. The Organizer Page splits activities into Current (upcoming/ongoing) and Past (completed, archive),
// a Project appears in exactly ONE, and the Completed Activities count is the same archive. Source analysis.
//
//   Run:  npx tsx scripts/completed-public-activities-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const cards = read('../lib/activity-marketplace/cards.ts')
const view = read('../components/organizer/OrganizerPublicView.tsx')
const page = read('../app/[locale]/organizers/[id]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}
const partition = cards.slice(cards.indexOf('export async function partitionOrganizerActivities'))

// 1. Projection over existing Project + Occurrence data — no new entity / lifecycle / status.
check('partitionOrganizerActivities is a projection over occurrences', partition.includes("from('occurrences')") && partition.includes('ends_at ?? o.starts_at'))
check('no new "completed" Project state written (read-only projection)', !/update\(\{[^}]*completed|status:\s*'completed'/i.test(cards))
check('no new entity/table created for completed activities', !/CREATE TABLE|from\('(completed_activities|organizer_archive|activity_archive)'\)/i.test(cards))

// 2. Data rule — published + visibility = public + approved, scoped to the organizer (private/draft never appear).
check('archive rule: owner + published + public + approved',
  partition.includes(".eq('owner_id', organizerId)") && partition.includes(".eq('is_published', true)") && partition.includes(".eq('visibility', 'public')") && partition.includes(".not('approved_at', 'is', null)"))

// 3. Completion definition — every occurrence finished; current otherwise.
check('completed = has occurrences and every one finished', partition.includes('const isCompleted = future.length === 0 && past.length > 0'))
check('current uses the next upcoming occurrence (or none scheduled yet)', partition.includes('future[0] ?? null'))
check('completed uses the latest finished occurrence', partition.includes('past[past.length - 1]'))

// 4. A Project is in EXACTLY one bucket — never both.
check('exclusive partition (isCompleted → completed, else current)',
  partition.includes('if (isCompleted) completed.push(card)') && partition.includes('else current.push(card)'))

// 5. Ordering — newest completed first.
check('completed ordered newest-finished first', /completed\.sort\(\(a, b\) => new Date\(b\.startsAt[\s\S]*a\.startsAt/.test(partition))

// 6. Organizer Page — Past activities replaces the placeholder; count is the SAME archive (single source).
check('page partitions + passes current + completed', page.includes('partitionOrganizerActivities(id') && page.includes('activities={current}') && page.includes('completedActivities={completed}'))
check('Past activities renders the completed archive (placeholder removed)',
  view.includes('completedActivities.map') && !view.includes('Past Activities archive will appear after'))
check('Completed Activities count = the archive length (single source of truth)', view.includes('String(completedActivities.length)'))

// 7. Local Activities catalog unchanged; no new migration.
check('Local Activities (listMarketplaceActivities) unchanged (still published+public+approved, degrades to [])',
  cards.includes('export async function listMarketplaceActivities') && cards.includes(".eq('is_published', true)") && cards.includes(".eq('visibility', 'public')") && cards.includes('if (!projects) return []'))
check('no new migration for completed activities', (() => { try { read('../supabase/migrations/063_completed_activities.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

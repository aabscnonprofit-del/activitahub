// Public Activity Space — contract test.
//
// A completed PUBLIC activity's existing /p/[projectId] page becomes its permanent public archive (reused, not a
// parallel route). Archive shows only for completed + public Projects; current/upcoming are unchanged. It is a
// read-only projection with placeholder future sections — no media/reviews/uploads/entities. Source analysis.
//
//   Run:  npx tsx scripts/public-activity-space-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const page = read('../app/[locale]/p/[projectId]/page.tsx')
const archive = read('../components/activities/ActivityArchive.tsx')
const card = read('../components/activities/ActivityCard.tsx')
const view = read('../components/organizer/OrganizerPublicView.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Reuse the existing Activity Page — same /p/[projectId] route, branched by completion (no parallel page).
check('archive reuses the existing /p/[projectId] page (branch, not a new route)', page.includes('showArchive ? (') && page.includes('getPublicProject(supabase, projectId)'))
check('completion uses the shared projection', page.includes('isProjectCompleted(allOccs, nowMs)') && page.includes('representativeOccurrence(allOccs, nowMs, true)'))

// 2. Only COMPLETED + PUBLIC activities expose the archive; private/draft/unpublished never do.
check('archive requires completed AND visibility = public', page.includes("visibility === 'public' && isProjectCompleted(allOccs, nowMs)"))
check('page only loads published Projects (unpublished/draft never reach the archive)', page.includes('getPublicProject(supabase, projectId)') && page.includes('if (!project) notFound()'))

// 3. Activity Archive section + the permanent-record message.
check('Activity Archive section exists', archive.includes('Activity Archive'))
check('archive message: "This activity has been completed."', archive.includes('This activity has been completed.'))
check('archive message: permanent public archive', archive.includes('This page will become the permanent public archive of the activity.'))
check('page renders the ActivityArchive in the completed branch', page.includes('<ActivityArchive />'))

// 4. Future sections appear only as placeholders (Coming soon) — no implementation.
check('future sections are placeholders: Photos/Videos/Organizer Story/Participant Reviews/Achievements',
  ['Photos', 'Videos', 'Organizer Story', 'Participant Reviews', 'Achievements'].every((s) => archive.includes(`'${s}'`)) && archive.includes('Coming soon'))
check('no media/reviews/uploads/entity implementation in the archive', !/<input|<video|<img|<form|upload|createReview|createStory|createGallery/i.test(archive.replace(/\/\/.*$/gm, '')))

// 5. Current activities unchanged — the else branch keeps the existing schedule + Join, and the archive has no Join.
check('current (upcoming) branch keeps the schedule + JoinButton', page.includes('<JoinButton') && page.includes("occurrences.length > 1 ? 'Choose a date'"))
{
  const archiveBranch = page.slice(page.indexOf('showArchive ? ('), page.indexOf(') : ('))
  check('completed archive is NOT joinable (no JoinButton in the archive branch)', !archiveBranch.includes('<JoinButton'))
}

// 6. Organizer Archive links to the Public Activity Space (completed cards → /p/[projectId]).
check('completed cards link to the Public Activity Space (/p/[projectId])', card.includes('/${locale}/p/${card.projectId}'))
check('Organizer Archive renders completed activities via those cards', view.includes('completedActivities.map') && view.includes('<ActivityCard'))

// 7. No new entity / schema / migration.
check('no new entity/table introduced', !/PublicActivity|from\('(galleries|reviews|stories|memories|archives)'\)|CREATE TABLE/i.test(archive + page))
check('no new migration for the public activity space', (() => { try { read('../supabase/migrations/063_public_activity_space.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

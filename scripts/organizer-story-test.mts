// Organizer Story — first Activity Memory contract test.
//
// The organizer's public reflection on a completed public activity, stored as a simple Project property. Shown
// only in the Public Activity Space (published + public + completed); public read-only; owner-only plain-text
// edit; placeholder when empty. No Story/Memory entity; minimal persistence only. Source analysis.
//
//   Run:  npx tsx scripts/organizer-story-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/063_project_organizer_story.sql')
const store = read('../lib/projects/store.ts')
const action = read('../lib/actions/organizer-story.ts')
const comp = read('../components/activities/OrganizerStory.tsx')
const archive = read('../components/activities/ActivityArchive.tsx')
const page = read('../app/[locale]/p/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Minimal persistence — one nullable text column; NO Story/Memory/Timeline entity.
check('migration adds a single organizer_story text column (idempotent)', mig.includes('ADD COLUMN IF NOT EXISTS organizer_story TEXT'))
check('story is nullable (NULL = no story → placeholder)', !/organizer_story TEXT NOT NULL/.test(mig))
check('no Story/Memory/Timeline entity (only ALTER projects)', !/CREATE TABLE/i.test(mig) && mig.includes('ALTER TABLE') && mig.includes('projects'))

// 2. Store — a Project property; tolerant read; owner-scoped write.
check('getProjectOrganizerStory reads the column, tolerant null', store.includes("select('organizer_story')") && /getProjectOrganizerStory[\s\S]{0,400}return null/.test(store))
check('setProjectOrganizerStory owner-scoped update', store.includes('.update({ organizer_story: story })'))

// 3. Action — owner-only, plain text, length-limited.
check('setOrganizerStoryAction is owner-gated', action.includes('export async function setOrganizerStoryAction') && action.includes('getProject(supabase, projectId)') && action.includes("error: 'not_authenticated'"))
check('reasonable length limit enforced', action.includes('ORGANIZER_STORY_MAX') && action.includes("error: 'too_long'"))
check('empty story clears it (→ placeholder)', action.includes('trimmed.length > 0 ? trimmed : null'))

// 4. Editor — lightweight PLAIN TEXT (no markdown/rich-text), owner-only, calls the action.
check('owner sees a plain textarea editor (no markdown/rich-text)', comp.includes('<textarea') && !/markdown|ReactQuill|contentEditable|rich.?text/i.test(comp.replace(/\/\/.*$/gm, '')))
check('editor calls the owner-gated action', comp.includes('setOrganizerStoryAction(projectId, draft, locale)'))
check('non-owner is READ-ONLY (no editor)', comp.includes('if (!canEdit)') && comp.includes('return ('))
check('placeholder "Coming soon" when no story exists', comp.includes('Coming soon'))
check('does not fabricate content / no AI summary', !/generateSummary|aiSummary|openai|fabricate/i.test(comp))

// 5. Belongs to the completed public activity — rendered only in the archive, owner-edit gated on it.
check('Organizer Story rendered inside Activity Memories (archive)', archive.includes('<OrganizerStory') && archive.includes('Activity Memories'))
check('page loads the story only in the archive state', page.includes('showArchive ? await getProjectOrganizerStory(supabase, projectId) : null'))
check('edit allowed only for the owner on a completed public activity', page.includes('canEditStory={showArchive && isOwner}') && page.includes('user.id === organizerId'))

// 6. Only Organizer Story implemented — Photos/Videos/Participant Stories/Reviews remain placeholders.
check('Photos/Videos/Participant Stories/Reviews still placeholders (not implemented)',
  archive.includes("'Photos'") && archive.includes("'Videos'") && archive.includes("'Participant Stories'") && archive.includes("'Reviews'"))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

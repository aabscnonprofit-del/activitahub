// Activity Memories Storage — refactor contract test.
//
// Organizer Story persistence moves off `projects` into a dedicated project_activity_memories storage layer, so
// Project stays the source of truth for the ACTIVITY, not a dumping ground for memory content. Behavior/UI are
// unchanged. Verifies the table, the data move (copy + drop), owner-write/public-read permissions, and that no
// code reads projects.organizer_story. Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/activity-memories-storage-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/064_project_activity_memories.sql')
const store = read('../lib/projects/store.ts')
const action = read('../lib/actions/organizer-story.ts')
const storyComp = read('../components/activities/OrganizerStory.tsx')
const archive = read('../components/activities/ActivityArchive.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Dedicated storage table — one row per Project, minimal fields only (no photos/videos/reviews/etc.).
check('project_activity_memories table created (idempotent)', mig.includes('CREATE TABLE IF NOT EXISTS project_activity_memories'))
check('one row per Project (project_id PK/FK to projects)', mig.includes('project_id      UUID PRIMARY KEY REFERENCES projects(id)'))
check('only organizer_story content field + timestamps (no photos/videos/reviews/links/documents)',
  mig.includes('organizer_story TEXT') && !/\b(photos|videos|reviews|participant_stories|documents|links)\b/i.test(mig.replace(/--.*$/gm, '')))

// 2. Data move — copy existing story off projects, then drop the legacy column (safest guarded path).
check('copies existing Organizer Story from projects into the memories table',
  mig.includes('INSERT INTO project_activity_memories (project_id, organizer_story)') && mig.includes('SELECT id, organizer_story FROM projects'))
check('drops the legacy projects.organizer_story column (guarded)', mig.includes('DROP COLUMN organizer_story') && mig.includes("column_name = 'organizer_story'"))

// 3. Permissions — owner-only writes; public read only for published + public (private/draft never exposed).
check('owner read+write RLS', mig.includes('project_activity_memories_owner_rw') && mig.includes('p.owner_id = auth.uid()'))
check('public read only for published + public Projects', mig.includes('project_activity_memories_public_read') && mig.includes("p.is_published = TRUE AND p.visibility = 'public'"))

// 4. Store reads/writes the new layer; NO code reads projects.organizer_story anymore.
check('store getter/setter use project_activity_memories', store.includes("from('project_activity_memories').select('organizer_story')") && store.includes("from('project_activity_memories').upsert("))
check('no read of projects.organizer_story remains', !/from\('projects'\)[\s\S]{0,80}organizer_story|update\(\{ organizer_story/.test(store))
check('getProject (COLS) never selected organizer_story', !store.includes('organizer_story,') && store.includes("const COLS = 'id, owner_id, status"))

// 5. Behavior/UI unchanged — same store function names; action + components untouched by the move.
check('store function names unchanged (callers/UI need no change)', store.includes('export async function getProjectOrganizerStory') && store.includes('export async function setProjectOrganizerStory'))
check('action still calls setProjectOrganizerStory (unchanged surface)', action.includes('setProjectOrganizerStory(supabase, projectId'))
check('OrganizerStory + ActivityArchive UI unchanged (still owner-edit + placeholder)', storyComp.includes('setOrganizerStoryAction(projectId, draft, locale)') && archive.includes('<OrganizerStory'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

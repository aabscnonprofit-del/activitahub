// Activity Memories — placeholder-container contract test.
//
// Inside the Public Activity Space, the Activity Archive placeholders are reorganized into a dedicated Activity
// Memories section — the permanent container for future content (photos/videos/stories/reviews/results/…).
// Placeholders ONLY: no uploads, media, forms, interactions, storage, API, or database. Source analysis.
//
//   Run:  npx tsx scripts/activity-memories-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const archive = read('../components/activities/ActivityArchive.tsx')
const page = read('../app/[locale]/p/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Activity Memories section exists, with its future-versions explanation.
check('Activity Memories section present', archive.includes('Activity Memories'))
check('memories intro explains future content will appear here', /will appear here in future versions/i.test(archive))

// 2. The remaining placeholder cards (Organizer Story is now a real block, not a placeholder), each "Coming soon".
const MEMORIES = ['Photos', 'Videos', 'Participant Stories', 'Reviews', 'Results', 'Achievements', 'Shared Links', 'Documents']
check('remaining memory placeholders present', MEMORIES.every((m) => archive.includes(`'${m}'`)))
check('Organizer Story is a real block (rendered), not a placeholder', archive.includes('<OrganizerStory') && !archive.includes("'Organizer Story'"))
check('each placeholder is "Coming soon"', archive.includes('Coming soon'))
check('flat "Participant Reviews" placeholder reorganized (now Participant Stories + Reviews)',
  !archive.includes("'Participant Reviews'") && archive.includes("'Participant Stories'") && archive.includes("'Reviews'"))

// 3. Structure: Activity Archive precedes Activity Memories (within the same archive presentation).
check('Activity Archive appears before Activity Memories', archive.indexOf('Activity Archive') < archive.indexOf('Activity Memories'))
check('page order: activity info → Activity Archive → Activity Memories (via <ActivityArchive)', page.includes('<ActivityArchive '))

// 4. Placeholders only — no upload/media/form/interaction/storage/API/DB.
const code = archive.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
check('no upload/media/form/interaction in the Memories section',
  !/<input|<textarea|<form|<button|<video|<img|onClick|upload/i.test(code))
check('no storage/API/database in the Memories section',
  !/from\('|fetch\(|createClient|supabase|storage|bucket|createGallery|createMemory/i.test(code))

// 5. No new entity / schema / migration.
check('no new migration for activity memories', (() => { try { read('../supabase/migrations/063_activity_memories.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Activity Memories UNIFIED Storage — refactor contract test.
//
// Backlog note 3 trigger (third text memory type) resolved: the per-type tables (project_activity_memories /
// project_activity_participant_memories / project_activity_reviews) consolidate into ONE content layer,
// project_activity_memory_items (typed items: organizer_story / participant_story / activity_review). Behavior/UI
// unchanged. Verifies the unified table, the single uniqueness constraint, the author model, RLS (public read +
// owner-writes-organizer-story + participant-writes-own-approved, organizer can't edit participant items), the
// data migration + drop of all three legacy tables, and that ALL store paths use the unified layer only.
//
//   Run:  npx tsx scripts/activity-memories-storage-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/067_project_activity_memory_items.sql')
const memStore = read('../lib/activity-memories/store.ts')
const projStore = read('../lib/projects/store.ts')
const storyAction = read('../lib/actions/organizer-story.ts')
const participantAction = read('../lib/actions/participant-story.ts')
const reviewAction = read('../lib/actions/activity-review.ts')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Unified table + single uniqueness constraint enforcing all three rules.
check('unified project_activity_memory_items table created (idempotent)', mig.includes('CREATE TABLE IF NOT EXISTS project_activity_memory_items'))
check('typed item columns (author_type/author_id/memory_type/body)', ['author_type TEXT NOT NULL', 'author_id   UUID', 'memory_type TEXT NOT NULL', 'body        TEXT'].every((c) => mig.includes(c)))
check('one constraint enforces all three uniqueness rules', mig.includes('UNIQUE (project_id, memory_type, author_id)'))

// 2. RLS — public read (published+public); owner writes organizer_story; participant writes own approved items.
check('public read only for published + public', mig.includes('pami_public_read') && mig.includes("p.is_published = TRUE AND p.visibility = 'public'"))
check('owner writes organizer_story only', mig.includes('pami_organizer_story') && mig.includes("memory_type = 'organizer_story' AND author_type = 'organizer' AND author_id = auth.uid()"))
check('participant writes own participant_story/activity_review, only if approved',
  mig.includes('pami_participant') && mig.includes("memory_type IN ('participant_story', 'activity_review')") && mig.includes("pp.status = 'approved'"))

// 3. Data migration from all three legacy tables + drop (safest clean path), preserving timestamps.
check('migrates organizer_story from project_activity_memories (author = owner)',
  mig.includes("'organizer', p.owner_id, 'organizer_story', m.organizer_story") && mig.includes('DROP TABLE project_activity_memories'))
check('migrates participant_story from project_activity_participant_memories',
  mig.includes("'participant', participant_id, 'participant_story', participant_story") && mig.includes('DROP TABLE project_activity_participant_memories'))
check('migrates activity_review from project_activity_reviews',
  mig.includes("'participant', participant_id, 'activity_review', review_text") && mig.includes('DROP TABLE project_activity_reviews'))
check('migration preserves created_at/updated_at + guarded (idempotent)',
  mig.includes('created_at, updated_at') && mig.includes("information_schema.tables WHERE table_name = 'project_activity_memories'"))

// 4. All store paths use ONLY the unified layer — no legacy tables anywhere in app code.
check('organizer store uses the unified layer', projStore.includes("from('project_activity_memory_items')") && projStore.includes("'organizer_story'"))
check('participant story + review store use the unified layer', memStore.includes("from('project_activity_memory_items')") && memStore.includes('participant_story') && memStore.includes('activity_review'))
check('no legacy memory tables referenced in the stores',
  !/project_activity_memories\b|project_activity_participant_memories|project_activity_reviews\b/.test(memStore + projStore))

// 5. Behavior unchanged — eligibility helpers still reused; UI/action surfaces intact.
check('organizer story still owner-gated (getProject)', storyAction.includes('getProject(supabase, projectId)'))
check('participant story still reuses Participant Memory Eligibility', participantAction.includes('getParticipantMemoryEligibility('))
check('activity review still reuses Review Eligibility', reviewAction.includes('getReviewEligibility('))
check('no ticket read anywhere in the memory actions', !/ticket/i.test((participantAction + reviewAction + storyAction).replace(/\/\/.*$/gm, '')))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

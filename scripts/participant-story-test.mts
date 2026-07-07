// Participant Story — first participant-generated memory contract test.
//
// A participant's short reflection on a completed public activity, in the Activity Memories participant-memories
// storage. Eligibility reuses the shared Participant Memory Eligibility helper; only the eligible participant
// edits their OWN story; the organizer cannot; public read-only; one per participant. No likes/reactions/
// comments/uploads/photos/videos. Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/participant-story-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/065_project_activity_participant_memories.sql')
const store = read('../lib/activity-memories/store.ts')
const action = read('../lib/actions/participant-story.ts')
const comp = read('../components/activities/ParticipantStories.tsx')
const archive = read('../components/activities/ActivityArchive.tsx')
const page = read('../app/[locale]/p/[projectId]/page.tsx')
const organizerStory = read('../components/activities/OrganizerStory.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Storage — dedicated child table; one story per (project, participant); minimal fields; no reactions etc.
check('participant-memories table created (idempotent)', mig.includes('CREATE TABLE IF NOT EXISTS project_activity_participant_memories'))
check('one story per participant per activity (PK project_id, participant_id)', mig.includes('PRIMARY KEY (project_id, participant_id)'))
check('minimal fields — participant_story text only (no versioning/reactions/comments/likes)',
  mig.includes('participant_story TEXT') && !/\b(version|reaction|comment|like|reply|vote)\b/i.test(mig.replace(/--.*$/gm, '')))
check('no Story/Timeline/Feed entity (child storage only)', (mig.match(/CREATE TABLE/gi) ?? []).length === 1)

// 2. Permissions (RLS) — participant self-write + approved; organizer cannot edit; public read for published+public.
check('participant writes ONLY their own story, and only if approved',
  mig.includes('participant_id = auth.uid()') && mig.includes("pp.account_id = auth.uid()") && mig.includes("pp.status = 'approved'"))
check('public read only for published + public', mig.includes('papm_public_read') && mig.includes("p.is_published = TRUE AND p.visibility = 'public'"))
check('no organizer-write policy (organizer cannot edit participant stories)', !/owner_id = auth\.uid\(\)/.test(mig))

// 3. Action — reuses the eligibility helper (no duplicated participation rules); never reads the Ticket System.
check('setParticipantStoryAction reuses getParticipantMemoryEligibility', action.includes('getParticipantMemoryEligibility({'))
check('action is auth-gated + rejects the ineligible', action.includes("error: 'not_authenticated'") && action.includes("error: 'not_eligible'"))
check('action enforces a length limit + writes the caller\'s own story', action.includes('PARTICIPANT_STORY_MAX') && action.includes('setParticipantStory(supabase, projectId, user.id'))
check('action never reads the Ticket System', !/ticket_type|getProjectTicketType|TicketType/i.test(action.replace(/\/\/.*$/gm, '')))

// 4. Store — child-table get/set(own)/list(with names, chronological).
check('store uses the participant-memories table', store.includes("from('project_activity_participant_memories')"))
check('store lists stories with names, chronological', store.includes('listParticipantStories') && store.includes('getParticipantProfiles') && store.includes("order('created_at', { ascending: true })"))
check('store upserts one row per (project, participant)', store.includes("onConflict: 'project_id,participant_id'"))

// 5. Display + editor — public read-only list (name + text); eligible participant edits own; plain text; placeholder.
check('public read-only list shows name + story text', comp.includes('s.name') && comp.includes('s.story'))
check('placeholder "Coming soon" when empty and not contributing', comp.includes('stories.length === 0 && !canContribute') && comp.includes('Coming soon'))
check('eligible participant gets a plain textarea editor for their OWN story', comp.includes('canContribute &&') && comp.includes('<textarea') && comp.includes('setParticipantStoryAction(projectId, draft, locale)'))
check('no markdown/rich-text/AI; no likes/reactions/comments/replies/voting',
  !/markdown|ReactQuill|contentEditable|generateSummary|aiSummary|\blikes\b|reaction|\bcomments?\b|\breplies\b|\bvot(e|ing)\b|popularity/i.test(comp.replace(/\/\/.*$/gm, '')))
check('no photos/videos/upload implementation', !/upload|<video|<img|<input type="file"/i.test(comp.replace(/\/\/.*$/gm, '')))

// 6. Wiring — rendered in Activity Memories; eligibility computed via the helper on the page.
check('ActivityArchive renders ParticipantStories', archive.includes('<ParticipantStories'))
check('page loads stories + computes contribution via the eligibility helper',
  page.includes('listParticipantStories(projectId)') && page.includes('getParticipantMemoryEligibility({') && page.includes('canContributeStory'))

// 7. Organizer Story unchanged.
check('Organizer Story unchanged (still its own owner-edit block)', archive.includes('<OrganizerStory') && organizerStory.includes('setOrganizerStoryAction(projectId, draft, locale)'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

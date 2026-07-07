// Activity Reviews — first Reviews implementation contract test.
//
// Participant feedback attached to a completed public activity, displayed inside Activity Memories. Eligibility
// reuses the canonical Review Eligibility helper; only the eligible participant edits their OWN review; organizer
// cannot; public read-only; one per participant; chronological. TEXT ONLY — no star/numeric ratings, no trust/
// reputation score, no likes/comments/replies/voting/moderation/recommendation. Source analysis.
//
//   Run:  npx tsx scripts/activity-reviews-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/066_project_activity_reviews.sql')
const store = read('../lib/activity-memories/store.ts')
const action = read('../lib/actions/activity-review.ts')
const comp = read('../components/activities/ActivityReviews.tsx')
const archive = read('../components/activities/ActivityArchive.tsx')
const page = read('../app/[locale]/p/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Storage — dedicated table; one review per (project, participant); minimal fields; NO ratings/scores.
check('project_activity_reviews table created (idempotent)', mig.includes('CREATE TABLE IF NOT EXISTS project_activity_reviews'))
check('one review per participant per activity (PK project_id, participant_id)', mig.includes('PRIMARY KEY (project_id, participant_id)'))
check('review_text only — no rating/score/version columns',
  mig.includes('review_text    TEXT') && !/\b(rating|stars?|score|numeric|reputation|trust|version|votes?)\b/i.test(mig.replace(/--.*$/gm, '')))

// 2. Permissions (RLS) — participant self-write + approved; organizer cannot edit; public read for published+public.
check('participant writes ONLY their own review, and only if approved',
  mig.includes('participant_id = auth.uid()') && mig.includes("pp.account_id = auth.uid()") && mig.includes("pp.status = 'approved'"))
check('public read only for published + public', mig.includes('par_public_read') && mig.includes("p.is_published = TRUE AND p.visibility = 'public'"))
check('no organizer-write policy (organizer cannot edit reviews)', !/owner_id = auth\.uid\(\)/.test(mig))

// 3. Action — reuses the canonical Review Eligibility (no duplicated rules); never reads the Ticket System.
check('setActivityReviewAction reuses getReviewEligibility', action.includes('getReviewEligibility({'))
check('action auth-gated + rejects the ineligible + length-limited + writes own review',
  action.includes("error: 'not_authenticated'") && action.includes("error: 'not_eligible'") && action.includes('ACTIVITY_REVIEW_MAX') && action.includes('setActivityReview(supabase, projectId, user.id'))
check('action never reads the Ticket System', !/ticket_type|getProjectTicketType|TicketType/i.test(action.replace(/\/\/.*$/gm, '')))

// 4. Store — child-table get/set(own)/list(names + date, chronological).
check('store uses the reviews table + upserts one row per (project, participant)',
  store.includes("from('project_activity_reviews')") && store.includes("onConflict: 'project_id,participant_id'"))
check('store lists reviews with names, chronological', store.includes('listActivityReviews') && store.includes("order('created_at', { ascending: true })"))

// 5. Display + editor — read-only list (name + text + date); eligible participant edits own; plain text; placeholder.
check('list shows name + review text + creation date', comp.includes('r.name') && comp.includes('r.review') && comp.includes('r.createdAt'))
check('placeholder "Coming soon" when empty and not eligible', comp.includes('reviews.length === 0 && !canReview') && comp.includes('Coming soon'))
check('eligible participant gets a plain textarea editor for their OWN review', comp.includes('canReview &&') && comp.includes('<textarea') && comp.includes('setActivityReviewAction(projectId, draft, locale)'))
check('NO star/numeric ratings, reputation/trust/score, likes/comments/replies/voting/moderation/recommendation',
  !/\b(star|rating|numeric|reputation|trust|score|like|dislike|\bcomments?\b|\breplies\b|reaction|\bvot(e|ing)\b|moderation|recommend|ranking|popularity)\b/i.test(comp.replace(/\/\/.*$/gm, '')))
check('no markdown/rich-text/AI', !/markdown|ReactQuill|contentEditable|generateSummary|aiSummary/i.test(comp.replace(/\/\/.*$/gm, '')))

// 6. Wiring — rendered in Activity Memories after Participant Stories; eligibility via Review Eligibility on the page.
check('ActivityArchive renders ActivityReviews (after ParticipantStories)',
  archive.includes('<ActivityReviews') && archive.indexOf('<ParticipantStories') < archive.indexOf('<ActivityReviews'))
check("'Reviews' removed from the placeholder grid (now a real block)", !archive.includes("'Reviews'"))
check('page loads reviews + computes canReview via Review Eligibility',
  page.includes('listActivityReviews(projectId)') && page.includes('getReviewEligibility({') && page.includes('canReview'))

// 7. Review Eligibility + Participant Stories untouched by this increment (reused only).
check('Participant Stories block still present (unchanged)', archive.includes('<ParticipantStories') && archive.includes('<OrganizerStory'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

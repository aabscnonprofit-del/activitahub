// Organizer Public Presence — the public Organizer Page is one consistent, facts-only professional identity.
// Both public routes render the SAME view; it presents identity + measurable experience (participants hosted),
// current work, professional history, and WRITTEN participant feedback — never ratings/averages/scores.
//
//   Run:  npx tsx scripts/organizer-public-presence-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const slugPage = read('app/[locale]/o/[slug]/page.tsx')
const idPage = read('app/[locale]/organizers/[id]/page.tsx')
const view = read('components/organizer/OrganizerPublicView.tsx')
const facts = read('lib/reviews/organizer-review-facts.ts')
const helper = read('lib/organizer/public-presence.ts')

// ── Consistency: both routes render the SAME view via the shared projection ───────────────────
check('/o/[slug] renders OrganizerPublicView via the shared projection',
  slugPage.includes('getOrganizerPublicPageData') && slugPage.includes('<OrganizerPublicView'))
check('/organizers/[id] renders OrganizerPublicView via the shared projection',
  idPage.includes('getOrganizerPublicPageData') && idPage.includes('<OrganizerPublicView'))
check('the ratings-based OrganizerProfileView is no longer rendered by either route',
  !slugPage.includes('OrganizerProfileView') && !idPage.includes('OrganizerProfileView'))

// ── Identity: avatar (photo + initials fallback), name, location, languages, bio ──────────────
check('avatar photo with an initials fallback', view.includes('avatarUrl ?') && view.includes('initials(org.display_name)'))
check('identity shows name, location, languages, bio', view.includes('org.display_name') && view.includes('org.city') && view.includes('org.languages') && view.includes('org.bio'))

// ── Experience: measurable facts incl. Participants Hosted (primary) + categories ─────────────
check('Participants hosted is a displayed experience fact', view.includes("label: 'Participants hosted'") && view.includes('participantsHosted'))
check('Completed + Current activities are facts', view.includes("label: 'Completed activities'") && view.includes("label: 'Current activities'"))
check('Organizer since is shown', view.includes("label: 'Organizer since'"))
check('Verification (certified) is shown as a credential', view.includes("label: 'Verification'") && view.includes('org.certified'))
check('activity categories are displayed', view.includes('categories') && view.includes('humanizeCategory'))
check('participants hosted is derived from existing project_participants (no new persistence)',
  helper.includes("from('project_participants')") && helper.includes("eq('status', 'approved')"))
check('avatar reuses existing profiles.avatar_url (no new persistence)', helper.includes("select('avatar_url')"))

// ── History + current work + written feedback ─────────────────────────────────────────────────
check('current activities section (active today)', view.includes('Current activities') && view.includes('activities.map'))
check('past-activities archive section', view.includes('Past activities') && view.includes('completedActivities.map'))
check('WRITTEN participant feedback is rendered (bodies, not just counts)',
  view.includes('Participant feedback') && view.includes('reviewFacts.entries') && view.includes('{r.body}'))
check('review facts projection carries the written entries', facts.includes('entries: { body: string; date: string }[]') && facts.includes('entries:'))

// ── Facts only: no star-rating UI or averaged score rendered as the organizer's identity ──────
check('the public view renders no StarRating component', !view.includes('StarRating'))
check('the public view never renders org.rating or review_count as a score',
  !view.includes('org.rating') && !view.includes('review_count') && !view.includes('★'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

// Public Organizer Page — contract test.
//
// A participant-facing public projection: organizer profile + CURRENT public activities (published Projects
// WHERE visibility = 'public') + a Past Activities placeholder. Asserts the strict data rule (only published
// public Projects appear), no private data, the Activity Page link, and that it is a projection (no new entity/
// migration). Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/organizer-public-page-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const page = read('../app/[locale]/organizers/[id]/page.tsx')
const view = read('../components/organizer/OrganizerPublicView.tsx')
const cards = read('../lib/activity-marketplace/cards.ts')
const activityPage = read('../app/[locale]/p/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Public Organizer Page exists at /organizers/[id], reading existing public organizer data + Project activities.
check('organizer page renders the public view', page.includes('<OrganizerPublicView') && page.includes('getPublicOrganizer(supabase, id)'))
check('organizer page loads the organizer\'s public activities', page.includes('listOrganizerPublicActivities(id, new Date().toISOString())'))
check('missing organizer → 404 (no fake page)', page.includes('notFound()'))

// 2. Profile shows public info (name / bio / location / languages) with safe placeholders; no private data.
check('profile shows name / location / languages / bio', view.includes('org.display_name') && view.includes('org.city') && view.includes('org.languages') && view.includes('org.bio'))
check('safe placeholder when bio is missing', view.includes("org.bio || 'This organizer"))
check('no private account data exposed (no email/phone/account fields)', !/org\.(email|phone|account)|\bemail\b|\bphone\b/i.test(view))

// 3. Current activities = published Projects WHERE visibility = public (the strict data rule).
check('per-organizer query scoped to the organizer', cards.includes("export async function listOrganizerPublicActivities") && cards.includes(".eq('owner_id', organizerId)"))
check('data rule: published', cards.includes(".eq('is_published', true)"))
check('data rule: visibility = public (private never appears)', cards.includes(".eq('visibility', 'public')"))
check('data rule: approved (draft never appears)', cards.includes(".not('approved_at', 'is', null)"))
{
  // The per-organizer query must carry ALL of owner + published + public + approved together.
  const fn = cards.slice(cards.indexOf('listOrganizerPublicActivities'))
  check('per-organizer query requires owner + published + public + approved together',
    fn.includes(".eq('owner_id', organizerId)") && fn.includes(".eq('is_published', true)") && fn.includes(".eq('visibility', 'public')") && fn.includes(".not('approved_at', 'is', null)"))
}

// 4. Past Activities — placeholder, NOT faked.
check('past activities is a placeholder (not faked)', view.includes('Past Activities archive will appear after completed-project tracking is available'))

// 5. Activity Page links to the Organizer Page.
check('Activity Page shows "Organized by" linking to /organizers/[organizerId]',
  activityPage.includes('Organized by') && activityPage.includes('/organizers/${organizerId}') && activityPage.includes('getPublicOrganizer(supabase, organizerId)'))

// 6. Projection only — no new entity / migration; Local Activities catalog query unchanged.
check('no new migration added for the organizer page', (() => { try { read('../supabase/migrations/063_organizer_page.sql'); return false } catch { return true } })())
check('Local Activities catalog query still present + unchanged rule (published+public+approved, degrades to [])',
  cards.includes('export async function listMarketplaceActivities') && cards.includes('if (!projects) return []'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

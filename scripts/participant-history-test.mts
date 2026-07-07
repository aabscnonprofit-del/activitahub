// Participant History — contract test.
//
// The participant-side projection of completed PUBLIC activities the signed-in user attended as an APPROVED
// participant. Read-only projection over Project + Participants + the shared completed-public-activities rule —
// no history table/entity. Only completed + public + approved; newest first, each once; ticket ownership never
// grants history. Links to the existing Public Activity Space. Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/participant-history-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const cards = read('../lib/activity-marketplace/cards.ts')
const page = read('../app/[locale]/me/history/page.tsx')
const card = read('../components/activities/ActivityCard.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}
const fn = cards.slice(cards.indexOf('export async function listParticipantHistory'))

// 1. Query — approved participations only (participation is the source of truth; never tickets).
check('listParticipantHistory exists', cards.includes('export async function listParticipantHistory'))
check('reads the user\'s APPROVED participations', fn.includes("from('project_participants').select('project_id').eq('account_id', userId).eq('status', 'approved')"))
check('ticket ownership never grants history (never reads the Ticket System)', !/ticket/i.test(fn.replace(/\/\/.*$/gm, '')))

// 2. Data rule — published + public + approved + COMPLETED (private/draft never appear).
check('requires published + visibility public + approved', fn.includes(".eq('is_published', true)") && fn.includes(".eq('visibility', 'public')") && fn.includes(".not('approved_at', 'is', null)"))
check('only COMPLETED activities (reuses the shared completed-public-activities helper)', fn.includes('if (!isProjectCompleted(occs, nowMs)) continue') && fn.includes('representativeOccurrence(occs, nowMs, true)'))
check('scoped to the participations (.in(id, projectIds))', fn.includes(".in('id', projectIds)"))

// 3. Newest-completed first; each activity once.
check('newest completed first', /cards\.sort\(\(a, b\) => new Date\(b\.startsAt[\s\S]*a\.startsAt/.test(fn))
check('each activity appears once (deduped project ids)', fn.includes('[...new Set('))

// 4. Page — exists, requires auth, empty state, links to the Public Activity Space (no duplicate activity page).
check('participant history page loads the history', page.includes('listParticipantHistory(user.id, new Date().toISOString())'))
check('requires sign-in', page.includes('if (!user) redirect(`/${locale}/sign-in`)'))
check('empty state message', page.includes('completed any public activities yet'))
check('renders items via ActivityCard (which links to /p/[projectId] — no duplicate activity page)',
  page.includes('<ActivityCard') && card.includes('/${locale}/p/${card.projectId}'))

// 5. No new entity / table / migration; a projection only.
check('no history table/entity (a projection; page component name is not an entity)',
  !/CREATE TABLE|from\('(participant_history|histories|history)'\)|interface ParticipantHistory\b|class ParticipantHistory\b/i.test(cards + page))
check('no new migration for participant history', (() => { try { read('../supabase/migrations/066_participant_history.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

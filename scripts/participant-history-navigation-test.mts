// Participant History navigation — contract test.
//
// Navigation-only: the existing /me/history projection page becomes discoverable from the participant's personal
// area (the account hub). Reuses the existing page (no duplicate route/dashboard), one nav entry, no history
// logic change, auth still required. Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/participant-history-navigation-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const account = read('../app/[locale]/account/page.tsx')
const header = read('../components/layout/PublicHeader.tsx')
const historyPage = read('../app/[locale]/me/history/page.tsx')
const en = JSON.parse(read('../messages/en.json'))

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Reachable from the participant's personal area (the account hub) → the existing /me/history page.
check('account hub links to /me/history', account.includes('href={`/${locale}/me/history`}'))
check('link uses account.history i18n (a real nav entry)', account.includes("t('history.title')") && account.includes("t('history.cta')"))

// 2. No duplicate navigation entries — exactly one link to /me/history, and not also in the global header.
check('exactly one /me/history link in the account hub', (account.match(/href=\{`\/\$\{locale\}\/me\/history`\}/g) ?? []).length === 1)
check('not duplicated in the global header', !header.includes('/me/history'))

// 3. Reuses the existing page — no new route / dashboard / entity.
check('history i18n present (all card fields) in en', !!en.account?.history?.title && !!en.account?.history?.description && !!en.account?.history?.cta)
check('reuses the existing /me/history projection page (unchanged, still auth-gated)',
  historyPage.includes('listParticipantHistory(user.id') && historyPage.includes('if (!user) redirect(`/${locale}/sign-in`)'))
check('no new dashboard / history entity introduced by navigation',
  !/Dashboard|CREATE TABLE|ParticipantHistory(Model|Entity)/.test(account.replace(/LayoutDashboard/g, '').replace(/\/dashboard/g, '')))

// 4. Permissions unchanged — history is authenticated-only (the page redirects); the nav is on an authed page.
check('history remains authenticated-only (page redirects unauthenticated users)', historyPage.includes('redirect(`/${locale}/sign-in`)'))

// 5. No new migration for navigation.
check('no new migration for the navigation change', (() => { try { read('../supabase/migrations/066_participant_history_nav.sql'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

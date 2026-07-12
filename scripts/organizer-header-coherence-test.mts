// Organizer entry coherence (Launch Polish Wave 1) — an authenticated organizer sees their
// organizer-first header (the "Dashboard" link) on EVERY page they navigate, not a customer-first
// header. PublicHeader only renders the Dashboard link when it receives `isOrganizer`, so every
// non-token app page that renders PublicHeader must pass it. Token/external-link landing pages
// (safety/worker/client/rsvp/invoice/vendor-quote/participant/public-project) are viewed by
// token-holders, not organizers navigating to tools, and are intentionally excluded.
//
//   Run:  npx tsx scripts/organizer-header-coherence-test.mts

import { readFileSync, readdirSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(new URL(dir + '/', root), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name === 'page.tsx') out.push(p)
  }
  return out
}

// Token / external-link landing surfaces — viewed via a token, not organizer navigation.
const EXCLUDED = /\/(safety|worker|client|rsvp|invoice|vendor-quote|participant)\/\[token\]\/|\/p\/\[projectId\]\//

const pages = walk('app/[locale]').filter((f) => read(f).includes('<PublicHeader'))
const offenders = pages.filter(
  (f) => !EXCLUDED.test(f) && !read(f).includes('isOrganizer={viewer.isOrganizer}') && !read(f).includes('isOrganizer={viewer.isOrganizer }'),
)

check(`every non-token app page with PublicHeader passes isOrganizer (${pages.length} render it)`, offenders.length === 0)
if (offenders.length) offenders.forEach((f) => console.log(`     offender: ${f}`))

// Spot-check the pages an organizer reaches straight from the dashboard nav + the main trap.
for (const p of ['app/[locale]/account/page.tsx', 'app/[locale]/activities/page.tsx', 'app/[locale]/me/history/page.tsx', 'app/[locale]/plan-an-event/page.tsx']) {
  check(`${p.replace('app/[locale]/', '').replace('/page.tsx', '')} → organizer-aware header`, read(p).includes('isOrganizer={viewer.isOrganizer}'))
}

// PublicHeader still swaps to the Dashboard link when isOrganizer is set (unchanged capability).
const header = read('components/layout/PublicHeader.tsx')
check('PublicHeader renders a Dashboard link for organizers', header.includes('isOrganizer ? `/${locale}/dashboard`'))

// OAuth sign-in: an already-authenticated organizer lands in the Dashboard, not the customer account.
const oauth = read('app/[locale]/auth/sign-in/page.tsx')
check('OAuth sign-in authed redirect is organizer-aware',
  oauth.includes('viewer.isOrganizer ? `/${locale}/dashboard`'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

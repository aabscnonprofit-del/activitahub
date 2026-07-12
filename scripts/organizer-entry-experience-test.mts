// Launch Polish — Organizer Entry Experience (Wave 1).
//
// A subscribed Certified Organizer stays inside their working environment: the dashboard brand/logo
// returns them to the Dashboard (not the public landing), and a successful subscription checkout lands
// them in the Dashboard (not the Billing page). Existing routing/access rules are unchanged.
//
//   Run:  npx tsx scripts/organizer-entry-experience-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const dashHeader = read('components/layout/DashboardHeader.tsx')
const dashTopbar = read('components/layout/DashboardTopbar.tsx')
const billing = read('lib/actions/billing.ts')
const publicHeader = read('components/layout/PublicHeader.tsx')
const auth = read('lib/actions/auth.ts')

// ── Improvements: keep the organizer in their working environment ─────────────────────
check('dashboard header logo returns to the Dashboard, not the public landing',
  dashHeader.includes('href={`/${locale}/dashboard`}') && !/href=\{`\/\$\{locale\}`\}/.test(dashHeader))
check('dashboard topbar logo returns to the Dashboard, not the public landing',
  dashTopbar.includes('href={`/${locale}/dashboard`}') && !/href=\{`\/\$\{locale\}`\}/.test(dashTopbar))
check('a successful subscription checkout returns to the Dashboard (not Billing)',
  billing.includes('success_url: absoluteUrl(`/${locale}/dashboard?checkout=success`)'))

// ── Preserved behavior (no access-control / routing regression) ───────────────────────
check('sign-in still routes a subscribed Certified Organizer to the Dashboard',
  /role === 'certified_organizer' &&[\s\S]*?onboarding_status === 'subscribed'[\s\S]*?\/dashboard/.test(auth))
check('certified-but-unsubscribed still routed to Billing (access enforcement unchanged)',
  auth.includes("onboarding_status === 'certified'") && /\/billing/.test(auth))
check('Billing remains reachable from the public header for organizers (Dashboard link intact)',
  publicHeader.includes('isOrganizer ? `/${locale}/dashboard`'))
check('subscription cancel still returns to Billing (unchanged)',
  billing.includes('cancel_url: absoluteUrl(`/${locale}/billing?checkout=cancelled`)'))
check('Stripe Connect return still lands on the Dashboard (unchanged)',
  read('lib/actions/connect.ts').includes('/${locale}/dashboard?connect='))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

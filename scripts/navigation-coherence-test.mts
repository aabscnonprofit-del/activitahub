// Navigation coherence — the primary journeys must never route a new user into the LEGACY marketplace.
//
// Canonical Discover is /activities (the project-world catalog). Every primary-surface "discover / explore /
// browse activities" entry must point there, never at the legacy /marketplace (the parallel activities-table
// catalog that feeds the legacy request→proposal→booking flow). The legacy pages still exist; they are simply
// no longer reachable from the primary journeys.
//
//   Run:  npx tsx scripts/navigation-coherence-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Primary-journey surfaces a NEW user actually traverses.
const PRIMARY = {
  'landing': '../app/[locale]/page.tsx',
  'participant account hub': '../app/[locale]/account/page.tsx',
  'onboarding': '../app/[locale]/onboarding/page.tsx',
  'onboarding (experienced)': '../app/[locale]/onboarding/experienced/page.tsx',
  '404 / not-found': '../app/[locale]/not-found.tsx',
}

for (const [label, path] of Object.entries(PRIMARY)) {
  const src = read(path)
  check(`${label}: no link into the legacy /marketplace`, !src.includes('/${locale}/marketplace'))
  check(`${label}: routes Discover to the canonical /activities`, src.includes('/${locale}/activities'))
}

// Navigation chrome already canonical (guards against regressions).
const header = read('../components/layout/PublicHeader.tsx')
check('public header points "Marketplace" nav at the canonical /activities', header.includes('/${locale}/activities') && !header.includes('/${locale}/marketplace'))
const sidebar = read('../components/layout/DashboardSidebar.tsx')
check('dashboard sidebar Discover points at /activities', sidebar.includes('/${locale}/activities'))

// The legacy catalog is not deleted — only unlinked from primary journeys (this is navigation cleanup, not a
// feature removal). Its own internal links may still reference /marketplace.
const legacyExists = read('../app/[locale]/marketplace/page.tsx')
check('legacy marketplace page still exists (unlinked, not removed)', legacyExists.length > 0)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

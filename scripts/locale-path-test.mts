// Unit test for replaceLocaleInPath (locale switcher routing).
// Run: npx tsx scripts/locale-path-test.mts   — exit 0 = all pass, 1 = failure.

import { replaceLocaleInPath } from '../i18n/locale-path'

const cases: { pathname: string; next: string; expect: string }[] = [
  // The exact rules from the bug report
  { pathname: '/ru', next: 'de', expect: '/de' }, // rule 1
  { pathname: '/pt', next: 'pt', expect: '/pt' }, // rule 2 (was /pt/pt)
  { pathname: '/ru/planner', next: 'en', expect: '/en/planner' }, // rule 3
  { pathname: '/en/about', next: 'fr', expect: '/fr/about' }, // rule 4
  { pathname: '/about', next: 'ru', expect: '/ru/about' }, // rule 5 (no locale → prepend)
  { pathname: '/', next: 'ru', expect: '/ru' }, // root
  // Regression of the reported 404s
  { pathname: '/pt', next: 'de', expect: '/de' }, // was /pt/de
  { pathname: '/de', next: 'pt', expect: '/pt' }, // de/pt both previously unstripped
  // Deeper paths + all locales
  { pathname: '/ru/dashboard/settings', next: 'de', expect: '/de/dashboard/settings' },
  { pathname: '/es/marketplace', next: 'pt', expect: '/pt/marketplace' },
  { pathname: '/pt/academy', next: 'en', expect: '/en/academy' },
  // Non-locale first segment must NOT be treated as a locale (no false strip)
  { pathname: '/entrepreneur', next: 'de', expect: '/de/entrepreneur' },
  { pathname: '/o/some-slug', next: 'fr', expect: '/fr/o/some-slug' },
]

let failed = 0
for (const c of cases) {
  const got = replaceLocaleInPath(c.pathname, c.next)
  const ok = got === c.expect
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.pathname}  + ${c.next}  ->  ${got}${ok ? '' : `   (expected ${c.expect})`}`)
}

if (failed) {
  console.error(`\n${failed} case(s) failed.`)
  process.exit(1)
}
console.log(`\nAll ${cases.length} locale-path cases passed.`)

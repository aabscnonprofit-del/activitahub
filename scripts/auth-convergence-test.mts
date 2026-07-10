// Authentication convergence (Release Readiness) — one canonical sign-in entry.
//
// Middleware sends every unauthenticated protected-route access to /sign-in, so /sign-in is THE canonical
// entry. Every generic auth guard (page + server action) must therefore redirect there too — not to the
// non-canonical /auth/sign-in (the Google-OAuth page, reachable only through its own flow). Only the two
// Google-flow error redirects may reference /auth/sign-in.
//
//   Run:  npx tsx scripts/auth-convergence-test.mts

import { readFileSync, readdirSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

// Middleware canonical entry.
const mw = read('middleware.ts')
check('middleware routes unauthenticated protected access to the canonical /sign-in', mw.includes('/${locale}/sign-in`'))
check('middleware does not funnel to the non-canonical /auth/sign-in', !mw.includes('/auth/sign-in'))

// Walk app/ + lib/ for any bare guard redirect to /auth/sign-in.
function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(new URL(dir + '/', root), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) out.push(p)
  }
  return out
}

const files = [...walk('app'), ...walk('lib'), ...walk('components')]
const guardOffenders: string[] = []
const authFlowRefs: string[] = []
for (const f of files) {
  const src = read(f)
  // A bare guard redirect (no ?error query) to the non-canonical page.
  if (/redirect\(`\/\$\{locale\}\/auth\/sign-in`\)/.test(src) || /\/auth\/sign-in`\)/.test(src)) guardOffenders.push(f)
  if (src.includes('/auth/sign-in?error=')) authFlowRefs.push(f)
}
check('no bare auth-guard redirect targets the non-canonical /auth/sign-in', guardOffenders.length === 0)
check('the only remaining /auth/sign-in references are Google-flow error redirects (callback + google action)',
  authFlowRefs.length >= 1 && authFlowRefs.every((f) => f.includes('auth/callback') || f.includes('actions/auth.ts')))

// Spot-check a few repointed guards now use /sign-in.
for (const f of ['app/[locale]/dashboard/profile/page.tsx', 'lib/actions/invoices.ts', 'lib/actions/connect.ts']) {
  check(`${f} guard redirects to canonical /sign-in`, read(f).includes('/${locale}/sign-in`'))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

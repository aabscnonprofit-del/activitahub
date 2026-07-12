// One Event License → Project Workspace continuity (Phase 6 blocker F-P6-01).
//
// A One Event License purchaser must reach the Project Workspace of a project they OWN — and nothing
// else in /dashboard — without a Certified Organizer role or subscription. The middleware carve-out
// grants this ONLY when the user both owns the project AND has purchased a license; everyone else is
// unchanged. This test verifies the security-critical path scoping (independently replicated) and
// locks the carve-out shape at the source level (middleware runs on the edge runtime).
//
//   Run:  npx tsx scripts/oel-workspace-continuity-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const mw = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8')

// ── Path scoping: replicate the exact regex and prove it opens ONLY the project workspace ─────
const RE = /^\/dashboard\/projects\/([0-9a-fA-F-]{36})(?:\/.*)?$/
const id = (p: string) => (p.match(RE)?.[1] ?? null)
const UUID = '11111111-2222-4333-8444-555555555555'

check('matches /dashboard/projects/<uuid>', id(`/dashboard/projects/${UUID}`) === UUID)
check('matches a workspace sub-route (/budget)', id(`/dashboard/projects/${UUID}/budget`) === UUID)
check('does NOT match the /dashboard index', id('/dashboard') === null)
check('does NOT match the projects list (no id)', id('/dashboard/projects') === null)
check('does NOT match other dashboard areas (/dashboard/plans)', id('/dashboard/plans') === null)
check('does NOT match a non-uuid segment', id('/dashboard/projects/not-a-real-id') === null)
check('does NOT match /dashboard/activities', id('/dashboard/activities') === null)

// ── Carve-out shape (source-level) ───────────────────────────────────────────────────────────
check('carve-out helper is present', mw.includes('function projectWorkspaceId('))
check('carve-out lives inside the non-certified branch',
  mw.indexOf("role !== 'certified_organizer' && role !== 'admin'") < mw.indexOf('projectWorkspaceId(path)'))
check('access requires BOTH ownership AND a purchased license',
  mw.includes('ownedLicensedWorkspace = !!owned && !!license'))
check('ownership is checked against the projects table by owner_id',
  /from\('projects'\)[\s\S]*?\.eq\('owner_id', user\.id\)/.test(mw))
check('license is checked against event_licenses for this profile',
  /from\('event_licenses'\)[\s\S]*?\.eq\('profile_id', user\.id\)/.test(mw))
check('users without an owned+licensed workspace still redirect (blocked)',
  /if \(!ownedLicensedWorkspace\) \{[\s\S]*?\/onboarding/.test(mw))

// ── Nothing else in /dashboard is opened; existing security is preserved ──────────────────────
check('the certified-organizer subscription/access gate is preserved',
  mw.includes("if (role === 'certified_organizer')") && mw.includes('hasOrganizerAccess({'))
check('the admin-only zone check is untouched',
  mw.includes("path.startsWith('/admin') && role !== 'admin'"))
check('suspended-account handling is untouched', mw.includes('await supabase.auth.signOut()'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

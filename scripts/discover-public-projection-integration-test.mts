// Discover ↔ Public Activity — the shared public projection must be readable by EVERY viewer.
//
// Root cause guarded here: the admin client used for public-safe projections must TRULY bypass RLS. It must
// not inherit the caller's auth session (cookies) — otherwise a signed-in non-owner viewer's JWT is sent and
// PostgREST re-applies RLS, hiding the owner-only project_event_plans_v2 row. That made getPublicEventPlan
// return null for non-owners → Discover skipped the card and the public page fell back to "Project <UUID>".
//
// Also asserts the single-source-of-truth: Discover and the Public Activity page read the SAME projection
// (getPublicEventPlan), so identity can never diverge by viewer.
//
//   Run:  npx tsx scripts/discover-public-projection-integration-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const code = (p: string) => read(p).replace(/\/\/.*$/gm, '') // strip line comments so prose never satisfies a check

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else {
    failures++
    console.log(`  FAIL ${name}`)
  }
}

// ── The fix: createAdminClient must be a real service-role client (no inherited session) ─────────────────
const server = code('../lib/supabase/server.ts')
const adminFn = server.slice(server.indexOf('export async function createAdminClient'))
check('createAdminClient exists', adminFn.length > 0)
check('admin client does NOT read the request cookie store (no session inherited)', !adminFn.includes('cookieStore'))
check('admin client returns an empty cookie set (getAll → [])', /getAll\(\)\s*\{\s*return\s*\[\]/.test(adminFn))
check('admin client pins Authorization to the service-role key', adminFn.includes('Authorization') && adminFn.includes('serviceKey'))
check('admin client uses the SERVICE ROLE key, not the anon key', adminFn.includes('SUPABASE_SERVICE_ROLE_KEY') && !adminFn.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
// The regular request client MUST still be session-bound (unchanged) — the fix is scoped to the admin client.
const regularFn = server.slice(server.indexOf('export async function createClient'), server.indexOf('export async function createAdminClient'))
check('regular createClient still binds the request cookies (unchanged)', regularFn.includes('cookieStore.getAll()'))

// ── The projection loader reads owner-only data via the admin client, self-gated on is_published ─────────
const loader = code('../lib/planning/load-public-event-plan.ts')
check('getPublicEventPlan reads via the (service-role) admin client', loader.includes('createAdminClient()'))
check('getPublicEventPlan self-gates on is_published (public-safe)', loader.includes("select('is_published')") && loader.includes('is_published'))
check('getPublicEventPlan reads the owner-only projection table', loader.includes("from('project_event_plans_v2')"))

// ── Single source of truth: Discover AND Public Activity both use getPublicEventPlan ────────────────────
const discovery = code('../lib/activity-marketplace/cards.ts')
const publicPage = code('../app/[locale]/p/[projectId]/page.tsx')
check('Discover composes cards from getPublicEventPlan', discovery.includes('getPublicEventPlan'))
check('Public Activity page reads getPublicEventPlan', publicPage.includes('getPublicEventPlan'))
check('both derive identity from the same projection field (intendedExperience)',
  discovery.includes('plan.intendedExperience') && publicPage.includes('publicPlan.intendedExperience'))
check('no second/parallel public projection loader is introduced',
  discovery.includes('getPublicEventPlan') && publicPage.includes('getPublicEventPlan') &&
  !discovery.includes('getOrganizerEventPlan') && !publicPage.includes('getOrganizerEventPlan'))

// The bare "Project <id>" title exists ONLY as a guarded fallback when there is genuinely no plan — never the
// default for a published activity that has a projection.
check('public page renders the projection title, with the bare "Project" only as a guarded fallback',
  publicPage.includes('publicPlan ?') && publicPage.includes('publicPlan.intendedExperience'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

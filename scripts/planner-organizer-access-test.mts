// Planner honors active organizer access (see audit: dashboard vs planner entitlement gap).
//
// Product rule: a user with ACTIVE organizer access generates plans WITHOUT buying/consuming
// a One Event License. "Active access" = the SAME source the dashboard uses:
//   certified_organizer (or admin) AND (subscription active/trialing OR organizer_access_until > now()).
// Everyone else still consumes a One Event License. An access-check failure must NOT grant access.
//
// This test covers the DECISION via the canonical hasOrganizerAccess() (the exact function the
// planner action calls) and a SOURCE GUARDRAIL proving generateFromIdeaAction wires it correctly:
// the access check runs BEFORE consume_event_license, is fail-safe (catch → no access), and the
// license is consumed ONLY when access is absent.
//
//   Run:  npx tsx scripts/planner-organizer-access-test.mts   (or: npm run test:planner-access)

import { readFileSync } from 'node:fs'
import { hasOrganizerAccess } from '../lib/auth/organizer-access'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

const FUTURE = '2999-01-01T00:00:00.000Z'
const PAST = '2000-01-01T00:00:00.000Z'

// ── 1. Active organizer access BYPASSES the One Event License ─────────────────────────
console.log('\n1 — active organizer access bypasses consume_event_license')
{
  check('certified_organizer + active subscription → access (no license needed)',
    hasOrganizerAccess({ role: 'certified_organizer', subscriptionStatus: 'active', organizerAccessUntil: null }) === true)
  check('certified_organizer + trialing subscription → access',
    hasOrganizerAccess({ role: 'certified_organizer', subscriptionStatus: 'trialing', organizerAccessUntil: null }) === true)
  check('certified_organizer + live organizer_access_until window → access',
    hasOrganizerAccess({ role: 'certified_organizer', subscriptionStatus: null, organizerAccessUntil: FUTURE }) === true)
  check('admin → access',
    hasOrganizerAccess({ role: 'admin' }) === true)
}

// ── 2. Non-organizer / lapsed → still requires a One Event License ────────────────────
console.log('\n2 — non-organizer (or lapsed) still requires a One Event License')
{
  check('no role (ordinary user) → no access → license required',
    hasOrganizerAccess({ role: null, subscriptionStatus: null, organizerAccessUntil: null }) === false)
  check('certified_organizer but expired window + no subscription → no access',
    hasOrganizerAccess({ role: 'certified_organizer', subscriptionStatus: 'canceled', organizerAccessUntil: PAST }) === false)
  check('certified_organizer, no sub, no window → no access',
    hasOrganizerAccess({ role: 'certified_organizer', subscriptionStatus: null, organizerAccessUntil: null }) === false)
  // A non-organizer with some stray window must still be denied (role gate first).
  check('non-organizer role is denied even with a future window',
    hasOrganizerAccess({ role: 'user', subscriptionStatus: null, organizerAccessUntil: FUTURE }) === false)
}

// ── 3. Source guardrail: the action wires the gate correctly (check before consume, fail-safe) ─
console.log('\n3 — generateFromIdeaAction wires the access gate before the license consume')
{
  const src = readFileSync(new URL('../lib/actions/planner.ts', import.meta.url), 'utf8')
  const fnIdx = src.indexOf('export async function generateFromIdeaAction')
  const body = fnIdx > -1 ? src.slice(fnIdx) : ''
  const accessIdx = body.indexOf('hasOrganizerAccess(')
  const consumeIdx = body.indexOf("rpc('consume_event_license')")

  check('imports the canonical hasOrganizerAccess decision fn', src.includes("from '@/lib/auth/organizer-access'"))
  check('access check is present in the action', accessIdx > -1)
  check('license consume is still present (ordinary users)', consumeIdx > -1)
  check('access check runs BEFORE consume_event_license', accessIdx > -1 && consumeIdx > -1 && accessIdx < consumeIdx)
  check('access check is fail-safe (try/catch → hasAccess = false)',
    /catch\s*{\s*\n?\s*hasAccess = false/.test(body))
  check('consume runs ONLY when access is absent (guarded by if (!hasAccess))',
    body.indexOf('if (!hasAccess)') > -1 && body.indexOf('if (!hasAccess)') < consumeIdx)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

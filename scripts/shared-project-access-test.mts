// Shared Project Access Layer — model + policy + store (single choke point) contract test.
//
//   Run:  npx tsx scripts/shared-project-access-test.mts

import { readFileSync } from 'node:fs'
import { isActiveGrant, isExpired, isAccessType, ACCESS_TYPES } from '../lib/project-access/model'
import { ACCESS_POLICY, viewForAccessType, accessGrantsView } from '../lib/project-access/policy'
import { resolveActiveByToken } from '../lib/project-access/store'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const NOW = '2026-07-05T12:00:00.000Z'

// 1. Model — the single access predicate: not revoked AND not expired.
check('access types include the reserved future ones', ACCESS_TYPES.join(',') === 'client,worker,safety,participant,vendor,inspector,venue,emergency')
check('isAccessType guards', isAccessType('client') && isAccessType('safety') && !isAccessType('nope'))
check('active grant: invited/active + no expiry → true', isActiveGrant({ status: 'invited', expires_at: null }, NOW) && isActiveGrant({ status: 'active', expires_at: null }, NOW))
check('revoked → not a grant', !isActiveGrant({ status: 'revoked', expires_at: null }, NOW))
check('expired → not a grant; future expiry → still a grant',
  isExpired({ expires_at: '2026-07-04T00:00:00.000Z' }, NOW) && !isActiveGrant({ status: 'active', expires_at: '2026-07-04T00:00:00.000Z' }, NOW) &&
  isActiveGrant({ status: 'active', expires_at: '2026-08-01T00:00:00.000Z' }, NOW))

// 2. Policy — access_type → View; view-scope + implemented gating.
check('client→client view, worker→worker view (implemented)', viewForAccessType('client') === 'client' && viewForAccessType('worker') === 'worker' && ACCESS_POLICY.client.implemented && ACCESS_POLICY.worker.implemented)
check('safety/participant/etc reserved but NOT implemented', !ACCESS_POLICY.safety.implemented && !ACCESS_POLICY.participant.implemented && !ACCESS_POLICY.emergency.implemented)
check('view-scope: a worker grant may NOT render the client view (and vice versa)', accessGrantsView('worker', 'worker') && !accessGrantsView('worker', 'client') && accessGrantsView('client', 'client') && !accessGrantsView('client', 'worker'))
check('unimplemented type grants no view yet', !accessGrantsView('safety', 'safety'))

// 3. Store resolver — THE choke point: active → row; revoked/expired/unknown → null.
function client(row: unknown) {
  return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }) }
}
{
  const active = { id: 'a', project_id: 'p', access_type: 'client', invite_token: 't', status: 'active', expires_at: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('resolveActiveByToken: active grant → row', (await resolveActiveByToken(client(active) as any, 't', NOW))?.id === 'a')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('resolveActiveByToken: revoked → null', (await resolveActiveByToken(client({ ...active, status: 'revoked' }) as any, 't', NOW)) === null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('resolveActiveByToken: expired → null', (await resolveActiveByToken(client({ ...active, expires_at: '2026-07-04T00:00:00.000Z' }) as any, 't', NOW)) === null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('resolveActiveByToken: unknown token → null', (await resolveActiveByToken(client(null) as any, 't', NOW)) === null)
}

// 4. Single implementation of token / revocation / invitation — no duplication.
const store = read('../lib/project-access/store.ts')
check('ONE token generator (randomBytes) + resolver uses the single access predicate',
  (store.match(/randomBytes\(24\)/g) || []).length === 1 && store.includes('isActiveGrant(row, nowIso)'))
check('ONE revocation path (status revoked + revoked_at)', store.includes("update({ status: 'revoked', revoked_at: revokedAtIso })") && store.includes('project_access'))

// 5. No production code depends on the old per-type stores / tables (client + worker now use the shared layer).
for (const f of ['../lib/actions/client-access.ts', '../lib/actions/worker-access.ts', '../lib/client-access/view.ts', '../lib/worker-access/view.ts', '../app/[locale]/dashboard/projects/[projectId]/page.tsx']) {
  const src = read(f)
  check(`${f.split('/').slice(-2).join('/')} uses the shared layer, not the old stores/tables`,
    !/client-access\/store|worker-access\/store|project_clients|project_workers/.test(src))
}
check('old per-type store files are gone', (() => { try { read('../lib/client-access/store.ts'); return false } catch { return true } })() && (() => { try { read('../lib/worker-access/store.ts'); return false } catch { return true } })())

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

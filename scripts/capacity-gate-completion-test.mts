// Organizer Capacity Gate — integration + full Planning → Project → Gate → (Delivery/Team/Execution) flow.
//
//   Run:  npx tsx scripts/capacity-gate-completion-test.mts

import { readFileSync } from 'node:fs'
import { evaluateCapacityGate } from '../lib/capacity/model'
import { getOrganizerCapacityLevel, projectParticipantCount } from '../lib/capacity/gate'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Reads: organizer level from profiles (default on missing); participant count from the planning domain.
{
  const okClient = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { organizer_capacity_level: 3 }, error: null }) }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('getOrganizerCapacityLevel reads the profile level', (await getOrganizerCapacityLevel(okClient as any, 'u')) === 3)
  const missClient = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('missing profile → default Level 1', (await getOrganizerCapacityLevel(missClient as any, 'u')) === 1)
  const errClient = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('column does not exist') } }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('read error (pre-migration) → default Level 1', (await getOrganizerCapacityLevel(errClient as any, 'u')) === 1)

  // participant count reuses the canonical planning domain (details.guestCount), no re-derivation.
  const planClient = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { domain: { details: { guestCount: 250 } } }, error: null }) }) }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('projectParticipantCount reads planning-domain guestCount', (await projectParticipantCount(planClient as any, 'p')) === 250)
}

// 2. Within limit → organizer can lead; exceeding → blocked; project size itself is never invalid.
check('organizer within limit can lead (L2, 80)', evaluateCapacityGate(2, 80).allowed)
check('organizer exceeding limit is blocked (L2, 300)', evaluateCapacityGate(2, 300).allowed === false)

// 3. Approval action integrates the gate BEFORE any state write (project stays valid when blocked).
const action = read('../lib/actions/projects.ts')
check('approve action evaluates the capacity gate and refuses with capacity_exceeded',
  action.includes('loadCapacityGate(supabase, projectId, user.id)') && action.includes("if (!gate.allowed) return { ok: false, error: 'capacity_exceeded' }"))
check('gate runs BEFORE the snapshot + approval state (no state written when blocked)',
  action.indexOf("error: 'capacity_exceeded'") < action.indexOf('insertApprovedProjectSnapshot(supabase, {') &&
  action.indexOf("error: 'capacity_exceeded'") < action.indexOf('updateProject(supabase, projectId, { approved_at'))
check("ApproveResult carries the capacity_exceeded error", action.includes("| 'capacity_exceeded'"))

// 4. Blocked organizer never enters Delivery / Team / Execution — those are gated on approved_at, which the
//    gate prevents from being set. (Loaders return null unless approved.)
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
for (const load of ['loadOrganizerExecutionWorkspace', 'loadDeliveryWorkspace', 'loadTeamWorkspace']) {
  check(`${load} only runs for approved projects (approvedAt gate)`, new RegExp(`approvedAt \\? await ${load}`).test(page))
}

// 5. UI presents the gate + BOTH resolution paths, replacing the Approve action when blocked.
const panel = read('../components/projects/CapacityGatePanel.tsx')
check('page loads the gate for drafts and renders the panel when blocked (in place of Approve)',
  page.includes('loadCapacityGate(supabase, projectId, user.id)') &&
  page.includes('!approvedAt && capacityBlocked && capacityGate && <CapacityGatePanel gate={capacityGate} />') &&
  page.includes('!approvedAt && !capacityBlocked && ('))
check('panel presents the two resolution paths (upgrade qualification + assign a qualified Lead Organizer)',
  /Upgrade your qualification/i.test(panel) && /assign a qualified Lead Organizer/i.test(panel))
check('panel states the project itself stays valid (restriction is on the organizer, not the event)',
  /remains fully valid/i.test(panel) && /not the event/i.test(panel))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

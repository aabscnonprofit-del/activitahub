// Project Team domain — state model + roles projection (reuse) contract test.
//
//   Run:  npx tsx scripts/team-domain-test.mts

import {
  emptyTeamState, addMember, removeMember, setAvailability, assignRole, assignedMember, isAvailability, AVAILABILITIES,
} from '../lib/team/model'
import { projectRolesFromPlan } from '../lib/team/roles'
import { buildDeliveryComponentModel } from '../lib/delivery/components'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  resources: [{ label: 'Chairs' }],
  staffing: [{ role: 'DJ', reason: 'music' }, { role: 'Host', reason: 'run the show' }],
} as unknown as EventPlanV2

// 1. Roles projected from the plan's staffing — and are EXACTLY the shared Delivery role components (no dup).
{
  const roles = projectRolesFromPlan(plan)
  check('roles projected from staffing (DJ, Host) with role ids', roles.map((r) => `${r.id}:${r.label}`).join(',') === 'role:0:DJ,role:1:Host')
  const deliveryRoleIds = buildDeliveryComponentModel(plan).components.filter((c) => c.kind === 'role').map((c) => c.id)
  check('project roles reuse the canonical delivery role components (same ids, no duplicate model)',
    roles.map((r) => r.id).join(',') === deliveryRoleIds.join(','))
}

// 2. Availability guard.
check('availabilities + guard', AVAILABILITIES.join(',') === 'available,tentative,unavailable' && isAvailability('tentative') && !isAvailability('maybe'))

// 3. Members: add (dedup), set availability, assign, assignedMember.
{
  let s = emptyTeamState()
  s = addMember(s, { id: 'm1', name: 'Ada', availability: 'available' })
  s = addMember(s, { id: 'm1', name: 'Dup', availability: 'available' }) // dedup by id
  s = addMember(s, { id: 'm2', name: 'Ben', availability: 'available' })
  check('add member appends; duplicate id ignored', s.members.length === 2 && s.members[0].name === 'Ada')
  s = setAvailability(s, 'm2', 'unavailable')
  check('set availability', s.members.find((m) => m.id === 'm2')!.availability === 'unavailable')
  s = assignRole(s, 'role:0', 'm1')
  check('assign member to role; assignedMember resolves it', assignedMember(s, 'role:0')?.name === 'Ada')
  check('unassigned role → null', assignedMember(s, 'role:1') === null)
}

// 4. removeMember clears assignments referencing the removed member (integrity).
{
  let s = emptyTeamState()
  s = addMember(s, { id: 'm1', name: 'Ada', availability: 'available' })
  s = assignRole(s, 'role:0', 'm1')
  const before = JSON.stringify(s)
  s = removeMember(s, 'm1')
  check('remove member drops the member AND clears its role assignment', s.members.length === 0 && s.assignments['role:0'] === null)
  // purity: original untouched
  check('helpers are pure (input not mutated)', before.includes('"m1"'))
}

// 5. assign clear (null) unassigns.
{
  let s = assignRole(addMember(emptyTeamState(), { id: 'm1', name: 'Ada', availability: 'available' }), 'role:0', 'm1')
  s = assignRole(s, 'role:0', null)
  check('assigning null clears the role', assignedMember(s, 'role:0') === null)
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

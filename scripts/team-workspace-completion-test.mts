// Team Workspace completion — workspace model, persistence, full Planning → Occurrence → Execution → Delivery
// → Team flow, and action/loader/UI/page wiring. Contract test.
//
//   Run:  npx tsx scripts/team-workspace-completion-test.mts

import { readFileSync } from 'node:fs'
import { emptyTeamState, addMember, setAvailability, assignRole } from '../lib/team/model'
import { projectRolesFromPlan } from '../lib/team/roles'
import { getProjectTeam } from '../lib/team/persistence'
import { buildTeamWorkspace } from '../lib/organizer-workspace/team-workspace'
import { buildDeliveryComponentModel } from '../lib/delivery/components'
import { buildDeliveryWorkspace } from '../lib/organizer-workspace/delivery-workspace'
import { emptyDeliveryState } from '../lib/delivery/status'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import { bindOccurrence } from '../lib/occurrence/binding'
import { buildOccurrenceTimeline } from '../lib/occurrence/timeline'
import { buildExecutionWorkspace } from '../lib/organizer-workspace/execution-workspace'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const plan = {
  experienceDesign: {}, structure: {},
  itinerary: [{ id: 'itinerary:ceremony', name: 'Ceremony', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30 } }],
  logistics: [],
  resources: [{ label: 'Chairs' }],
  staffing: [{ role: 'DJ', reason: 'music' }, { role: 'Host', reason: 'run the show' }],
} as unknown as EventPlanV2
const roles = projectRolesFromPlan(plan)

// 1. Workspace model — roles unassigned by default; empty members; progress 0.
{
  const ws = buildTeamWorkspace(roles, emptyTeamState())
  check('workspace lists all roles (DJ, Host) unassigned; no members', ws.roles.length === 2 && ws.roles.every((r) => r.status === 'unassigned') && ws.members.length === 0)
  check('progress 0/total, not fully staffed', ws.progress.assigned === 0 && ws.progress.totalRoles === 2 && ws.progress.allAssigned === false)
}
// 2. Assignment status: assigned (available) / at_risk (unavailable) / unassigned.
{
  let s = addMember(emptyTeamState(), { id: 'm1', name: 'Ada', availability: 'available' })
  s = addMember(s, { id: 'm2', name: 'Ben', availability: 'unavailable' })
  s = assignRole(s, 'role:0', 'm1') // DJ ← Ada (available) → assigned
  s = assignRole(s, 'role:1', 'm2') // Host ← Ben (unavailable) → at_risk
  const ws = buildTeamWorkspace(roles, s)
  check('assigned available member → status assigned + name shown', ws.roles.find((r) => r.id === 'role:0')!.status === 'assigned' && ws.roles.find((r) => r.id === 'role:0')!.assignedMemberName === 'Ada')
  check('assigned unavailable member → status at_risk', ws.roles.find((r) => r.id === 'role:1')!.status === 'at_risk')
  check('readiness tallies (assigned 1, at_risk 1, unassigned 0)', ws.readiness.assigned === 1 && ws.readiness.at_risk === 1 && ws.readiness.unassigned === 0)
  check('progress counts both assigned + at_risk as assigned (2/2 fully staffed)', ws.progress.assigned === 2 && ws.progress.allAssigned === true)
}
// 3. Availability change flips readiness (at_risk ↔ assigned) — restore-after-reload uses the same shape.
{
  let s = assignRole(addMember(emptyTeamState(), { id: 'm1', name: 'Ada', availability: 'unavailable' }), 'role:0', 'm1')
  check('unavailable assignee → at_risk', buildTeamWorkspace(roles, s).roles.find((r) => r.id === 'role:0')!.status === 'at_risk')
  s = setAvailability(s, 'm1', 'available')
  check('becomes available → assigned', buildTeamWorkspace(roles, s).roles.find((r) => r.id === 'role:0')!.status === 'assigned')
}

// 4. Persistence read — reads members/assignments; null on error (pre-migration safety).
{
  const okClient = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { team: { members: [{ id: 'm1', name: 'Ada', availability: 'available' }], assignments: { 'role:0': 'm1' } } }, error: null }) }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const got = await getProjectTeam(okClient as any, 'p')
  check('getProjectTeam reads persisted members + assignments', got?.members[0].name === 'Ada' && got?.assignments['role:0'] === 'm1')
  const errClient = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('relation does not exist') } }) }) }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('getProjectTeam degrades to null on error (table not migrated yet)', (await getProjectTeam(errClient as any, 'p')) === null)
}

// 5. Full flow: ONE plan drives Planning → Occurrence → Execution → Delivery → Team coherently.
{
  const snapshot = buildExecutionSnapshot(plan)
  const execWs = buildExecutionWorkspace(snapshot, buildOccurrenceTimeline(bindOccurrence(snapshot, 'occ-1', '2026-07-05T09:00:00.000Z')))
  const delivWs = buildDeliveryWorkspace(buildDeliveryComponentModel(plan), emptyDeliveryState())
  const teamWs = buildTeamWorkspace(roles, emptyTeamState())
  check('same plan → Execution (ceremony) + Delivery role components + Team roles are consistent',
    execWs.checklist.some((i) => i.id === 'itinerary:ceremony') &&
    delivWs.components.filter((c) => c.kind === 'role').map((c) => c.id).join(',') === teamWs.roles.map((r) => r.id).join(','))
  check('Team reuses the SAME role ids as Delivery (no parallel role model)',
    teamWs.roles.map((r) => r.label).join(',') === 'DJ,Host')
}

// 6. Action / loader / UI / page wiring.
const action = read('../lib/actions/team.ts')
const loader = read('../lib/organizer-workspace/load-team-workspace.ts')
const comp = read('../components/workspace/TeamWorkspacePanel.tsx')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
check('actions gate auth + approval, validate, persist, revalidate',
  action.includes("error: 'not_authenticated'") && action.includes("error: 'not_approved'") &&
  action.includes('persistProjectTeam(') && action.includes('revalidatePath(`/${locale}/dashboard/projects/${projectId}`)'))
check('actions: add / remove / availability / assign present + role validated',
  action.includes('addTeamMemberAction') && action.includes('removeTeamMemberAction') && action.includes('setMemberAvailabilityAction') &&
  action.includes('assignRoleAction') && action.includes('ctx.roleIds.includes(roleId)'))
check('loader projects roles from the plan + reads persisted team (empty fallback)',
  loader.includes('projectRolesFromPlan(plan)') && loader.includes('getProjectTeam(supabase, projectId)') && loader.includes('emptyTeamState()'))
check('UI island calls the team actions and refreshes on success',
  comp.includes("'use client'") && comp.includes('addTeamMemberAction(projectId') && comp.includes('assignRoleAction(projectId, r.id') && comp.includes('router.refresh()'))
check('page loads + renders the Team Workspace with staffing progress (page stays read-only itself)',
  page.includes('loadTeamWorkspace(supabase, projectId)') && page.includes('<TeamWorkspacePanel') &&
  page.includes('teamWorkspace.progress.assigned') && page.includes('Fully staffed') && !page.includes('<button'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

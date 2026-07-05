// Lead Organizer Assignment — effective-lead gate + assignment validation + integration contract test.
//
//   Run:  npx tsx scripts/lead-organizer-assignment-test.mts

import { readFileSync } from 'node:fs'
import { loadCapacityGate } from '../lib/capacity/gate'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Mock: profiles.select→capacity level by id; projects.select('lead_organizer_id')→leadId; planning domain→count.
function client(cfg: { levels: Record<string, number>; leadId: string | null; count: number | null }) {
  return {
    from(table: string) {
      if (table === 'profiles') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: { organizer_capacity_level: cfg.levels[id] ?? 1 }, error: null }) }) }) }
      }
      if (table === 'projects') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { lead_organizer_id: cfg.leadId }, error: null }) }) }) }
      }
      // project_planning_domain
      return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cfg.count == null ? null : { domain: { details: { guestCount: cfg.count } } }, error: null }) }) }) }) }
    },
  }
}

// 1. Effective lead = OWNER when no lead assigned → owner's level gates.
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = await loadCapacityGate(client({ levels: { owner: 1 }, leadId: null, count: 50 }) as any, 'p', 'owner')
  check('owner over capacity, no lead → blocked; effective lead is the owner', !g.allowed && g.effectiveLeadId === 'owner' && g.leadOrganizerId === null)
}
// 2. Owner within capacity → allowed (can lead).
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = await loadCapacityGate(client({ levels: { owner: 1 }, leadId: null, count: 15 }) as any, 'p', 'owner')
  check('owner within capacity, no lead → allowed', g.allowed && g.effectiveLeadId === 'owner')
}
// 3. Effective lead = ASSIGNED lead when set → the assigned lead's level gates (qualified → allowed).
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = await loadCapacityGate(client({ levels: { owner: 1, lead: 3 }, leadId: 'lead', count: 50 }) as any, 'p', 'owner')
  check('over-capacity owner + qualified assigned lead (L3) → allowed; effective lead is the lead', g.allowed && g.effectiveLeadId === 'lead' && g.leadOrganizerId === 'lead')
}
// 4. Assigned lead still insufficient → still blocked (effective lead is the lead).
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = await loadCapacityGate(client({ levels: { owner: 4, lead: 1 }, leadId: 'lead', count: 50 }) as any, 'p', 'owner')
  check('assigned lead under capacity → blocked (gate uses the assigned lead, not the owner)', !g.allowed && g.effectiveLeadId === 'lead')
}

// 5. Assign action — validates candidate capacity; rejects unqualified; clears on empty; owner-gated; persists.
const action = read('../lib/actions/lead-organizer.ts')
check('assign validates candidate capacity and rejects unqualified',
  action.includes('evaluateCapacityGate(level, count).allowed') && action.includes("return { ok: false, reason: 'lead_unqualified' }"))
check('assign is owner-gated + persists via setProjectLeadOrganizer + revalidates',
  action.includes("reason: 'not_authenticated'") && action.includes('getProject(supabase, projectId)') &&
  action.includes('setProjectLeadOrganizer(supabase, projectId, candidate)') && action.includes('revalidatePath('))
check('empty id clears the assignment (owner leads again)', action.includes('setProjectLeadOrganizer(supabase, projectId, null)'))

// 6. Approval uses the EFFECTIVE-lead gate; project stays valid when blocked (no state write); Delivery/Team/
//    Execution stay approval-gated.
const projects = read('../lib/actions/projects.ts')
check('approve refuses via the effective-lead gate before any state write (project stays valid)',
  projects.includes('loadCapacityGate(supabase, projectId, user.id)') &&
  projects.indexOf("error: 'capacity_exceeded'") < projects.indexOf('insertApprovedProjectSnapshot(supabase, {'))
const gate = read('../lib/capacity/gate.ts')
check('gate evaluates the effective lead = assigned lead ?? owner',
  gate.includes('const leadOrganizerId = await getProjectLeadOrganizerId(supabase, projectId)') && gate.includes('const effectiveLeadId = leadOrganizerId ?? ownerId'))
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
for (const load of ['loadOrganizerExecutionWorkspace', 'loadDeliveryWorkspace', 'loadTeamWorkspace']) {
  check(`${load} still only runs after approval (approvedAt gate)`, new RegExp(`approvedAt \\? await ${load}`).test(page))
}

// 7. UI — the gate panel hosts the assign path; the current Lead Organizer + eligibility is displayed.
const panel = read('../components/projects/CapacityGatePanel.tsx')
const assign = read('../components/projects/LeadOrganizerAssign.tsx')
check('gate panel renders the assign path (LeadOrganizerAssign) + current lead',
  panel.includes('<LeadOrganizerAssign projectId={projectId} locale={locale} currentLeadId={gate.leadOrganizerId} />') && /Current Lead Organizer/i.test(panel))
check('assign island calls the action and refreshes; unqualified message shown',
  assign.includes("'use client'") && assign.includes('assignLeadOrganizerAction(projectId, id, locale)') && assign.includes('router.refresh()') && /enough capacity/i.test(assign))
check('approve area shows the current Lead Organizer + eligibility when allowed',
  page.includes('capacityGate.leadOrganizerId') && /eligible to lead/i.test(page))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)

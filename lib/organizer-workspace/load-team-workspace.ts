// Team Workspace loader — composes the Team Workspace read model from live Planning + persisted Team state,
// for an approved project.
//
// Chain (for an APPROVED project):
//   Project → EventPlanV2 (frozen operational contract, v1)
//           → project roles (the plan's staffing, via the shared Delivery role components)
//           → persisted Team state (project_team; missing → empty team)
//           → Team Workspace (buildTeamWorkspace)
//
// Team is project-level (people are shared across occurrences), so no occurrence is resolved here. It only
// READS/composes existing services and changes no Planning / Occurrence / Execution / Delivery / Workspace
// model, and no page/UI on its own.

import type { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { projectRolesFromPlan } from '@/lib/team/roles'
import { getProjectTeam } from '@/lib/team/persistence'
import { emptyTeamState } from '@/lib/team/model'
import { buildTeamWorkspace, type TeamWorkspaceModel } from './team-workspace'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Load the Team Workspace for an approved project from live data. Returns null when the project is not approved
 * or has no EventPlanV2 (no roles to staff). The roles are projected from the plan; the team + assignments are
 * read from persistence (missing → empty team), so existing approved projects without a team keep working.
 */
export async function loadTeamWorkspace(
  supabase: ServerClient,
  projectId: string,
): Promise<TeamWorkspaceModel | null> {
  const project = await getProject(supabase, projectId)
  if (!project || !project.approved_at) return null

  const plan = await getEventPlanV2(supabase, projectId, 1)
  if (!plan) return null

  const roles = projectRolesFromPlan(plan)
  const team = (await getProjectTeam(supabase, projectId)) ?? emptyTeamState()

  return buildTeamWorkspace(roles, team)
}

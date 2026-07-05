// Team Workspace read model — composes the project's roles (from the plan's staffing) with the persisted team
// state (members + assignments) into one deterministic read model: the member list, each role with its current
// assignment + readiness status, and assignment progress. Pure and deterministic; reads no clock; mutates
// nothing. It READS the Team + roles models (types) and changes none of them.

import type { ProjectRole } from '@/lib/team/roles'
import { assignedMember, type ProjectTeamState, type TeamMember } from '@/lib/team/model'

/** A role's current assignment/readiness for the organizer. */
export type RoleAssignmentStatus = 'unassigned' | 'assigned' | 'at_risk'

/** One project role overlaid with its assignment + readiness. */
export interface TeamWorkspaceRole {
  id: string
  label: string
  assignedMemberId: string | null
  assignedMemberName: string | null
  /** unassigned = nobody; assigned = an available/tentative member; at_risk = assigned member is unavailable. */
  status: RoleAssignmentStatus
}

/** Assignment progress for the project. */
export interface TeamProgress {
  totalRoles: number
  assigned: number
  /** True only when there is at least one role and every role has an assigned member. */
  allAssigned: boolean
}

/** The Team Workspace read model. */
export interface TeamWorkspaceModel {
  members: TeamMember[]
  roles: TeamWorkspaceRole[]
  progress: TeamProgress
  readiness: Record<RoleAssignmentStatus, number>
}

/**
 * Build the Team Workspace read model from the project's roles and the persisted team state. Deterministic and
 * pure: members carried through in order; each role annotated with its assigned member (if any) and a readiness
 * status (unassigned / assigned / at_risk when the assigned member is unavailable); progress + readiness tally
 * over the roles. Inputs are not mutated.
 */
export function buildTeamWorkspace(roles: ProjectRole[], team: ProjectTeamState): TeamWorkspaceModel {
  const readiness: Record<RoleAssignmentStatus, number> = { unassigned: 0, assigned: 0, at_risk: 0 }

  const workspaceRoles: TeamWorkspaceRole[] = roles.map((role) => {
    const member = assignedMember(team, role.id)
    const status: RoleAssignmentStatus = !member ? 'unassigned' : member.availability === 'unavailable' ? 'at_risk' : 'assigned'
    readiness[status] += 1
    return { id: role.id, label: role.label, assignedMemberId: member?.id ?? null, assignedMemberName: member?.name ?? null, status }
  })

  const totalRoles = workspaceRoles.length
  const assigned = readiness.assigned + readiness.at_risk
  const progress: TeamProgress = { totalRoles, assigned, allAssigned: totalRoles > 0 && assigned === totalRoles }

  return { members: [...team.members], roles: workspaceRoles, progress, readiness }
}

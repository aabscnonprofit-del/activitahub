'use server'

// Project Team server actions — manage the people on a project and their assignment to project roles. Every
// action authenticates, owner + approval gates, loads the persisted team, applies the change, persists, and
// revalidates the project page so the Team Workspace reloads. Member ids are generated here (crypto). No new
// route/model; the roles come from the shared plan projection (projectRolesFromPlan).

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { projectRolesFromPlan } from '@/lib/team/roles'
import { getProjectTeam, persistProjectTeam } from '@/lib/team/persistence'
import {
  addMember, removeMember, setAvailability, assignRole, emptyTeamState, isAvailability,
  type Availability, type ProjectTeamState,
} from '@/lib/team/model'

export type TeamActionResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not_authenticated' | 'not_authorized' | 'not_approved' | 'no_plan'
        | 'invalid_name' | 'invalid_availability' | 'unknown_member' | 'unknown_role' | 'persist_failed'
    }

type Prelude =
  | { ok: false; error: Exclude<Extract<TeamActionResult, { ok: false }>['reason'], 'invalid_name' | 'invalid_availability' | 'unknown_member' | 'unknown_role' | 'persist_failed'> }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; roleIds: string[]; team: ProjectTeamState }

/** Shared prelude: auth + approval gate + plan + role ids + current team state. */
async function teamContext(projectId: string): Promise<Prelude> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }
  if (!project.approved_at) return { ok: false, error: 'not_approved' }

  const plan = await getEventPlanV2(supabase, projectId, 1)
  if (!plan) return { ok: false, error: 'no_plan' }

  const roleIds = projectRolesFromPlan(plan).map((r) => r.id)
  const team = (await getProjectTeam(supabase, projectId)) ?? emptyTeamState()
  return { ok: true, supabase, roleIds, team }
}

async function save(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  next: ProjectTeamState,
  locale: string,
): Promise<TeamActionResult> {
  try {
    await persistProjectTeam(supabase, projectId, next)
  } catch {
    return { ok: false, reason: 'persist_failed' }
  }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Add a person to the project team. */
export async function addTeamMemberAction(projectId: string, name: string, locale: string): Promise<TeamActionResult> {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) return { ok: false, reason: 'invalid_name' }
  const ctx = await teamContext(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.error }
  const next = addMember(ctx.team, { id: randomUUID(), name: trimmed, availability: 'available' })
  return save(ctx.supabase, projectId, next, locale)
}

/** Remove a person from the project team (also clears any role they were assigned to). */
export async function removeTeamMemberAction(projectId: string, memberId: string, locale: string): Promise<TeamActionResult> {
  const ctx = await teamContext(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.error }
  if (!ctx.team.members.some((m) => m.id === memberId)) return { ok: false, reason: 'unknown_member' }
  return save(ctx.supabase, projectId, removeMember(ctx.team, memberId), locale)
}

/** Set a team member's availability. */
export async function setMemberAvailabilityAction(projectId: string, memberId: string, availability: string, locale: string): Promise<TeamActionResult> {
  if (!isAvailability(availability)) return { ok: false, reason: 'invalid_availability' }
  const ctx = await teamContext(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.error }
  if (!ctx.team.members.some((m) => m.id === memberId)) return { ok: false, reason: 'unknown_member' }
  return save(ctx.supabase, projectId, setAvailability(ctx.team, memberId, availability as Availability), locale)
}

/** Assign a member to a project role, or clear the assignment when memberId is empty. */
export async function assignRoleAction(projectId: string, roleId: string, memberId: string, locale: string): Promise<TeamActionResult> {
  const ctx = await teamContext(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.error }
  if (!ctx.roleIds.includes(roleId)) return { ok: false, reason: 'unknown_role' }
  const target = memberId ? memberId : null
  if (target && !ctx.team.members.some((m) => m.id === target)) return { ok: false, reason: 'unknown_member' }
  return save(ctx.supabase, projectId, assignRole(ctx.team, roleId, target), locale)
}

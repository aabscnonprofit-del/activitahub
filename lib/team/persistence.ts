// Team persistence — persist the ProjectTeamState for a project and load it back.
//
// Storage layer over `project_team` (migration 053): the state ({ members, assignments }) is stored verbatim
// as JSONB and upserted on the unique project_id key. Reads return null when there is no row — callers fall
// back to an empty team. Reads also degrade to null if the table is not present yet (migration not applied),
// so the Team Workspace renders (empty) rather than erroring before 053 is live.
//
// It reuses the pure Team model unchanged and imports nothing from Planning / Occurrence / Execution / Delivery.

import type { createClient } from '@/lib/supabase/server'
import type { ProjectTeamState } from './model'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Persist the ProjectTeamState for a project, upserting on project_id so a re-save replaces it. Surfaces the
 *  Supabase error (never swallows it). */
export async function persistProjectTeam(
  supabase: ServerClient,
  projectId: string,
  team: ProjectTeamState,
): Promise<void> {
  const { error } = await supabase
    .from('project_team')
    .upsert({ project_id: projectId, team }, { onConflict: 'project_id' })
  if (error) throw new Error(`persistProjectTeam failed: ${error.message}`)
}

/** Load the persisted ProjectTeamState for a project, or null when there is no row. Degrades to null on a read
 *  error too (e.g. the table is not present before migration 053 is applied). */
export async function getProjectTeam(supabase: ServerClient, projectId: string): Promise<ProjectTeamState | null> {
  try {
    const { data, error } = await supabase
      .from('project_team')
      .select('team')
      .eq('project_id', projectId)
      .maybeSingle()
    if (error || !data) return null
    const team = data.team as Partial<ProjectTeamState> | null
    return { members: team?.members ?? [], assignments: team?.assignments ?? {} }
  } catch {
    return null
  }
}

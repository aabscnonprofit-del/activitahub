// Planning Domain — persistence (Stage 5e of the Planning Layer Migration).
//
// Persists/reads the durable Planning Domain (migration 048), the recompute source of truth in the
// Project World. Owner-scoped via RLS. Surfaces Supabase errors (never swallows). Never stores PlannerInput.

import type { createClient } from '@/lib/supabase/server'
import type { PlanningDomain } from './planning-domain'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Persist (upsert) the Planning Domain for a (project, version). */
export async function persistPlanningDomain(
  supabase: ServerClient,
  projectId: string,
  projectVersion: number,
  domain: PlanningDomain,
): Promise<void> {
  const { error } = await supabase
    .from('project_planning_domain')
    .upsert({ project_id: projectId, project_version: projectVersion, domain }, { onConflict: 'project_id,project_version' })
  if (error) throw new Error(`persistPlanningDomain failed: ${error.message}`)
}

/** Read the durable Planning Domain for a (project, version). Returns null if none exists. */
export async function getPlanningDomain(
  supabase: ServerClient,
  projectId: string,
  projectVersion: number,
): Promise<PlanningDomain | null> {
  const { data, error } = await supabase
    .from('project_planning_domain')
    .select('domain')
    .eq('project_id', projectId)
    .eq('project_version', projectVersion)
    .maybeSingle()
  if (error) throw new Error(`getPlanningDomain failed: ${error.message}`)
  return (data?.domain as PlanningDomain) ?? null
}

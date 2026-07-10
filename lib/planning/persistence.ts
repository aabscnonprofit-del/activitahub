// Planning Engine V2 — native persistence (Stage 4 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md and Roadmap v2 Stage 4. Persists the NATIVE EventPlanV2 into
// its own table (migration 047), in parallel with — and independent of — the legacy planning data.
//
// Decision A: this NEVER derives, reconstructs, or stores PlannerInput. It stores the EventPlanV2
// object exactly as produced (not reduced, not converted). It introduces NO synchronization with the
// legacy representation. No production consumer reads this during Stage 4.

import type { createClient } from '@/lib/supabase/server'
import type { EventPlanV2 } from './event-plan-v2'
import { activityTitleFromPlan } from './activity-identity'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** The row written to `project_event_plans_v2` — the native EventPlanV2, keyed by (project, version). */
export interface EventPlanV2Row {
  project_id: string
  project_version: number
  plan: EventPlanV2
}

/**
 * Pure mapping: the native EventPlanV2 -> the persistence row. The `plan` is stored verbatim (no
 * reduction, no conversion). Exposed for deterministic testing.
 */
export function toEventPlanV2Row(projectId: string, projectVersion: number, plan: EventPlanV2): EventPlanV2Row {
  return { project_id: projectId, project_version: projectVersion, plan }
}

/**
 * Persist the native EventPlanV2 for a (project, version), upserting on the unique key so re-planning
 * the same version replaces it. Surfaces the Supabase error (never swallows it). Independent of the
 * legacy planning persistence.
 */
export async function persistEventPlanV2(
  supabase: ServerClient,
  projectId: string,
  projectVersion: number,
  plan: EventPlanV2,
): Promise<void> {
  const { error } = await supabase
    .from('project_event_plans_v2')
    .upsert(toEventPlanV2Row(projectId, projectVersion, plan), { onConflict: 'project_id,project_version' })
  if (error) throw new Error(`persistEventPlanV2 failed: ${error.message}`)
}

/**
 * Batch-read the canonical activity display names for a set of projects (version 1) — one query, for list
 * views. Returns a map of project_id → title, omitting projects with no prepared event. Uses the single
 * identity source (activityTitleFromPlan), so lists and the public page never disagree on a name.
 */
export async function getActivityTitles(
  supabase: ServerClient,
  projectIds: string[],
): Promise<Record<string, string>> {
  if (projectIds.length === 0) return {}
  const { data } = await supabase
    .from('project_event_plans_v2')
    .select('project_id, plan')
    .in('project_id', projectIds)
    .eq('project_version', 1)
  const titles: Record<string, string> = {}
  for (const row of (data as { project_id: string; plan: EventPlanV2 }[] | null) ?? []) {
    const title = activityTitleFromPlan(row.plan)
    if (title) titles[row.project_id] = title
  }
  return titles
}

/**
 * Read the native EventPlanV2 persisted for a (project, version). Returns null when none exists yet.
 * Surfaces a Supabase error (never swallows it). This is a read of the already-produced planning
 * result — it does NOT plan.
 */
export async function getEventPlanV2(
  supabase: ServerClient,
  projectId: string,
  projectVersion: number,
): Promise<EventPlanV2 | null> {
  const { data, error } = await supabase
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', projectId)
    .eq('project_version', projectVersion)
    .maybeSingle()
  if (error) throw new Error(`getEventPlanV2 failed: ${error.message}`)
  return (data?.plan as EventPlanV2) ?? null
}

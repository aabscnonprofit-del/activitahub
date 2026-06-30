// Public Space — public-safe EventPlanV2 read (Stage 5d of the Planning Layer Migration).
//
// Reads the prepared event for a PUBLISHED Project and returns its public-safe projection. READ-ONLY: it
// never plans, never reconstructs PlannerInput, never invokes any planning engine, and never derives
// information.
//
// EventPlanV2 (project_event_plans_v2, migration 047) is owner-only RLS, but Public Space serves
// unauthenticated visitors. This reads server-side via the service-role client AND self-gates on
// `projects.is_published`, returning ONLY the public-safe subset (the full plan never leaves the server,
// and unpublished projects expose nothing). No public RLS / no schema change is introduced.

import { createAdminClient } from '@/lib/supabase/server'
import type { EventPlanV2 } from './event-plan-v2'
import { buildPublicEventProjection, type PublicEventProjection } from './public-event-projection'

/**
 * Load the public-safe projection of a PUBLISHED Project's prepared event. Returns null when the Project is
 * not published or has no EventPlanV2.
 */
export async function getPublicEventPlan(
  projectId: string,
  projectVersion = 1,
): Promise<PublicEventProjection | null> {
  const admin = await createAdminClient()

  // Public-safe gate: only PUBLISHED projects expose their prepared event.
  const { data: project } = await admin
    .from('projects')
    .select('is_published')
    .eq('id', projectId)
    .maybeSingle()
  if (!project || (project as { is_published?: boolean }).is_published !== true) return null

  const { data } = await admin
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', projectId)
    .eq('project_version', projectVersion)
    .maybeSingle()
  if (!data?.plan) return null

  return buildPublicEventProjection(data.plan as EventPlanV2)
}

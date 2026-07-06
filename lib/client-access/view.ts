// Client View (ADR_011 / ADR_012) — a filtered projection of the same Project for an attached Client. It reuses
// the public-safe buildPublicEventProjection (never organizer-only/financial data) + the schedule. Access is
// resolved through the SHARED Project Access layer (one token choke point + the Access Policy for view-scope);
// this module only builds the client projection. No new Project model.

import { createAdminClient } from '@/lib/supabase/server'
import { buildPublicEventProjection, type PublicEventProjection } from '@/lib/planning/public-event-projection'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { resolveActiveByToken } from '@/lib/project-access/store'
import { accessGrantsView } from '@/lib/project-access/policy'

/** One scheduled occurrence, client-safe (date + location only). */
export interface ClientViewOccurrence {
  startsAt: string
  endsAt: string | null
  location: string | null
}

/** The Client View read model — only client-permitted information. */
export interface ClientViewData {
  projectId: string
  event: PublicEventProjection | null
  occurrences: ClientViewOccurrence[]
}

/**
 * Compose the Client View from the project's plan + occurrences. Pure: the prepared event is the public-safe
 * projection; the schedule is date + location only. Exposes NO organizer-only data. (Access has already been
 * validated by the shared resolver — this only projects.)
 */
export function buildClientView(projectId: string, plan: EventPlanV2 | null, occurrences: ClientViewOccurrence[]): ClientViewData {
  return { projectId, event: plan ? buildPublicEventProjection(plan) : null, occurrences }
}

/**
 * Load the Client View for an invite token via the shared Project Access layer: resolve an ACTIVE grant (not
 * revoked, not expired) whose type may render the Client View, then load the plan + occurrences and project.
 * Returns null when the token grants no client access.
 */
export async function loadClientView(token: string): Promise<ClientViewData | null> {
  const admin = await createAdminClient()
  const access = await resolveActiveByToken(admin, token, new Date().toISOString())
  if (!access || !accessGrantsView(access.access_type, 'client')) return null

  const { data: planRow } = await admin
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', access.project_id)
    .eq('project_version', 1)
    .maybeSingle()
  const plan = (planRow?.plan as EventPlanV2 | undefined) ?? null

  const { data: occ } = await admin
    .from('occurrences')
    .select('starts_at, ends_at, location')
    .eq('project_id', access.project_id)
    .order('starts_at', { ascending: true })
  const occurrences: ClientViewOccurrence[] = ((occ as { starts_at: string; ends_at: string | null; location: string | null }[]) ?? []).map((o) => ({
    startsAt: o.starts_at,
    endsAt: o.ends_at,
    location: o.location,
  }))

  return buildClientView(access.project_id, plan, occurrences)
}

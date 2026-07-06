// Client View — the first Project View rendered for an attached Client (ADR_011 Client View, ADR_012 access).
// It is a filtered PROJECTION of the same Project: the prepared event (via the existing public-safe
// buildPublicEventProjection — never organizer-only/financial data) plus the event schedule. Access is gated
// by a project-scoped invite token; a revoked relationship resolves to nothing. No new Project model.

import { createAdminClient } from '@/lib/supabase/server'
import { buildPublicEventProjection, type PublicEventProjection } from '@/lib/planning/public-event-projection'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { getProjectClientByToken, type ClientStatus } from './store'

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
 * Compose the Client View from the relationship status + the project's plan + its occurrences. Pure: a revoked
 * (or missing) relationship yields null (no access); otherwise the prepared event is the public-safe projection
 * and the schedule is date + location only. Exposes NO organizer-only data (budget / delivery / team / capacity
 * / lead / execution).
 */
export function buildClientView(
  projectId: string,
  status: ClientStatus,
  plan: EventPlanV2 | null,
  occurrences: ClientViewOccurrence[],
): ClientViewData | null {
  if (status === 'revoked') return null
  return {
    projectId,
    event: plan ? buildPublicEventProjection(plan) : null,
    occurrences,
  }
}

/**
 * Load the Client View for an invite token. Resolves the relationship server-side (admin), denies a revoked or
 * unknown token, then loads the plan + occurrences and composes the client-safe view. Returns null when the
 * token grants no access.
 */
export async function loadClientView(token: string): Promise<ClientViewData | null> {
  const admin = await createAdminClient()
  const client = await getProjectClientByToken(admin, token)
  if (!client || client.status === 'revoked') return null

  const { data: planRow } = await admin
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', client.project_id)
    .eq('project_version', 1)
    .maybeSingle()
  const plan = (planRow?.plan as EventPlanV2 | undefined) ?? null

  const { data: occ } = await admin
    .from('occurrences')
    .select('starts_at, ends_at, location')
    .eq('project_id', client.project_id)
    .order('starts_at', { ascending: true })
  const occurrences: ClientViewOccurrence[] = ((occ as { starts_at: string; ends_at: string | null; location: string | null }[]) ?? []).map((o) => ({
    startsAt: o.starts_at,
    endsAt: o.ends_at,
    location: o.location,
  }))

  return buildClientView(client.project_id, client.status, plan, occurrences)
}

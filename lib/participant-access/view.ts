// Participant View loader (ADR_011 / ADR_012) — resolves an invite token through the SHARED Project Access
// layer (one token choke point + the Access Policy view-scope), then composes the participant-safe projection
// (event via buildPublicEventProjection + schedule + public organizer contacts). The pure projection + types
// live in ./projection. No new Project model, no new access stack. Exposes NO organizer-only data.

import { createAdminClient } from '@/lib/supabase/server'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { resolveActiveByToken } from '@/lib/project-access/store'
import { accessGrantsView } from '@/lib/project-access/policy'
import { buildParticipantView, type ParticipantViewData, type ParticipantViewOccurrence } from './projection'

export type { ParticipantViewData, ParticipantViewOccurrence } from './projection'

/**
 * Load the Participant View for an invite token: resolve an ACTIVE grant (not revoked, not expired) whose type
 * may render the Participant View, then load the plan + occurrences + public organizer contacts and project.
 * Returns null when the token grants no participant access.
 */
export async function loadParticipantView(token: string): Promise<ParticipantViewData | null> {
  const admin = await createAdminClient()
  const access = await resolveActiveByToken(admin, token, new Date().toISOString())
  if (!access || !accessGrantsView(access.access_type, 'participant')) return null

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
  const occurrences: ParticipantViewOccurrence[] = ((occ as { starts_at: string; ends_at: string | null; location: string | null }[]) ?? []).map((o) => ({
    startsAt: o.starts_at,
    endsAt: o.ends_at,
    location: o.location,
  }))

  // Public organizer contacts only (owner_id / lead_organizer_id read server-side; never exposed as ids).
  const { data: proj } = await admin.from('projects').select('owner_id, lead_organizer_id').eq('id', access.project_id).maybeSingle()
  const owner = proj as { owner_id?: string; lead_organizer_id?: string | null } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizer = owner?.owner_id ? await getPublicOrganizer(admin as any, owner.owner_id) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = owner?.lead_organizer_id ? await getPublicOrganizer(admin as any, owner.lead_organizer_id) : null

  return buildParticipantView(access.project_id, plan, occurrences, organizer?.display_name ?? null, lead?.display_name ?? null)
}

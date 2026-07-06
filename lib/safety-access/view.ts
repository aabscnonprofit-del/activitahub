// Safety View loader (ADR_011 / ADR_012 / ADR_013) — resolves a Safety Link token through the SHARED Project
// Access layer (one token choke point + the Access Policy view-scope), then composes the safety-only projection
// (event basics + schedule + scale + the plan's safety profile + public organizer contacts). The pure
// projection + types live in ./projection. No new Project model, no new access stack. Exposes NO organizer-only
// data, and never budget / proposal / delivery / team / resources / worker assignments / participants /
// contracts / internal notes.

import { createAdminClient } from '@/lib/supabase/server'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import { projectParticipantCount } from '@/lib/capacity/gate'
import { listAccessByType } from '@/lib/project-access/store'
import { resolveActiveByToken } from '@/lib/project-access/store'
import { accessGrantsView } from '@/lib/project-access/policy'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import {
  buildSafetyView, safetyEventFromPlan, safetyProfileFromPlan,
  type SafetyViewData, type SafetyOccurrence,
} from './projection'

export type { SafetyViewData } from './projection'

/**
 * Load the Safety View for a Safety Link token: resolve an ACTIVE grant (not revoked, not expired) whose type
 * may render the Safety View, then load the safety-safe fields — event basics + schedule + expected attendance
 * (reused from the canonical participant-count source) + worker count (active worker relationships) + the
 * plan's safety profile + public organizer contacts. Returns null when the token grants no safety access.
 */
export async function loadSafetyView(token: string): Promise<SafetyViewData | null> {
  const admin = await createAdminClient()
  const access = await resolveActiveByToken(admin, token, new Date().toISOString())
  if (!access || !accessGrantsView(access.access_type, 'safety')) return null
  const projectId = access.project_id

  const { data: planRow } = await admin
    .from('project_event_plans_v2')
    .select('plan')
    .eq('project_id', projectId)
    .eq('project_version', 1)
    .maybeSingle()
  const plan = (planRow?.plan as EventPlanV2 | undefined) ?? null

  const { data: occ } = await admin
    .from('occurrences')
    .select('starts_at, ends_at, location')
    .eq('project_id', projectId)
    .order('starts_at', { ascending: true })
  const occurrences: SafetyOccurrence[] = ((occ as { starts_at: string; ends_at: string | null; location: string | null }[]) ?? []).map((o) => ({
    startsAt: o.starts_at,
    endsAt: o.ends_at,
    location: o.location,
  }))

  // Scale — expected attendance (canonical participant-count source) + count of active worker relationships.
  const expectedAttendance = await projectParticipantCount(admin, projectId)
  const workers = await listAccessByType(admin, projectId, 'worker')
  const workerCount = workers.filter((w) => w.status !== 'revoked').length

  // Public organizer contacts only (owner_id / lead_organizer_id read server-side; never exposed as ids).
  const { data: proj } = await admin.from('projects').select('owner_id, lead_organizer_id').eq('id', projectId).maybeSingle()
  const owner = proj as { owner_id?: string; lead_organizer_id?: string | null } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizer = owner?.owner_id ? await getPublicOrganizer(admin as any, owner.owner_id) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = owner?.lead_organizer_id ? await getPublicOrganizer(admin as any, owner.lead_organizer_id) : null

  const { title, description } = safetyEventFromPlan(plan)
  return buildSafetyView({
    projectId,
    title,
    description,
    occurrences,
    expectedAttendance,
    workerCount,
    safetyProfile: safetyProfileFromPlan(plan),
    contacts: { organizerName: organizer?.display_name ?? null, leadOrganizerName: lead?.display_name ?? null, safetyCoordinatorName: null },
  })
}

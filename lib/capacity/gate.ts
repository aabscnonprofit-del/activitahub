// Organizer Capacity Gate loader — composes the live inputs and evaluates the gate.
//
//   organizer capacity level (profiles.organizer_capacity_level; default Level 1)
//   project participant count (the canonical planning data — reused, never re-derived)
//     → evaluateCapacityGate
//
// The participant count is read from the durable Planning Domain (getPlanningDomain → details.guestCount), the
// same canonical source Planning uses; this module does NOT re-derive it. Reads degrade safely (default level /
// unknown count) so the gate never errors the page before migration 054 is applied.

import type { createClient } from '@/lib/supabase/server'
import { getPlanningDomain } from '@/lib/planning/planning-domain-store'
import { getProjectLeadOrganizerId } from '@/lib/projects/store'
import {
  DEFAULT_CAPACITY_LEVEL, evaluateCapacityGate, isCapacityLevel,
  type CapacityGateResult, type CapacityLevel,
} from './model'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** The evaluated gate for a project, plus who its effective Lead Organizer is. */
export interface ProjectCapacityGate extends CapacityGateResult {
  ownerId: string
  /** The assigned Lead Organizer, or null when the owner leads. */
  leadOrganizerId: string | null
  /** The organizer whose capacity was evaluated: leadOrganizerId ?? ownerId. */
  effectiveLeadId: string
}

/** The organizer's capacity level from their profile, defaulting to Level 1 (also on a missing column/row). */
export async function getOrganizerCapacityLevel(supabase: ServerClient, userId: string): Promise<CapacityLevel> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('organizer_capacity_level')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return DEFAULT_CAPACITY_LEVEL
    const level = (data as { organizer_capacity_level?: unknown }).organizer_capacity_level
    return isCapacityLevel(level) ? level : DEFAULT_CAPACITY_LEVEL
  } catch {
    return DEFAULT_CAPACITY_LEVEL
  }
}

/** The project's participant count from the canonical Planning Domain (guestCount), or null when unknown. */
export async function projectParticipantCount(supabase: ServerClient, projectId: string): Promise<number | null> {
  const domain = await getPlanningDomain(supabase, projectId, 1)
  const count = domain?.details?.guestCount
  return typeof count === 'number' ? count : null
}

/**
 * Evaluate the Organizer Capacity Gate for a project against its EFFECTIVE Lead Organizer: the assigned Lead
 * Organizer if one is set, otherwise the owner. Reads that organizer's level and the project's participant
 * count, then evaluates. So an over-capacity owner who assigns a qualified Lead Organizer passes the gate.
 * Determines organizer eligibility only — never the event.
 */
export async function loadCapacityGate(
  supabase: ServerClient,
  projectId: string,
  ownerId: string,
): Promise<ProjectCapacityGate> {
  const leadOrganizerId = await getProjectLeadOrganizerId(supabase, projectId)
  const effectiveLeadId = leadOrganizerId ?? ownerId
  const [level, count] = await Promise.all([
    getOrganizerCapacityLevel(supabase, effectiveLeadId),
    projectParticipantCount(supabase, projectId),
  ])
  return { ...evaluateCapacityGate(level, count), ownerId, leadOrganizerId, effectiveLeadId }
}

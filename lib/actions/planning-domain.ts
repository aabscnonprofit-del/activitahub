'use server'

// Planning Domain edit action (Stage 5e of the Planning Layer Migration).
//
// The ONLY recompute trigger in the Project World: applying a planning-relevant change to the Planning
// Domain persists the new domain and recomputes exactly once. Non-planning domains (Payments, Registration,
// Media, Reviews, Communication, Documents, Timeline, ...) have their own actions and NEVER call this — so
// they never invoke Planning Engine.
//
// Decision A: planning recompute runs Planning Engine V2 only; PlannerInput is never reconstructed.

import { createClient } from '@/lib/supabase/server'
import { getPlanningDomain, persistPlanningDomain } from '@/lib/planning/planning-domain-store'
import { recomputeProjectPlan } from '@/lib/planning/recompute'
import type { PlanningDomain } from '@/lib/planning/planning-domain'

/**
 * Apply a planning-relevant change to a Project's Planning Domain and recompute. Updates the durable
 * Planning Domain (planning inputs only), then triggers exactly one Planning Engine V2 recompute.
 */
export async function updateProjectPlanningDomain(
  projectId: string,
  change: Partial<PlanningDomain>,
  projectVersion = 1,
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const current = await getPlanningDomain(supabase, projectId, projectVersion)
  if (!current) return { ok: false }

  const updated: PlanningDomain = { ...current, ...change }
  await persistPlanningDomain(supabase, projectId, projectVersion, updated)

  // Planning-relevant change → recompute exactly once.
  await recomputeProjectPlan(supabase, projectId, projectVersion)
  return { ok: true }
}

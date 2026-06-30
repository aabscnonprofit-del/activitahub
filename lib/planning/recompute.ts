// Project-world recompute (Stage 5e of the Planning Layer Migration).
//
// Per the accepted Stage 5e architecture: a planning-relevant change in the Planning Domain re-runs Planning
// Engine V2 (the ONLY planning engine) on the FED built transiently from the durable Planning Domain,
// producing a new EventPlanV2; the dependent projections then re-derive from it.
//
// Decision A: it NEVER reconstructs PlannerInput and NEVER invokes generatePlan (legacy). The recompute
// source is the Planning Domain — not the FED (which is transient), not PlannerInput, not EventPlanV2.

import type { createClient } from '@/lib/supabase/server'
import { planningEngineV2 } from './planning-engine-v2'
import { persistEventPlanV2, getEventPlanV2 } from './persistence'
import { getPlanningDomain } from './planning-domain-store'
import { planningDomainToFed } from './planning-domain'
import { regenerateProjectBudgetFromEventPlan } from '@/lib/budget/regenerate-from-event-plan'
import type { EventPlanV2 } from './event-plan-v2'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Recompute the Project's plan from its Planning Domain. Reads the durable Planning Domain, builds the
 * transient engine input (FED) from it, re-runs Planning Engine V2 to produce a new EventPlanV2, and
 * persists it (the dependent projections re-derive from the new EventPlanV2). Returns the new EventPlanV2,
 * or null if the Project has no Planning Domain. Invoked ONLY by planning-relevant Planning-Domain changes.
 */
export async function recomputeProjectPlan(
  supabase: ServerClient,
  projectId: string,
  projectVersion = 1,
): Promise<EventPlanV2 | null> {
  const domain = await getPlanningDomain(supabase, projectId, projectVersion)
  if (!domain) return null

  const fed = planningDomainToFed(domain)
  const plan = planningEngineV2.plan(fed)

  // Refined recompute order: the durable planning artifact (EventPlanV2) is persisted FIRST, then dependent
  // projections regenerate from the ALREADY-PERSISTED authoritative EventPlanV2 — never from an unpersisted
  // plan. Sequential persistence (no DB transaction); Budget regeneration is part of the same operation.
  await persistEventPlanV2(supabase, projectId, projectVersion, plan)
  const persisted = await getEventPlanV2(supabase, projectId, projectVersion)
  if (persisted) {
    await regenerateProjectBudgetFromEventPlan(supabase, projectId, projectVersion, persisted)
  }
  return plan
}

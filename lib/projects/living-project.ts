// Living Project — the consolidated read of one Project as the operational center (Phase 1.1 wiring).
//
// Composes the existing owner-scoped readers of the Project-owned modules into ONE operational view, so the
// Project becomes the single place its model is seen. WIRING ONLY: no new data, no schema, no redesign — it
// reuses getProject, getEventPlanV2, getPlanningDomain, listBudgetsForProject, loadProjectCommercialProposal,
// and getProjectPublishState. It reads the Living Project root (lib/projects/store.ts, migration 041); it
// never plans, prices, or writes.

import type { createClient } from '@/lib/supabase/server'
import { getProject, getProjectPublishState, type Project } from '@/lib/projects/store'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { getPlanningDomain } from '@/lib/planning/planning-domain-store'
import { listBudgetsForProject, type BudgetRow } from '@/lib/budget/store'
import { loadProjectCommercialProposal } from '@/lib/budget/load-commercial-proposal'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import type { CommercialProposalProjection } from '@/lib/budget/commercial-proposal-projection'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * The consolidated operational view of one Project — its assembled model across the Project-owned modules.
 * Each field is the current state of a capability the Project already owns; `null`/`false` means "not yet".
 */
export interface LivingProject {
  project: Project
  plan: EventPlanV2 | null
  hasPlanningDomain: boolean
  budget: BudgetRow | null
  commercialProposal: CommercialProposalProjection | null
  isPublished: boolean
}

/**
 * Read one Project as the operational center: its root plus the current state of every Project-owned module
 * it already has (plan, planning domain, budget, commercial proposal, publish state). Owner-scoped via RLS —
 * the caller passes an RLS-scoped client. Returns null when the Project does not exist or is not the
 * caller's. Pure read: it composes the existing readers and plans/prices/writes nothing.
 */
export async function getLivingProject(
  supabase: ServerClient,
  projectId: string,
  projectVersion = 1,
): Promise<LivingProject | null> {
  const project = await getProject(supabase, projectId)
  if (!project) return null

  const [plan, planningDomain, budgets, commercialProposal, isPublished] = await Promise.all([
    getEventPlanV2(supabase, projectId, projectVersion),
    getPlanningDomain(supabase, projectId, projectVersion),
    listBudgetsForProject(supabase, projectId),
    loadProjectCommercialProposal(supabase, projectId, projectVersion),
    getProjectPublishState(supabase, projectId),
  ])

  return {
    project,
    plan,
    hasPlanningDomain: planningDomain != null,
    budget: budgets[0] ?? null,
    commercialProposal,
    isPublished,
  }
}

// Commercial Proposal — project projection loader (Stage 5c of the Planning Layer Migration).
//
// Reads the two Project-owned sources — the persisted EventPlanV2 and the Project Budget — and assembles
// the Commercial Proposal projection. READ-ONLY: it never plans, never reconstructs PlannerInput, never
// invokes any planning engine, and never derives missing information. Returns null when the Project has no
// EventPlanV2 or no Budget yet.

import type { createClient } from '@/lib/supabase/server'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { listBudgetsForProject } from '@/lib/budget/store'
import { getBudgetAction } from '@/lib/actions/budget'
import { buildCommercialProposalProjection, type CommercialProposalProjection } from '@/lib/budget/commercial-proposal-projection'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Load the Commercial Proposal projection for a Project (prepared event from EventPlanV2 priced by the
 * Project Budget). Returns null if either source is absent. Pure read — no planning, no PlannerInput.
 */
export async function loadProjectCommercialProposal(
  supabase: ServerClient,
  projectId: string,
  projectVersion = 1,
): Promise<CommercialProposalProjection | null> {
  const eventPlan = await getEventPlanV2(supabase, projectId, projectVersion)
  if (!eventPlan) return null

  const budgets = await listBudgetsForProject(supabase, projectId)
  const budgetRow = budgets[0]
  if (!budgetRow) return null

  const res = await getBudgetAction({ budgetId: budgetRow.id })
  if (!res.ok) return null

  return buildCommercialProposalProjection(eventPlan, { lines: res.data.lines, totals: res.data.totals })
}

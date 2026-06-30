// Budget regeneration from EventPlanV2 (Stage 5f of the Planning Layer Migration).
//
// Used INSIDE the recompute operation so that a persisted Budget never represents a Project State older than
// its EventPlanV2. Replaces the Project Budget's lines with lines derived from the (new) EventPlanV2. No-op
// if the Project has no Budget yet (it will be created fresh from the current EventPlanV2 on first open).
//
// Pure projection of the plan into budget lines (eventPlanLineSpecs) — it never plans and never reads
// PlannerInput.
//
// NOTE: a planning recompute changes the Project's resource/role needs, so the source-derived lines are
// replaced wholesale; organizer line-level overlays are reset on a planning recompute. Preserving overlays
// across recompute is a separate Budget-domain refinement.

import type { createClient } from '@/lib/supabase/server'
import { listBudgetsForProject, createBudgetLine } from '@/lib/budget/store'
import { eventPlanLineSpecs } from '@/lib/budget/mirror'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Regenerate the Project's Budget lines from a (new) EventPlanV2. No-op if the Project has no Budget. */
export async function regenerateProjectBudgetFromEventPlan(
  supabase: ServerClient,
  projectId: string,
  projectVersion: number,
  plan: EventPlanV2,
): Promise<void> {
  const budgets = await listBudgetsForProject(supabase, projectId)
  const budget = budgets[0]
  if (!budget) return

  const { error } = await supabase.from('budget_lines').delete().eq('budget_id', budget.id)
  if (error) throw new Error(`regenerateProjectBudgetFromEventPlan: clear lines failed: ${error.message}`)

  const specs = eventPlanLineSpecs({ projectId, projectVersion }, plan)
  for (const spec of specs) {
    await createBudgetLine(supabase, { budgetId: budget.id, sourceComponentRef: spec.sourceComponentRef, label: spec.label })
  }
}

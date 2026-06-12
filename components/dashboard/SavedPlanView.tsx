'use client'

import { useTranslations } from 'next-intl'
import { HelpCircle } from 'lucide-react'
import PlanResult from '@/components/planner/PlanResult'
import PlanHandoff from '@/components/planner/PlanHandoff'
import BudgetView from '@/components/dashboard/BudgetView'
import ChecklistView from '@/components/dashboard/ChecklistView'
import RiskView from '@/components/dashboard/RiskView'
import ResourceView from '@/components/dashboard/ResourceView'
import { canEditBudget, canEditPrep } from '@/lib/workspace/lifecycle'
import type { SavedPlan } from '@/lib/types'

// Render of a persisted SavedPlan (M5 WP1 T5; WP6 budget editing; WP7 prep state).
// Reuses the consumer planner's render components — NO engine call. The budget,
// task, risk and resource blocks are swapped (via PlanResult slots) for the
// interactive workspace lenses; their edits/progress persist current-plan-only and
// drive the readiness strip. Everything else stays read-only.
//   plan_ready          → PlanResult + editable budget / tasks / risks / resources
//   needs_clarification → a read-only list of the pending questions
//   refusal statuses    → PlanHandoff (coverage reason / next step)

export default function SavedPlanView({ plan, onUpdated }: { plan: SavedPlan; onUpdated: (p: SavedPlan) => void }) {
  const t = useTranslations('planner.result')
  const result = plan.result

  if (result.status === 'plan_ready' && result.plan) {
    // Freeze (WP8): budget = plan definition (locked at Ready); tasks/risks/
    // resources = preparation progress (locked at Completed).
    const budgetEditable = canEditBudget(plan.phase)
    const prepEditable = canEditPrep(plan.phase)
    return (
      <PlanResult
        plan={result.plan}
        budgetSlot={<BudgetView plan={plan} onUpdated={onUpdated} editable={budgetEditable} />}
        tasksSlot={<ChecklistView plan={plan} onUpdated={onUpdated} editable={prepEditable} />}
        risksSlot={<RiskView plan={plan} onUpdated={onUpdated} editable={prepEditable} />}
        resourcesSlot={<ResourceView plan={plan} onUpdated={onUpdated} editable={prepEditable} />}
      />
    )
  }

  if (result.status === 'needs_clarification') {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-brand-600" />
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
            {t('clarifyBadge')}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">{t('clarifyTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('clarifySubtitle')}</p>
        <ul className="mt-4 space-y-2">
          {(result.questions ?? []).map((q) => (
            <li key={q.id} className="rounded-xl border border-brand-100 bg-white p-3 text-sm text-slate-700">
              {q.question}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // unsupported / needs_human_review / needs_certified_organizer / unsupported_modifier
  return <PlanHandoff coverage={result.coverage} />
}

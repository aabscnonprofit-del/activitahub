'use client'

import { useTranslations } from 'next-intl'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import { usePrepToggle } from '@/components/dashboard/usePrepToggle'
import type { ChecklistItem } from '@/lib/ope/types'
import type { SavedPlan } from '@/lib/types'

// WP7 — interactive task lens. Replaces PlanResult's read-only checklist grid (via
// its `tasksSlot`) with tick-able items. Ticking persists the item id into
// prep_state.tasks_done; completed items feed the readiness Ready %. Engine output
// is untouched — done-state lives only on the saved plan.

export default function ChecklistView({ plan, onUpdated, editable = true }: { plan: SavedPlan; onUpdated: (p: SavedPlan) => void; editable?: boolean }) {
  const t = useTranslations('planner.result')
  const tw = useTranslations('workspace')
  const { pendingId, failed, toggle } = usePrepToggle(plan, onUpdated)

  const b = plan.result.plan!.section_b_your_plan
  const done = new Set(plan.prep_state?.tasks_done ?? [])

  const Column = ({ title, items }: { title: string; items: ChecklistItem[] }) => {
    if (!items.length) return null
    return (
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
        <ul className="space-y-1.5">
          {items.map((it) => {
            const checked = done.has(it.id)
            const busy = pendingId === it.id
            const icon = busy ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" />
            ) : checked ? (
              <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            )
            const label = <span className={checked ? 'text-slate-400 line-through' : ''}>{it.task}</span>
            return (
              <li key={it.id}>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => toggle('tasks_done', it.id)}
                    disabled={busy}
                    aria-pressed={checked}
                    className="flex w-full items-start gap-2 text-left text-sm text-slate-700 disabled:opacity-60"
                  >
                    {icon}{label}
                  </button>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-slate-700">{icon}{label}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Column title={t('prepChecklist')} items={b.preparation_checklist} />
        <Column title={t('dayOfChecklist')} items={b.day_of_checklist} />
        <Column title={t('afterChecklist')} items={b.after_event_checklist} />
      </div>
      {failed && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{tw('errSavePrep')}</p>}
    </>
  )
}

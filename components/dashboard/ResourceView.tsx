'use client'

import { useTranslations } from 'next-intl'
import { PackageCheck, Check, RotateCcw, Loader2 } from 'lucide-react'
import { usePrepToggle } from '@/components/dashboard/usePrepToggle'
import { applyBudgetCorrections } from '@/lib/workspace/budget-overlay'
import type { BudgetLine } from '@/lib/ope/types'
import type { SavedPlan } from '@/lib/types'

// WP7 — resource lens (new card, injected via PlanResult's `resourcesSlot`). The
// resources to secure ARE the priced budget's required (non-optional) line items —
// no new model, no sourcing. "Mark secured" persists the line's item_key into
// prep_state.resources_sourced; secured lines drop out of the readiness Missing
// Resources count. Amounts read through the WP6 overlay so corrections show here too.

const money = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

export default function ResourceView({ plan, onUpdated, editable = true }: { plan: SavedPlan; onUpdated: (p: SavedPlan) => void; editable?: boolean }) {
  const tw = useTranslations('workspace')
  const { pendingId, failed, toggle } = usePrepToggle(plan, onUpdated)

  const original = plan.result.plan?.section_c_budget
  const budget = original ? applyBudgetCorrections(original, plan.corrections) : undefined

  // Required = non-optional priced lines, deduped by item_key (biggest first).
  const seen = new Set<string>()
  const lines: BudgetLine[] = (budget?.is_priced ? budget.breakdown ?? [] : [])
    .filter((l) => !l.optional && !seen.has(l.item_key) && seen.add(l.item_key))
    .sort((a, b) => b.line.likely - a.line.likely)

  const sourced = new Set(plan.prep_state?.resources_sourced ?? [])
  const securedCount = lines.filter((l) => sourced.has(l.item_key)).length

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-brand-500" />
          <h3 className="font-bold text-slate-900">{tw('resourcesTitle')}</h3>
        </div>
        {lines.length > 0 && (
          <span className="text-xs font-semibold text-slate-500">{securedCount}/{lines.length}</span>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-slate-500">{tw('resourcesEmpty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {lines.map((l) => {
            const secured = sourced.has(l.item_key)
            const busy = pendingId === l.item_key
            return (
              <li key={l.item_key} className="flex items-center justify-between gap-3 py-2">
                <span className={`flex min-w-0 items-center gap-2 ${secured ? 'text-slate-400' : 'text-slate-700'}`}>
                  <span className={`truncate ${secured ? 'line-through' : ''}`}>{l.item_key.replace(/_/g, ' ')}</span>
                  <span className="shrink-0 text-xs text-slate-400">{money(l.line.likely, budget!.currency)}</span>
                </span>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => toggle('resources_sourced', l.item_key)}
                    disabled={busy}
                    aria-pressed={secured}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${secured ? 'text-slate-500 hover:text-slate-800' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : secured ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    {secured ? tw('secured') : tw('markSecured')}
                  </button>
                ) : secured ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> {tw('secured')}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {failed && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{tw('errSavePrep')}</p>}
    </div>
  )
}

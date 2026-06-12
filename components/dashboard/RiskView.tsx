'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, Check, RotateCcw, Loader2 } from 'lucide-react'
import { usePrepToggle } from '@/components/dashboard/usePrepToggle'
import type { SavedPlan } from '@/lib/types'

// WP7 — interactive risk lens. Replaces PlanResult's read-only risks card (via its
// `risksSlot`). "Mark resolved" persists the risk id into prep_state.risks_handled;
// resolved risks drop out of the readiness Open Risks count (and stop weighing on
// Ready %). Engine output is untouched.

const SEVERITY: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

export default function RiskView({ plan, onUpdated, editable = true }: { plan: SavedPlan; onUpdated: (p: SavedPlan) => void; editable?: boolean }) {
  const t = useTranslations('planner.result')
  const tw = useTranslations('workspace')
  const { pendingId, failed, toggle } = usePrepToggle(plan, onUpdated)

  const risks = plan.result.plan!.section_d_key_risks.risks
  const handled = new Set(plan.prep_state?.risks_handled ?? [])

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
        <h3 className="font-bold text-slate-900">{t('risks')}</h3>
      </div>
      <ul className="space-y-3">
        {risks.map((r) => {
          const resolved = handled.has(r.id)
          const busy = pendingId === r.id
          return (
            <li key={r.id} className={`rounded-xl border p-3 ${resolved ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY[r.severity] ?? SEVERITY.low}`}>{r.severity}</span>
                  <p className={`truncate text-sm font-semibold ${resolved ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{r.name}</p>
                </div>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => toggle('risks_handled', r.id)}
                    disabled={busy}
                    aria-pressed={resolved}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${resolved ? 'text-slate-500 hover:text-slate-800' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    {resolved ? tw('resolved') : tw('markResolved')}
                  </button>
                ) : resolved ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> {tw('resolved')}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-sm ${resolved ? 'text-slate-400' : 'text-slate-600'}`}>
                <b className="text-slate-700">{t('mitigation')}:</b> {r.mitigation}
              </p>
            </li>
          )
        })}
      </ul>
      {failed && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{tw('errSavePrep')}</p>}
    </div>
  )
}

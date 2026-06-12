'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Loader2, AlertTriangle, MoreHorizontal, CircleCheck, CircleDashed } from 'lucide-react'
import { advancePhase } from '@/lib/actions/opePlans'
import { allowedTransitions, forwardNext, isBillingActive, type Transition } from '@/lib/workspace/lifecycle'
import type { OpePlanPhase, SavedPlan } from '@/lib/types'

// WP8 — lifecycle controls. The single place an organizer moves a plan through
// Draft → Planning → Ready → In Progress → Completed → Closed. The primary button
// is the forward step; override (unfreeze / reopen / abandon) live behind "More"
// and require an explicit confirm with a warning. Every change goes through the
// advancePhase server action (validated + audited). A billing chip shows whether
// the phase counts as an active project. No payments — signal only.

const PHASE_KEY: Record<OpePlanPhase, string> = {
  draft: 'phaseDraft', planning: 'phasePlanning', ready: 'phaseReady',
  in_progress: 'phaseInProgress', completed: 'phaseCompleted', closed: 'phaseClosed',
}

export default function LifecycleControls({ plan, onUpdated }: { plan: SavedPlan; onUpdated: (p: SavedPlan) => void }) {
  const tw = useTranslations('workspace')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState<Transition | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const phase = plan.phase
  const next = forwardNext(phase)
  const overrides = allowedTransitions(phase).filter((t) => t.kind !== 'forward')
  const active = isBillingActive(phase)
  const phaseLabel = (p: OpePlanPhase) => tw(PHASE_KEY[p])

  async function run(t: Transition) {
    setBusy(true)
    setFailed(false)
    try {
      const res = await advancePhase(plan.id, t.to)
      if (res.success && res.data) {
        onUpdated(res.data)
        setConfirming(null)
        setMoreOpen(false)
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // Forced or warn-bearing transitions confirm first; plain forwards run immediately.
  function trigger(t: Transition) {
    setFailed(false)
    if (t.forced || t.warnKey) setConfirming(t)
    else run(t)
  }

  function overrideLabel(t: Transition) {
    if (t.kind === 'unfreeze') return tw('actionUnfreeze')
    if (t.kind === 'abandon') return tw('actionClose')
    return tw('actionReopenTo', { phase: phaseLabel(t.to) })
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {active ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
          {active ? tw('billingActive') : tw('billingInactive')}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {overrides.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => { setMoreOpen((v) => !v); setConfirming(null) }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
              >
                <MoreHorizontal className="h-4 w-4" /> {tw('moreActions')}
              </button>
              {moreOpen && (
                <div className="absolute right-0 z-10 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {overrides.map((t) => (
                    <button
                      key={t.to + t.kind}
                      type="button"
                      onClick={() => { trigger(t); setMoreOpen(false) }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {overrideLabel(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {next && (
            <button
              type="button"
              onClick={() => trigger(next)}
              disabled={busy}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-sm"
            >
              {busy && !confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {tw('advanceTo', { phase: phaseLabel(next.to) })}
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {tw(confirming.warnKey ?? 'warnGeneric')}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => run(confirming)}
              disabled={busy}
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {tw('confirmAction')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={busy}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              {tw('cancel')}
            </button>
          </div>
        </div>
      )}

      {failed && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{tw('errTransition')}</p>}
    </section>
  )
}

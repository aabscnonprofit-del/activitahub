'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Lock } from 'lucide-react'
import SavedPlanView from '@/components/dashboard/SavedPlanView'
import EditPlanForm from '@/components/dashboard/EditPlanForm'
import ReadinessStrip from '@/components/dashboard/ReadinessStrip'
import LifecycleControls from '@/components/dashboard/LifecycleControls'
import { canEditInputs } from '@/lib/workspace/lifecycle'
import type { SavedPlan } from '@/lib/types'

// WP5.1 — interactive shell for the saved plan detail. Holds the current plan in
// state so a recompute updates the header (version) and result in place, toggles
// between the read-only SavedPlanView and the EditPlanForm, and surfaces the
// version change after a Save & Recalculate. Read-only render still never runs
// the engine; recompute happens server-side in updatePlanInputs().

const PHASE_KEY: Record<string, string> = {
  draft: 'phaseDraft', planning: 'phasePlanning', ready: 'phaseReady',
  in_progress: 'phaseInProgress', completed: 'phaseCompleted', closed: 'phaseClosed',
}

export default function PlanDetailClient({ initialPlan }: { initialPlan: SavedPlan }) {
  const t = useTranslations('workspace')
  const [plan, setPlan] = useState<SavedPlan>(initialPlan)
  const [editing, setEditing] = useState(false)
  // Transient note: which version we recomputed from → to, cleared on next edit.
  const [bump, setBump] = useState<{ from: number; to: number } | null>(null)

  function handleSaved(updated: SavedPlan) {
    setBump({ from: plan.version, to: updated.version })
    setPlan(updated)
    setEditing(false)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{plan.title || t('untitled')}</h1>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
          {t(PHASE_KEY[plan.phase] ?? 'phasePlanning')}
        </span>
        <span className="text-xs text-slate-400">v{plan.version}</span>
        {!editing && canEditInputs(plan.phase) && (
          <button
            onClick={() => { setBump(null); setEditing(true) }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            <Pencil className="h-4 w-4" /> {t('editInputs')}
          </button>
        )}
        {!editing && !canEditInputs(plan.phase) && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Lock className="h-3.5 w-3.5" /> {t('frozenPlanNote')}
          </span>
        )}
      </div>

      {bump && !editing && (
        <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {t('versionBumped', { from: bump.from, to: bump.to })}
        </p>
      )}

      {editing ? (
        <>
          <h2 className="mb-4 text-lg font-bold text-slate-900">{t('editHeading')}</h2>
          <EditPlanForm plan={plan} onSaved={handleSaved} onCancel={() => setEditing(false)} />
        </>
      ) : (
        <>
          <LifecycleControls plan={plan} onUpdated={setPlan} />
          <ReadinessStrip plan={plan} />
          <SavedPlanView plan={plan} onUpdated={setPlan} />
        </>
      )}
    </>
  )
}

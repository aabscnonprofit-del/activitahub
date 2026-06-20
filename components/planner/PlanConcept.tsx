'use client'

import { Sparkles, ShieldAlert, ArrowLeft } from 'lucide-react'
import type { ConceptFunnelResult, ConceptOption } from '@/lib/ope/concept-funnel'

// Concept-selection screen for the idea-first planner. Shows the concept options the
// Concept Funnel proposed for the user's raw idea and lets them choose a direction before
// any operational detail or planning. (Copy is English-only for this first wiring.)
export default function PlanConcept({
  funnel,
  loading,
  onSelect,
  onBack,
}: {
  funnel: ConceptFunnelResult
  loading: boolean
  onSelect: (concept: ConceptOption) => void
  onBack: () => void
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Describe it differently
      </button>

      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900">A few directions your idea could take</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {funnel.clarification_prompt || 'Choose the direction that feels closest — we plan from there.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {funnel.concept_options.map((c, i) => (
          <button
            key={`${c.title}-${i}`}
            type="button"
            disabled={loading}
            onClick={() => onSelect(c)}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
          >
            <h3 className="font-bold text-slate-900">{c.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{c.interpretation}</p>
            <dl className="mt-3 space-y-1 text-xs text-slate-500">
              <div className="flex gap-1.5"><dt className="font-semibold text-slate-600">Mood:</dt><dd>{c.mood}</dd></div>
              <div className="flex gap-1.5"><dt className="font-semibold text-slate-600">Best for:</dt><dd>{c.suitable_for}</dd></div>
            </dl>
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {c.risks_or_safety_notes}
            </p>
            <span className="mt-3 text-sm font-semibold text-brand-700">Choose this direction →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

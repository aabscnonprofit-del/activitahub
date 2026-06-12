'use client'

import { useTranslations } from 'next-intl'
import { ShieldAlert, ArrowRight, Info } from 'lucide-react'
import type { CoverageDecision } from '@/lib/ope'

// Surfaces the Coverage / Complexity Gate's refusal/handoff state instead of a
// (wrong) plan. Rendered only when status !== 'plan_ready'. The reason and
// next-step text come from the engine (English, like all generated content);
// the labels are localized.

const STATUS_KEY: Record<Exclude<CoverageDecision['status'], 'plan_ready'>, string> = {
  unsupported: 'statusUnsupported',
  needs_human_review: 'statusNeedsReview',
  needs_certified_organizer: 'statusNeedsOrganizer',
  unsupported_modifier: 'statusUnsupportedModifier',
}

const prettyCap = (c: string) =>
  c.replace(/:/g, ': ').replace(/_/g, ' ')

export default function PlanHandoff({ coverage }: { coverage: CoverageDecision }) {
  const t = useTranslations('planner.result')
  const statusLabel = coverage.status === 'plan_ready' ? '' : t(STATUS_KEY[coverage.status])
  const confidencePct = Math.round(coverage.confidence * 100)

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-600" />
        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
          {statusLabel}
        </span>
      </div>

      <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">{t('handoffTitle')}</h2>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('handoffReasonLabel')}</p>
          <p className="mt-1 text-slate-700">{coverage.reason}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('handoffNextStepLabel')}</p>
          <p className="mt-1 flex items-start gap-2 font-medium text-slate-800">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {coverage.recommended_next_step}
          </p>
        </div>

        {coverage.missing_capabilities.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('handoffMissingLabel')}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {coverage.missing_capabilities.map((c) => (
                <li key={c} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-amber-200">
                  {prettyCap(c)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          {t('handoffConfidenceLabel')}: {confidencePct}%
        </p>
      </div>
    </div>
  )
}

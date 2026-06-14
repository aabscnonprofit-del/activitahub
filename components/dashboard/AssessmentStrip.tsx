'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Compass } from 'lucide-react'
import type { OpeAssessment } from '@/lib/ope'

// Task #3 — OPE assessment strip. Renders the deterministic preliminary assessment
// stored on a saved plan (complexity · estimated budget range · automation coverage
// · risk level). Pure presentation: it reads plan.assessment, runs no engine and no
// I/O. Because PlanDetailClient holds `plan` in state, a recompute (Edit Inputs →
// updatePlanInputs) refreshes these values live.

const TONE = {
  good: 'bg-emerald-50 ring-emerald-200 text-emerald-700',
  warn: 'bg-amber-50 ring-amber-200 text-amber-700',
  bad: 'bg-red-50 ring-red-200 text-red-700',
  neutral: 'bg-slate-50 ring-slate-200 text-slate-800',
} as const
const LEVEL_TONE = { low: 'good', medium: 'warn', high: 'bad' } as const
const COVERAGE_TONE = { full: 'good', partial: 'warn', none: 'bad' } as const

export default function AssessmentStrip({ assessment }: { assessment: OpeAssessment }) {
  const t = useTranslations('workspace.assessment')
  const locale = useLocale()
  const a = assessment

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  const budgetText = a.estimated_budget
    ? `${fmt(a.estimated_budget.low, a.estimated_budget.currency)} – ${fmt(a.estimated_budget.high, a.estimated_budget.currency)}`
    : t('notPriced')

  const Card = ({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONE }) => (
    <div className={`rounded-xl p-3 ring-1 ${TONE[tone]}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <p className="mt-1 text-base font-extrabold leading-tight">{value}</p>
    </div>
  )

  return (
    <section aria-label={t('title')} className="mb-6">
      <div className="mb-2 flex items-center gap-1.5">
        <Compass className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{t('title')}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Card label={t('complexity')} value={t(`levels.${a.complexity}`)} tone={LEVEL_TONE[a.complexity]} />
        <Card label={t('budget')} value={budgetText} tone="neutral" />
        <Card label={t('automation')} value={t(`coverage.${a.automation_coverage}`)} tone={COVERAGE_TONE[a.automation_coverage]} />
        <Card label={t('risk')} value={t(`levels.${a.risk_level}`)} tone={LEVEL_TONE[a.risk_level]} />
      </div>
    </section>
  )
}

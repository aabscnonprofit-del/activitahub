'use client'

import { useTranslations } from 'next-intl'
import { Gauge, ArrowRight } from 'lucide-react'
import { computeReadiness, type RagStatus, type ReadinessMetric } from '@/lib/workspace/readiness'
import type { SavedPlan } from '@/lib/types'

// WP5.2 — Readiness Dashboard strip. Renders the deterministic readiness snapshot
// (computeReadiness, a pure workspace layer over the persisted plan — no engine
// call) so an organizer can read project health at a glance: Ready %, Open Risks,
// Missing Resources, Budget, Staffing, plus one Next Recommended Action. Because
// PlanDetailClient holds `plan` in state, a recompute updates these values live.

const CARD: Record<RagStatus, string> = {
  good: 'bg-emerald-50 ring-emerald-200',
  warn: 'bg-amber-50 ring-amber-200',
  bad: 'bg-red-50 ring-red-200',
}
const VALUE: Record<RagStatus, string> = {
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-red-700',
}
const DOT: Record<RagStatus, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
}

export default function ReadinessStrip({ plan }: { plan: SavedPlan }) {
  const t = useTranslations('workspace')
  const r = computeReadiness(plan)

  const metricValue = (m: ReadinessMetric) => (m.valueIsKey ? t(m.value) : m.value)

  const Card = ({
    label, value, status,
  }: { label: string; value: string; status: RagStatus }) => (
    <div className={`rounded-xl p-3 ring-1 ${CARD[status]}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className={`mt-1 text-xl font-extrabold leading-tight ${VALUE[status]}`}>{value}</p>
    </div>
  )

  return (
    <section aria-label={t('nextActionTitle')} className="mb-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Card label={t('readyLabel')} value={`${r.readyPct}%`} status={r.readyStatus} />
        {r.metrics.map((m) => (
          <Card key={m.labelKey} label={t(m.labelKey)} value={metricValue(m)} status={m.status} />
        ))}
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{t('nextActionTitle')}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-bold text-slate-900">
            <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            {t(r.nextAction.key, r.nextAction.vars)}
          </p>
        </div>
      </div>
    </section>
  )
}

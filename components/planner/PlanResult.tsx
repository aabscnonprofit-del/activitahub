'use client'

import { useTranslations } from 'next-intl'
import {
  CalendarClock, CheckSquare, Wallet, AlertTriangle, MessageSquare, Sparkles, MapPin, Info,
} from 'lucide-react'
import type { PlannerOutput } from '@/lib/ope/types'

const money = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

const SEVERITY: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

function Checklist({ title, items }: { title: string; items: { id: string; task: string }[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            {it.task}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Optional slots let the workspace swap read-only blocks for interactive lenses
// without forking the 6-section render: `budgetSlot` → editable BudgetView (WP6);
// `tasksSlot`/`risksSlot` → tick-able checklist/risk lenses and `resourcesSlot` →
// a resource-securing card (WP7). All omitted on the public planner, so its render
// is unchanged.
export default function PlanResult({
  plan, budgetSlot, tasksSlot, risksSlot, resourcesSlot,
}: {
  plan: PlannerOutput
  budgetSlot?: React.ReactNode
  tasksSlot?: React.ReactNode
  risksSlot?: React.ReactNode
  resourcesSlot?: React.ReactNode
}) {
  const t = useTranslations('planner.result')
  const a = plan.section_a_what_you_told_us
  const b = plan.section_b_your_plan
  const c = plan.section_c_budget
  const loc = [a.location.city, a.location.state, a.location.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      {/* Headline + summary */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
        <p className="text-sm font-semibold text-amber-300">{a.activity_type}</p>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{b.headline}</h2>
        {b.summary && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-brand-100">{b.summary}</p>}
        {b.recurrence && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <CalendarClock className="h-3.5 w-3.5" />
            {b.recurrence.cadence_label}
            {b.recurrence.sessions != null ? ` · ${b.recurrence.sessions} sessions` : ''}
          </span>
        )}
      </div>

      {/* What you told us */}
      <div className="card p-5">
        <h3 className="mb-3 font-bold text-slate-900">{t('whatYouToldUs')}</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <span><b className="text-slate-900">{t('guests')}:</b> {a.guest_count}{a.guest_breakdown ? ` (${a.guest_breakdown.kids}+${a.guest_breakdown.adults})` : ''}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {loc}</span>
          {a.budget != null && <span><b className="text-slate-900">{t('budgetTarget')}:</b> {money(a.budget)}</span>}
          {a.special_requirements.length > 0 && <span>{a.special_requirements.join(' · ')}</span>}
        </div>
      </div>

      {/* Your plan — timeline + checklists */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-500" />
          <h3 className="font-bold text-slate-900">{t('yourPlan')}</h3>
        </div>
        <ol className="mb-6 space-y-2">
          {b.timeline.map((p) => (
            <li key={p.phase} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
              <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{p.when}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.goal}</p>
              </div>
            </li>
          ))}
        </ol>
        {tasksSlot ?? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Checklist title={t('prepChecklist')} items={b.preparation_checklist} />
          <Checklist title={t('dayOfChecklist')} items={b.day_of_checklist} />
          <Checklist title={t('afterChecklist')} items={b.after_event_checklist} />
        </div>
        )}
      </div>

      {/* Budget — editable BudgetView in the workspace, read-only card otherwise */}
      {budgetSlot ?? (
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-brand-500" />
            <h3 className="font-bold text-slate-900">{t('budget')}</h3>
          </div>
          {c.is_fallback && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700">{t('fallbackBadge')}</span>
          )}
        </div>

        {c.is_priced && c.estimate ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'likely', 'high'] as const).map((band) => (
                <div key={band} className={`rounded-xl p-3 text-center ${band === 'likely' ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-slate-50'}`}>
                  <p className="text-xs font-medium uppercase text-slate-500">{t(band)}</p>
                  <p className="mt-0.5 text-xl font-extrabold text-slate-900">{money(c.estimate![band], c.currency)}</p>
                </div>
              ))}
            </div>
            {c.per_session && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                {t('perSession')}
                {c.series_total ? ` · ${t('seriesTotal')}: ${money(c.series_total.likely, c.currency)}` : ''}
              </p>
            )}
            {c.levers_note && <p className="mt-3 text-sm text-slate-600">{c.levers_note}</p>}
            {!!c.breakdown?.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t('biggestCosts')}</p>
                <ul className="divide-y divide-slate-100 text-sm">
                  {c.breakdown.slice(0, 8).map((line) => (
                    <li key={line.item_key} className="flex items-center justify-between py-1.5">
                      <span className="text-slate-700">{line.item_key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-slate-900">{money(line.line.likely, c.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}

        {c.fallback_note && (
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {c.fallback_note}
          </p>
        )}
        {c.meta?.disclaimer && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{c.meta.disclaimer}</p>}
      </div>
      )}

      {/* Resources to secure — workspace-only lens (no card on the public planner) */}
      {resourcesSlot}

      {/* Risks — interactive RiskView in the workspace, read-only card otherwise */}
      {risksSlot ?? (
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <h3 className="font-bold text-slate-900">{t('risks')}</h3>
        </div>
        <ul className="space-y-3">
          {plan.section_d_key_risks.risks.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY[r.severity] ?? SEVERITY.low}`}>{r.severity}</span>
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600"><b className="text-slate-700">{t('mitigation')}:</b> {r.mitigation}</p>
            </li>
          ))}
        </ul>
      </div>
      )}

      {/* Ready messages */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-500" />
          <h3 className="font-bold text-slate-900">{t('readyMessages')}</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(plan.section_e_ready_messages)
            .filter(([, m]) => m.text)
            .map(([slot, m]) => (
              <div key={slot} className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{slot.replace(/_/g, ' ')}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.text}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Upgrade path */}
      {plan.section_f_upgrade_path.text && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-bold text-slate-900">{t('upgradePath')}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{plan.section_f_upgrade_path.text}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

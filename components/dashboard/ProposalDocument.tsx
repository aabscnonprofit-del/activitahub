'use client'

import { useTranslations } from 'next-intl'
import {
  CalendarClock, Wallet, ShieldCheck, PackageCheck, ListChecks, MapPin, Users, Info, AlertTriangle,
} from 'lucide-react'
import type { ProposalViewModel } from '@/lib/workspace/proposal'

// ── Proposal Generator V1 — client-facing render (C2) ────────────────────────
// Read-only presentation of a ProposalViewModel. Deterministic; reuses the OPE
// data already in the saved plan. Distinct from the internal SavedPlanView/
// PlanResult (no checklists, ready-messages or upgrade path) — this is the
// outward, client-friendly document.

const money = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

const SEVERITY: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const NEXT_STEPS = ['nextStep1', 'nextStep2', 'nextStep3', 'nextStep4'] as const

export default function ProposalDocument({ vm }: { vm: ProposalViewModel }) {
  const t = useTranslations('proposal')

  if (!vm.ready) {
    const body =
      vm.notReadyReason === 'needs_clarification' ? t('notReadyClarify')
        : vm.notReadyReason === 'unsupported' ? t('notReadyUnsupported')
          : t('notReadyHandoff')
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-amber-800">
          <Info className="h-5 w-5" />
          <h2 className="text-lg font-bold">{t('notReadyTitle')}</h2>
        </div>
        <p className="mt-2 text-sm text-amber-800">{body}</p>
      </div>
    )
  }

  const b = vm.budget

  return (
    <article className="space-y-6 print:space-y-4 [&_section]:break-inside-avoid">
      {/* Header */}
      <header className="break-inside-avoid rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{t('documentTitle')}</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{vm.eventTitle}</h1>
        <p className="mt-1 text-sm text-brand-100">{vm.activityType}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-50">
          {vm.facts.guests != null && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {vm.facts.guests} {t('guests')}
              {vm.facts.guestBreakdown ? ` (${vm.facts.guestBreakdown.kids}+${vm.facts.guestBreakdown.adults})` : ''}
            </span>
          )}
          {vm.facts.location && (
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {vm.facts.location}</span>
          )}
          {vm.facts.cadence && (
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> {vm.facts.cadence}</span>
          )}
        </div>
      </header>

      {/* Overview / Executive Summary */}
      {(vm.summary || vm.facts.budgetTarget != null) && (
        <section className="card p-5">
          <h2 className="mb-2 font-bold text-slate-900">{t('executiveSummary')}</h2>
          {vm.summary && <p className="text-sm leading-relaxed text-slate-700">{vm.summary}</p>}
          {vm.facts.budgetTarget != null && (
            <p className="mt-2 text-sm text-slate-500">
              {t('budgetTarget')}: <b className="text-slate-700">{money(vm.facts.budgetTarget, b?.currency)}</b>
            </p>
          )}
        </section>
      )}

      {/* Event timeline */}
      {vm.timeline.length > 0 && (
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-500" />
            <h2 className="font-bold text-slate-900">{t('timeline')}</h2>
          </div>
          <ol className="space-y-2">
            {vm.timeline.map((p) => (
              <li key={p.phase} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{p.when}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.goal}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Investment / Budget */}
      {b && (
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-brand-500" />
            <h2 className="font-bold text-slate-900">{t('budget')}</h2>
          </div>
          {b.priced ? (
            <>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{t('estimatedRange')}</p>
              <div className="grid grid-cols-3 gap-3">
                {([['low', b.low], ['likely', b.likely], ['high', b.high]] as const).map(([k, v]) => (
                  <div key={k} className={`rounded-xl p-3 text-center ${k === 'likely' ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-slate-50'}`}>
                    <p className="text-xs font-medium uppercase text-slate-500">{t(k)}</p>
                    <p className="mt-0.5 text-xl font-extrabold text-slate-900">{money(v, b.currency)}</p>
                  </div>
                ))}
              </div>
              {b.perSession && (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {t('perSession')}
                  {b.seriesTotalLikely != null ? ` · ${t('seriesTotal')}: ${money(b.seriesTotalLikely, b.currency)}` : ''}
                </p>
              )}
              {b.contingencyPct != null && b.contingencyPct > 0 && (
                <p className="mt-2 text-xs text-slate-500">{t('contingencyNote', { pct: b.contingencyPct })}</p>
              )}
              {b.drivers.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t('keyCosts')}</p>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {b.drivers.map((d) => (
                      <li key={d.label} className="flex items-center justify-between py-1.5">
                        <span className="text-slate-700">{d.label}</span>
                        <span className="font-medium text-slate-900">{money(d.amount, b.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">{t('budgetUnpriced')}</p>
          )}
          {b.note && (
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />{b.note}
            </p>
          )}
        </section>
      )}

      {/* Included services / resources */}
      {vm.included.length > 0 && (
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-brand-500" />
            <h2 className="font-bold text-slate-900">{t('included')}</h2>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {vm.included.map((it) => (
              <li key={it.label} className="flex items-start gap-2 text-sm capitalize text-slate-700">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                {it.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Risk assessment — framed as "what we've planned for" */}
      {vm.risks.length > 0 && (
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <h2 className="font-bold text-slate-900">{t('risks')}</h2>
          </div>
          <ul className="space-y-3">
            {vm.risks.map((r) => (
              <li key={r.name} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY[r.severity] ?? SEVERITY.low}`}>{r.severity}</span>
                  <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600"><b className="text-slate-700">{t('mitigation')}:</b> {r.mitigation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Next steps */}
      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-brand-600" />
          <h2 className="font-bold text-slate-900">{t('nextStepsTitle')}</h2>
        </div>
        <ol className="space-y-2">
          {NEXT_STEPS.map((k, i) => (
            <li key={k} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{t(k)}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-slate-400">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{t('disclaimer')}
      </p>
    </article>
  )
}

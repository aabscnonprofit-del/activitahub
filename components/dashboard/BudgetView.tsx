'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Wallet, Pencil, Loader2, RotateCcw, Check, X, Info } from 'lucide-react'
import { saveCorrections } from '@/lib/actions/opePlans'
import { applyBudgetCorrections } from '@/lib/workspace/budget-overlay'
import type { SavedPlan, OpePlanCorrections } from '@/lib/types'

// WP6 — Editable budget lens. Renders the budget card through the correction
// overlay (applyBudgetCorrections) so totals/bands always reflect the organizer's
// line edits, and lets them override any line's low/likely/high. Saving calls
// saveCorrections() (current-plan-only; the engine + seed pricing are never
// touched) and lifts the updated SavedPlan so the readiness strip recomputes too.
// Reset drops a line's override. Replaces PlanResult's read-only budget card via
// its `budgetSlot` prop.

const money = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

const BANDS = ['low', 'likely', 'high'] as const

export default function BudgetView({ plan, onUpdated, editable = true }: { plan: SavedPlan; onUpdated: (p: SavedPlan) => void; editable?: boolean }) {
  const t = useTranslations('planner.result')
  const tw = useTranslations('workspace')

  const original = plan.result.plan?.section_c_budget
  const c = original ? applyBudgetCorrections(original, plan.corrections) : undefined

  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ low: string; likely: string; high: string }>({ low: '', likely: '', high: '' })
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!c) return null

  const correctedLines = plan.corrections?.budget_lines ?? {}
  const isCorrected = (key: string) => Object.prototype.hasOwnProperty.call(correctedLines, key)

  function startEdit(key: string, line: { low: number; likely: number; high: number }) {
    setError('')
    setEditing(key)
    setDraft({ low: String(line.low), likely: String(line.likely), high: String(line.high) })
  }

  async function persist(next: OpePlanCorrections, key: string) {
    setBusyKey(key)
    setError('')
    try {
      const res = await saveCorrections(plan.id, next)
      if (res.success && res.data) {
        onUpdated(res.data)
        setEditing(null)
      } else {
        setError(tw('errSaveCorrection'))
      }
    } catch {
      setError(tw('errSaveCorrection'))
    } finally {
      setBusyKey(null)
    }
  }

  function saveLine(key: string) {
    const parsed = BANDS.map((b) => Math.round(Number(draft[b])))
    if (parsed.some((n) => !Number.isFinite(n) || n < 0)) { setError(tw('errSaveCorrection')); return }
    const [low, likely, high] = parsed
    const lines = { ...correctedLines, [key]: { low, likely, high } }
    persist({ ...plan.corrections, budget_lines: lines }, key)
  }

  function resetLine(key: string) {
    const lines = { ...correctedLines }
    delete lines[key]
    persist({ ...plan.corrections, budget_lines: lines }, key)
  }

  // Unpriced budgets stay informational — nothing to override.
  if (!c.is_priced || !c.estimate) {
    return (
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-brand-500" />
          <h3 className="font-bold text-slate-900">{t('budget')}</h3>
        </div>
        {c.fallback_note && (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {c.fallback_note}
          </p>
        )}
      </div>
    )
  }

  // Every line is editable; show biggest first (matches the read-only "biggest costs").
  const lines = [...(c.breakdown ?? [])].sort((a, b) => b.line.likely - a.line.likely)

  return (
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

      <div className="grid grid-cols-3 gap-3">
        {BANDS.map((band) => (
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

      {!!lines.length && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t('biggestCosts')}</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {lines.map((line) => {
              const corrected = isCorrected(line.item_key)
              const busy = busyKey === line.item_key
              if (editable && editing === line.item_key) {
                return (
                  <li key={line.item_key} className="py-2.5">
                    <p className="mb-2 font-medium text-slate-700">{line.item_key.replace(/_/g, ' ')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {BANDS.map((band) => (
                        <div key={band}>
                          <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-400">{t(band)}</label>
                          <input
                            type="number" min="0" inputMode="numeric"
                            value={draft[band]}
                            onChange={(e) => setDraft((d) => ({ ...d, [band]: e.target.value }))}
                            className="input-base py-1.5 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => saveLine(line.item_key)} disabled={busy} className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {tw('save')}
                      </button>
                      <button onClick={() => { setEditing(null); setError('') }} disabled={busy} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50">
                        <X className="h-3.5 w-3.5" /> {tw('cancel')}
                      </button>
                    </div>
                  </li>
                )
              }
              return (
                <li key={line.item_key} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <span className="truncate">{line.item_key.replace(/_/g, ' ')}</span>
                    {corrected && (
                      <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-700">{tw('edited')}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-medium text-slate-900">{money(line.line.likely, c.currency)}</span>
                    {editable && corrected && (
                      <button onClick={() => resetLine(line.item_key)} disabled={busy} title={tw('reset')} className="text-slate-400 hover:text-slate-700 disabled:opacity-50">
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {editable && (
                      <button onClick={() => startEdit(line.item_key, line.line)} title={tw('editLine')} className="text-slate-400 hover:text-brand-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {editable && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {tw('budgetCorrectionNote')}
        </p>
      )}

      {c.fallback_note && (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          {c.fallback_note}
        </p>
      )}
      {c.meta?.disclaimer && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{c.meta.disclaimer}</p>}
    </div>
  )
}

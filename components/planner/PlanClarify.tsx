'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { HelpCircle, ArrowRight, Loader2 } from 'lucide-react'
import type { ClarificationQuestion } from '@/lib/ope'

// Surfaces the Clarification loop: a few high-value questions the engine needs
// before it will plan (UNKNOWN → ASK). The question text comes from the engine
// (English, like all generated content); the chrome labels are localized.

export default function PlanClarify({
  questions,
  loading,
  onSubmit,
}: {
  questions: ClarificationQuestion[]
  loading: boolean
  onSubmit: (answers: Record<string, string>) => void
}) {
  const t = useTranslations('planner.result')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const set = (field: string, v: string) => setAnswers((a) => ({ ...a, [field]: v }))
  const ready = questions.every((q) => (answers[q.field] ?? '').trim() !== '')

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-brand-600" />
        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
          {t('clarifyBadge')}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">{t('clarifyTitle')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('clarifySubtitle')}</p>

      <div className="mt-5 space-y-5">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="label-base">{q.question}</label>
            {q.kind === 'choice' ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {q.options?.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set(q.field, o.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      answers[q.field] === o.value
                        ? 'border-brand-300 bg-white text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder={q.placeholder}
                value={answers[q.field] ?? ''}
                onChange={(e) => set(q.field, e.target.value)}
                className="input-base mt-1"
              />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!ready || loading}
        onClick={() => onSubmit(answers)}
        className="btn-primary mt-6 w-full px-7 py-3 text-base disabled:opacity-50 sm:w-auto"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {t('clarifyContinue')}
      </button>
    </div>
  )
}

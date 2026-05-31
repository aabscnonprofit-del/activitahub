'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { CheckCircle2, XCircle, Award } from 'lucide-react'
import { submitExam, type ExamState } from '@/lib/actions/exam'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils'
import type { Exam, Locale } from '@/lib/types'

const initialState: ExamState = { ok: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('exam')
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? t('grading') : t('submit')}
    </button>
  )
}

export function ExamForm({ exam, locale }: { exam: Exam; locale: Locale }) {
  const t = useTranslations('exam')
  const [rawState, formAction] = useFormState(submitExam, initialState)
  const state = rawState ?? initialState
  const [answers, setAnswers] = useState<Record<string, string[]>>({})

  function select(questionId: string, optionId: string, multiple: boolean) {
    setAnswers((prev) => {
      if (!multiple) return { ...prev, [questionId]: [optionId] }
      const current = new Set(prev[questionId] ?? [])
      if (current.has(optionId)) current.delete(optionId)
      else current.add(optionId)
      return { ...prev, [questionId]: [...current] }
    })
  }

  // Passed → success screen with certificate link.
  if (state.ok && state.result?.passed) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <Award className="mx-auto mb-3 h-12 w-12 text-green-500" aria-hidden="true" />
        <h2 className="text-xl font-bold text-green-900">{t('passedTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-green-800">
          {t('passedBody', { score: state.result.score })}
        </p>
        <Link
          href={`/${locale}/academy/certificate`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          <Award className="h-4 w-4" aria-hidden="true" />
          {t('viewCertificate')}
        </Link>
      </div>
    )
  }

  const answeredCount = exam.questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length
  const allAnswered = answeredCount === exam.questions.length

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="quizId" value={exam.id} />
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />

      {state.error && <Alert variant="error" message={state.error} />}
      {state.ok && state.result && !state.result.passed && (
        <Alert
          variant="error"
          message={t('failed', {
            score: state.result.score,
            passing: state.result.passing_score,
          })}
        />
      )}

      {exam.questions.map((q, i) => {
        const multiple = q.type === 'multiple_choice'
        const selected = answers[q.id] ?? []
        return (
          <fieldset key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-600">
              {t('question', { n: i + 1, total: exam.questions.length })}
            </legend>
            <p className="mb-4 font-semibold text-slate-900">{q.prompt}</p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = selected.includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                      isSelected
                        ? 'border-brand-400 bg-brand-50 text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`q_${q.id}`}
                      checked={isSelected}
                      onChange={() => select(q.id, opt.id, multiple)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {opt.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )
      })}

      <div className="flex items-center gap-4">
        <SubmitButton />
        <span className="text-sm text-slate-500">
          {allAnswered ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t('allAnswered')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <XCircle className="h-4 w-4 text-slate-300" aria-hidden="true" />
              {t('answeredCount', { answered: answeredCount, total: exam.questions.length })}
            </span>
          )}
        </span>
      </div>
    </form>
  )
}

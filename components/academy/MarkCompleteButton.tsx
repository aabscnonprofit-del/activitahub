'use client'

import { useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import { CheckCircle2, ArrowRight } from 'lucide-react'

/**
 * Submit button for the "mark lesson complete" form. Uses form pending state.
 * When the lesson is already complete it reads as "Continue" (the action still
 * advances the student to the next lesson).
 */
export function MarkCompleteButton({ completed }: { completed: boolean }) {
  const { pending } = useFormStatus()
  const t = useTranslations('academy')

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        t('saving')
      ) : completed ? (
        <>
          {t('continue')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t('markComplete')}
        </>
      )}
    </button>
  )
}

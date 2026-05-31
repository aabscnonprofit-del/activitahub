'use client'

import { useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ArrowRight, CreditCard } from 'lucide-react'
import { createCertificationCheckout } from '@/lib/actions/billing'
import type { Locale, OnboardingPath } from '@/lib/types'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('onboarding.payment')
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? t('processing') : t('cta')}
      {!pending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  )
}

/**
 * Payment step (onboarding_status === 'path_selected').
 * Submits to the certification Checkout Server Action, which redirects to
 * Stripe Checkout for the user's chosen path.
 */
export function CertificationCheckout({
  locale,
  path,
}: {
  locale: Locale
  path: OnboardingPath
}) {
  const t = useTranslations('onboarding.payment')

  return (
    <div className="mb-8 rounded-2xl border border-brand-200 bg-brand-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100">
          <CreditCard className="h-6 w-6 text-brand-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">{t('title')}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t('subtitle', {
              path: path === 'beginner' ? 'Beginner' : 'Experienced',
            })}
          </p>
          <form action={createCertificationCheckout} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  )
}

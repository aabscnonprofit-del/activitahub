'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { resetPassword } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import type { AuthFormState, Locale } from '@/lib/types'

interface ResetPasswordFormProps {
  locale: Locale
}

const initialState: AuthFormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth.resetPassword')

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  )
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const t = useTranslations('auth.resetPassword')

  const [state, formAction] = useFormState(resetPassword, initialState)

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-7 w-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('successTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t('successDesc', { email: state.email ?? '' })}
          </p>
        </div>
        <Link
          href={`/${locale}/sign-in`}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          {t('backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />

      {state.error && (
        <Alert variant="error" message={state.error} />
      )}

      <Input
        name="email"
        type="email"
        label={t('email')}
        placeholder={t('emailPlaceholder')}
        autoComplete="email"
        required
      />

      <SubmitButton />

      <div className="text-center">
        <Link
          href={`/${locale}/sign-in`}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          ← {t('backToSignIn')}
        </Link>
      </div>
    </form>
  )
}

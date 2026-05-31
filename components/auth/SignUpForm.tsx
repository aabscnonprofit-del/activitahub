'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { signUp } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import type { AuthFormState, Locale } from '@/lib/types'

interface SignUpFormProps {
  locale: Locale
}

const initialState: AuthFormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth.signUp')

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

export function SignUpForm({ locale }: SignUpFormProps) {
  const t = useTranslations('auth.signUp')
  const tCommon = useTranslations('common')
  const [rawState, formAction] = useFormState(signUp, initialState)
  const state = rawState ?? initialState

  // On success, show check-email message instead of the form
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
          <h2 className="text-lg font-semibold text-slate-900">{t('checkEmail')}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t('checkEmailDesc', { email: state.email ?? '' })}
          </p>
        </div>
        <Link
          href={`/${locale}/sign-in`}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          {tCommon('signIn')}
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Hidden locale field — passed to server action */}
      <input type="hidden" name="locale" value={locale} />

      {state.error && (
        <Alert variant="error" message={state.error} />
      )}

      <Input
        name="fullName"
        label={t('fullName')}
        placeholder={t('fullNamePlaceholder')}
        autoComplete="name"
        required
        minLength={1}
        maxLength={100}
      />

      <Input
        name="email"
        type="email"
        label={t('email')}
        placeholder={t('emailPlaceholder')}
        autoComplete="email"
        required
      />

      <Input
        name="password"
        type="password"
        label={t('password')}
        hint={t('passwordHint')}
        autoComplete="new-password"
        required
        minLength={8}
      />

      <SubmitButton />

      <p className="text-center text-xs text-slate-500">{t('termsNotice')}</p>

      <p className="text-center text-sm text-slate-600">
        {t('hasAccount')}{' '}
        <Link
          href={`/${locale}/sign-in`}
          className="font-medium text-brand-600 hover:text-brand-800"
        >
          {t('signInLink')}
        </Link>
      </p>
    </form>
  )
}

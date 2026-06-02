'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { signIn } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import type { AuthFormState, Locale } from '@/lib/types'

interface SignInFormProps {
  locale: Locale
  /** Post-auth destination (organizer intent carries /<locale>/onboarding). */
  next?: string
}

const initialState: AuthFormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth.signIn')

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

export function SignInForm({ locale, next }: SignInFormProps) {
  const t = useTranslations('auth.signIn')
  const [rawState, formAction] = useFormState(signIn, initialState)
  const state = rawState ?? initialState
  const signUpHref = next
    ? `/${locale}/sign-up?next=${encodeURIComponent(next)}`
    : `/${locale}/sign-up`

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <Alert variant="error" message={state.error} />
      )}

      <Input
        name="email"
        type="email"
        label={t('email')}
        placeholder="you@example.com"
        autoComplete="email"
        required
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            {t('password')}
          </label>
          <Link
            href={`/${locale}/reset-password`}
            className="text-xs font-medium text-brand-600 hover:text-brand-800"
          >
            {t('forgotPassword')}
          </Link>
        </div>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-slate-600">
        {t('noAccount')}{' '}
        <Link
          href={signUpHref}
          className="font-medium text-brand-600 hover:text-brand-800"
        >
          {t('signUpLink')}
        </Link>
      </p>
    </form>
  )
}

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { BrandMark } from '@/components/brand/BrandMark'

/**
 * Localized error boundary for the [locale] segment. Catches runtime render
 * errors and offers a retry instead of surfacing a raw stack.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()
  const t = useTranslations('errors.error')

  useEffect(() => {
    // Surface for server/edge log aggregation in production.
    console.error('[locale-error-boundary]', error?.digest ?? '', error?.message)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Link href={`/${locale}`} className="mb-8 flex items-center gap-2">
        <BrandMark size={36} />
        <span className="text-lg font-bold text-slate-900">ActivLife Hub</span>
      </Link>
      <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
      <p className="mx-auto mt-2 max-w-md text-slate-500">{t('body')}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button onClick={reset} className="btn-primary px-6">{t('retry')}</button>
        <Link href={`/${locale}`} className="btn-secondary px-6">{t('home')}</Link>
      </div>
    </div>
  )
}

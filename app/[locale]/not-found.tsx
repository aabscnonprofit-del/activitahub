import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { BrandMark } from '@/components/brand/BrandMark'

/**
 * Localized 404 — rendered by notFound() (unknown locale, missing organizer,
 * unpublished activity, bad slug, …). Friendly exits instead of a dead end.
 */
export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations('errors.notFound')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Link href={`/${locale}`} className="mb-8 flex items-center gap-2">
        <BrandMark size={36} />
        <span className="text-lg font-bold text-slate-900">ActivLife Hub</span>
      </Link>
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{t('title')}</h1>
      <p className="mx-auto mt-2 max-w-md text-slate-500">{t('body')}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={`/${locale}`} className="btn-primary px-6">{t('home')}</Link>
        <Link href={`/${locale}/marketplace`} className="btn-secondary px-6">{t('marketplace')}</Link>
      </div>
    </div>
  )
}

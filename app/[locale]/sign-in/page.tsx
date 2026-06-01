import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { SignInForm } from '@/components/auth/SignInForm'
import { BrandMark } from '@/components/brand/BrandMark'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface SignInPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: SignInPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.signIn' })
  return { title: t('title') }
}

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('auth.signIn')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Logo */}
      <Link href={`/${locale}`} className="mb-2 flex items-center gap-2">
        <BrandMark size={36} priority />
        <span className="text-lg font-bold text-slate-900">ActivLife Hub</span>
      </Link>
      <p className="mb-8 text-sm font-medium text-brand-600">Activate Life Together</p>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
        </div>

        <SignInForm locale={locale} />
      </div>
    </div>
  )
}

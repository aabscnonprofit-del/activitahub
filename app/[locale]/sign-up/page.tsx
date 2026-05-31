import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { SignUpForm } from '@/components/auth/SignUpForm'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface SignUpPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: SignUpPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.signUp' })
  return { title: t('title') }
}

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('auth.signUp')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Logo */}
      <Link href={`/${locale}`} className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <span className="text-sm font-bold text-white">A</span>
        </div>
        <span className="text-lg font-bold text-slate-900">Activita Hub</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
        </div>

        <SignUpForm locale={locale} />
      </div>
    </div>
  )
}

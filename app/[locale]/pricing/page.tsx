import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { Check, Zap } from 'lucide-react'
import type { Locale } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function PricingPage({ params }: Props) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('pricing')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const freeFeatures = [0, 1, 2, 3, 4]
  const proFeatures = [0, 1, 2, 3, 4, 5, 6]

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <div className="flex-1 py-20 bg-slate-50">
        <div className="container-page">
          <div className="text-center mb-14">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
              {t('title')}
            </h1>
            <p className="text-xl text-slate-500 max-w-xl mx-auto">{t('subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free plan */}
            <div className="card p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">
                  {t('free.name')}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">{t('free.price')}</span>
                  <span className="text-slate-400 mb-1.5">/{t('free.period')}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {freeFeatures.map((i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {t(`free.features.${i}` as 'free.features.0')}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/auth/sign-in`}
                className="btn-secondary w-full justify-center text-base py-3"
              >
                {t('free.cta')}
              </Link>
            </div>

            {/* Pro plan */}
            <div className="relative card p-8 flex flex-col border-2 border-indigo-500 shadow-lg shadow-indigo-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  <Zap className="w-3 h-3" /> {t('pro.badge')}
                </span>
              </div>
              <div className="mb-6">
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-1">
                  {t('pro.name')}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">{t('pro.price')}</span>
                  <span className="text-slate-400 mb-1.5">{t('pro.period')}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {proFeatures.map((i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                    {t(`pro.features.${i}` as 'pro.features.0')}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="w-full btn-primary justify-center text-base py-3 opacity-60 cursor-not-allowed"
              >
                {t('pro.cta')}
              </button>
              <p className="text-xs text-slate-400 text-center mt-3">{t('comingSoon')}</p>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter locale={locale} />
    </div>
  )
}

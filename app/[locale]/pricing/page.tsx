import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { Check, Zap, ArrowRight, Lock } from 'lucide-react'
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
  const journeySteps = [0, 1, 2] as const

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1 bg-slate-50">
        <div className="container-page py-16 sm:py-20">
          <div className="mb-12 text-center sm:mb-14">
            <h1 className="text-4xl font-extrabold text-slate-900 lg:text-5xl">
              {t('title')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">{t('subtitle')}</p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
            {/* Free plan */}
            <div className="card flex h-full flex-col p-8">
              <div className="mb-4">
                <p className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">
                  {t('free.name')}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">{t('free.price')}</span>
                  <span className="mb-1.5 text-slate-400">/{t('free.period')}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{t('free.tagline')}</p>
              </div>
              <span className="mb-6 inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {t('free.bestFor')}
              </span>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                {t('free.includesLabel')}
              </p>
              <ul className="mb-8 flex-1 space-y-3">
                {freeFeatures.map((i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {t(`free.features.${i}` as 'free.features.0')}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/sign-up`}
                className="btn-secondary w-full py-3 text-base"
              >
                {t('free.cta')}
              </Link>
            </div>

            {/* Pro plan */}
            <div className="card relative flex h-full flex-col border-2 border-brand-500 p-8 shadow-lg shadow-brand-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white">
                  <Zap className="h-3 w-3" /> {t('pro.badge')}
                </span>
              </div>
              <div className="mb-4">
                <p className="mb-1 text-sm font-bold uppercase tracking-wide text-brand-600">
                  {t('pro.name')}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">{t('pro.price')}</span>
                  <span className="mb-1.5 text-slate-400">{t('pro.period')}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{t('pro.tagline')}</p>
              </div>
              <span className="mb-6 inline-flex w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                {t('pro.bestFor')}
              </span>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                {t('pro.includesLabel')}
              </p>
              <ul className="mb-8 flex-1 space-y-3">
                {proFeatures.map((i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-brand-500" />
                    {t(`pro.features.${i}` as 'pro.features.0')}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/sign-up`}
                className="btn-primary w-full py-3 text-base"
              >
                {t('pro.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t('pro.requirement')}
              </p>
            </div>
          </div>

          {/* ── Post-signup journey ──────────────────────────────────────── */}
          <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
            <h2 className="text-center text-2xl font-extrabold text-slate-900">
              {t('journey.headline')}
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {journeySteps.map((i) => (
                <li key={i} className="card flex items-start gap-3 p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm font-medium text-slate-700">
                    {t(`journey.steps.${i}` as 'journey.steps.0')}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}

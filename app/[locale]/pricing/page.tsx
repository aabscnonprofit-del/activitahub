import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { Check, ArrowRight, Lock, Sparkles, GraduationCap, Briefcase, BadgeCheck, RefreshCw } from 'lucide-react'
import type { Locale } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function PricingPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('pricing')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Carry the product choice into onboarding so the user isn't asked to pick a
  // path again. The path rides inside the (url-encoded) post-auth `next` target;
  // safeNext preserves the query string through sign-up / email confirmation.
  const onboardingHref = (path?: string) =>
    `/${locale}/sign-up?next=${encodeURIComponent(`/${locale}/onboarding${path ? `?path=${path}` : ''}`)}`
  const ctaHref = onboardingHref()
  const plannerHref = `/${locale}/plan-an-event`
  const products = [
    { key: 'planner', icon: Sparkles, features: 3, highlight: false, comingSoon: false, badge: false, requirement: false, subscription: false, ctaHref: plannerHref },
    { key: 'certification', icon: BadgeCheck, features: 3, highlight: false, comingSoon: false, badge: false, requirement: false, subscription: false, ctaHref: onboardingHref('experienced') },
    { key: 'academy', icon: GraduationCap, features: 3, highlight: false, comingSoon: false, badge: false, requirement: false, subscription: false, ctaHref: onboardingHref('beginner') },
    { key: 'platform', icon: Briefcase, features: 12, highlight: true, comingSoon: false, badge: true, requirement: true, subscription: true, ctaHref },
  ] as const

  const journeySteps = [0, 1, 2] as const

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1 bg-slate-50">
        <div className="container-page py-12 sm:py-16 lg:py-20">
          <div className="mb-8 text-center sm:mb-12">
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">{t('title')}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:mt-4 sm:text-lg">{t('subtitle')}</p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => {
              const Icon = p.icon
              const base = `products.${p.key}`
              return (
                <div
                  key={p.key}
                  className={`card relative flex h-full flex-col p-6 sm:p-8 ${
                    p.highlight ? 'border-2 border-brand-500 shadow-lg shadow-brand-100' : ''
                  }`}
                >
                  {p.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white">
                        {t(`${base}.badge` as 'products.platform.badge')}
                      </span>
                    </div>
                  )}

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {t(`${base}.audience` as 'products.planner.audience')}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {t(`${base}.name` as 'products.planner.name')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {t(`${base}.tagline` as 'products.planner.tagline')}
                  </p>

                  <div className="mt-5">
                    {/* Billing-type badge — makes one-time vs recurring obvious */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        p.subscription ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.subscription && <RefreshCw className="h-3 w-3" aria-hidden="true" />}
                      {p.subscription ? t('billing.subscription') : t('billing.oneTime')}
                    </span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {t(`${base}.price` as 'products.planner.price')}
                      </span>
                      {p.subscription && (
                        <span className="text-base font-semibold text-slate-500">{t('perMonth')}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {t(`${base}.priceNote` as 'products.planner.priceNote')}
                    </p>
                  </div>

                  <ul className="mb-8 mt-6 flex-1 space-y-3">
                    {Array.from({ length: p.features }, (_, i) => i).map((i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                        <Check
                          className={`h-4 w-4 shrink-0 ${p.highlight ? 'text-brand-500' : 'text-green-500'}`}
                          aria-hidden="true"
                        />
                        {t(`${base}.features.${i}` as 'products.planner.features.0')}
                      </li>
                    ))}
                  </ul>

                  {p.comingSoon ? (
                    <span className="inline-flex w-full items-center justify-center rounded-lg bg-slate-100 py-3 text-sm font-semibold text-slate-500">
                      {t(`${base}.price` as 'products.planner.price')}
                    </span>
                  ) : (
                    <Link
                      href={p.ctaHref}
                      className={`${p.highlight ? 'btn-primary' : 'btn-secondary'} w-full py-3 text-base`}
                    >
                      {t(`${base}.cta` as 'products.academy.cta')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {p.requirement && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {t(`${base}.requirement` as 'products.platform.requirement')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Post-signup journey ──────────────────────────────────────── */}
          <div className="mx-auto mt-12 max-w-4xl sm:mt-16 lg:mt-20">
            <h2 className="text-center text-2xl font-extrabold text-slate-900">{t('journey.headline')}</h2>
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

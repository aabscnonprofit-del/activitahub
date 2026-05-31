import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { GraduationCap, Briefcase, Store, ArrowRight } from 'lucide-react'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home.hero' })
  return {
    title: `${t('title')} ${t('titleAccent')}`,
    description: t('subtitle'),
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('home')

  // Check auth state to show correct header CTA
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pillars = [
    {
      key: 'organizer',
      title: t('pillars.organizer.title'),
      description: t('pillars.organizer.description'),
      icon: Briefcase,
      color: 'bg-brand-50 text-brand-600',
    },
    {
      key: 'academy',
      title: t('pillars.academy.title'),
      description: t('pillars.academy.description'),
      icon: GraduationCap,
      color: 'bg-green-50 text-green-600',
    },
    {
      key: 'marketplace',
      title: t('pillars.marketplace.title'),
      description: t('pillars.marketplace.description'),
      icon: Store,
      color: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-700 to-brand-900 px-4 py-24 text-white sm:py-32">
          {/* Background decoration */}
          <div
            className="absolute inset-0 opacity-10"
            aria-hidden="true"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 0%, white 0%, transparent 60%)',
            }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100">
              {t('hero.badge')}
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              {t('hero.title')}{' '}
              <span className="text-amber-300">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
              {t('hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/sign-up`}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-8 py-4 text-base font-bold text-slate-900 shadow-lg hover:bg-amber-300 transition-colors"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Three Pillars ─────────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                {t('pillars.headline')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-slate-500">
                {t('pillars.subheadline')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon
                return (
                  <div
                    key={pillar.key}
                    className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${pillar.color}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">
                      {pillar.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {pillar.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              {t('cta.subtitle')}
            </p>
            <Link
              href={`/${locale}/sign-up`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-base font-bold text-white hover:bg-brand-400 transition-colors"
            >
              {t('cta.button')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}

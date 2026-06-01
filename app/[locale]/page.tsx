import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { ProgressionPath } from '@/components/marketing/ProgressionPath'
import {
  GraduationCap, Briefcase, Store, ArrowRight,
  ShieldCheck, BadgeCheck, Globe, CalendarCheck,
  Lock, HeartHandshake, Users,
} from 'lucide-react'
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

  const trust = [
    { icon: ShieldCheck, label: t('trust.secure') },
    { icon: BadgeCheck, label: t('trust.certified') },
    { icon: Globe, label: t('trust.languages') },
    { icon: CalendarCheck, label: t('trust.cancel') },
  ]

  const trustband = [
    { icon: BadgeCheck, i: 0 },
    { icon: Lock, i: 1 },
    { icon: HeartHandshake, i: 2 },
    { icon: Globe, i: 3 },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900 px-4 pb-20 pt-20 text-white sm:pb-28 sm:pt-28">
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
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {t('hero.badge')}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              {t('hero.title')}{' '}
              <span className="text-amber-300">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mt-5 text-lg font-semibold text-amber-300 sm:text-xl">
              Activate Life Together
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-brand-100">
              {t('hero.subtitle')}
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/sign-up`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-8 py-4 text-base font-bold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 sm:w-auto"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/marketplace`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/20 sm:w-auto"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust strip ────────────────────────────────────────────────── */}
        <section className="border-b border-slate-200 bg-white">
          <div className="container-page py-6">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center justify-center gap-2.5 text-center">
                  <Icon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Progression path: Discover → Participate → Learn → Organize → Certify ── */}
        <ProgressionPath locale={locale} />

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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {pillars.map((pillar) => {
                const Icon = pillar.icon
                return (
                  <div
                    key={pillar.key}
                    className="card card-hover p-8"
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

        {/* ── Built on trust ────────────────────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                {t('trustband.headline')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-slate-500">
                {t('trustband.subheadline')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trustband.map(({ icon: Icon, i }) => (
                <div key={i} className="card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">
                    {t(`trustband.items.${i}.title` as 'trustband.items.0.title')}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {t(`trustband.items.${i}.description` as 'trustband.items.0.description')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Community ─────────────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-brand-50 to-amber-50 px-6 py-14 text-center ring-1 ring-brand-100 sm:px-12">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t('community.headline')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              {t('community.body')}
            </p>
            <Link
              href={`/${locale}/sign-up`}
              className="btn-primary mt-8 px-7 py-3 text-base"
            >
              {t('community.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              {t('cta.subtitle')}
            </p>
            <Link
              href={`/${locale}/sign-up`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-brand-400"
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

import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { BuyEventLicenseButton } from '@/components/planner/BuyEventLicenseButton'
import { ProgressionPath } from '@/components/marketing/ProgressionPath'
import { HeroBackground } from '@/components/marketing/HeroBackground'
import { GlobeVisual } from '@/components/marketing/GlobeVisual'
import { CATEGORY_GROUPS, CATEGORIES_BY_GROUP, GROUP_ACCENT } from '@/lib/categories'
import {
  Briefcase, Store, ArrowRight, Check,
  BadgeCheck, Globe, CalendarCheck,
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
  const tMarket = await getTranslations('marketplace')

  // Check auth state to show correct header CTA
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Certified organizers see the same page, but conversion CTAs become "Go to dashboard".
  const viewer = await getViewerCtaState(supabase)
  const tOrg = await getTranslations('organizerCta')
  const orgCtaHref = `/${locale}/dashboard`

  const trustband = [
    { icon: BadgeCheck, i: 0 },
    { icon: Lock, i: 1 },
    { icon: HeartHandshake, i: 2 },
    { icon: Globe, i: 3 },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-16 pt-14 text-white sm:pb-24 sm:pt-24">
          {/* Cinematic golden-hour photo background + readability overlay */}
          <HeroBackground />

          <div className="relative z-10 mx-auto max-w-4xl text-center [text-shadow:0_1px_14px_rgba(0,0,0,0.35)]">
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Users className="h-4 w-4" aria-hidden="true" />
              {t('hero.badge')}
            </p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t('hero.title')}{' '}
              <span className="text-amber-300">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mt-4 text-base font-semibold text-amber-300 sm:mt-5 sm:text-xl">
              Activate Life Together
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
              {t('hero.subtitle')}
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                href={`/${locale}/marketplace`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-base sm:px-8 sm:py-4 font-bold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 sm:w-auto"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/plan-an-event`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-base sm:px-8 sm:py-4 font-semibold text-white transition-colors hover:bg-white/20 sm:w-auto"
              >
                {t('planner.cta')}
              </Link>
              <Link
                href={viewer.isOrganizer ? orgCtaHref : `/${locale}/become-an-organizer`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-base sm:px-8 sm:py-4 font-semibold text-white transition-colors hover:bg-white/20 sm:w-auto"
              >
                {viewer.isOrganizer ? tOrg('dashboard') : t('hero.ctaSecondary')}
              </Link>
            </div>
            <p className="mt-5 text-sm text-white/75">{t('hero.reassure')}</p>
          </div>
        </section>

        {/* ── Activities / Discover (raised directly below hero) ────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center sm:mb-14">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-600">
                {t('discover.eyebrow')}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
                {t('discover.headline')}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
                {t('discover.subheadline')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {CATEGORY_GROUPS.map((g) => (
                <div key={g} className="card p-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    {tMarket(`groups.${g}.name` as 'groups.personal.name')}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {tMarket(`groups.${g}.tagline` as 'groups.personal.tagline')}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {CATEGORIES_BY_GROUP[g].map((c) => {
                      const Icon = c.icon
                      return (
                        <Link
                          key={c.key}
                          href={`/${locale}/marketplace?category=${c.key}`}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 ${GROUP_ACCENT[g]}`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {tMarket(`categories.${c.key}` as 'categories.birthday')}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href={`/${locale}/marketplace`} className="btn-primary px-7 py-3">
                {t('discover.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Activity Planner (consumer, available) ────────────────────── */}
        <section className="px-4 pt-10 sm:pt-14">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{t('planner.headline')}</p>
                <p className="text-sm text-slate-600">
                  {t('planner.body')}{' '}
                  <span className="font-semibold text-slate-900">{t('planner.price')}</span>
                </p>
              </div>
            </div>
            {/* One Event License — the $9.99 planner CTA goes to platform checkout. */}
            <BuyEventLicenseButton locale={locale} buttonClassName="btn-secondary shrink-0 px-6 py-2.5" />
          </div>
        </section>

        {/* ── Become an Organizer (two-column: lifestyle photo + warm sunset CTA) ─────── */}
        <section className="px-4 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl shadow-xl ring-1 ring-amber-200/60 md:grid-cols-2">
            {/*
              Left — high-quality lifestyle PHOTOGRAPH (real people, warm event atmosphere).
              Temporary royalty-free stock image via the Unsplash CDN (a CSS background so no remote-image
              config / <img> lint is needed); the warm `bg-amber-300` base shows if the URL is unavailable.
              Replace with a curated/self-hosted photo (e.g. public/marketing/become-organizer.jpg).
            */}
            <div
              className="relative min-h-[300px] bg-amber-300 bg-cover bg-center md:min-h-[480px]"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80')",
              }}
              role="img"
              aria-label="Two people hosting a warm gathering that brings people together"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-orange-950/35 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-orange-600/25" />
            </div>

            {/* Right — warm sunset / terracotta CTA panel */}
            <div className="flex flex-col justify-center bg-gradient-to-br from-amber-500 via-orange-500 to-orange-700 px-7 py-11 text-white sm:px-10 sm:py-14 lg:px-14">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100 sm:text-sm">
                {t('mission.subheadline')}
              </p>
              <h2 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                Become an Organizer
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
                {t('mission.body')}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={viewer.isOrganizer ? orgCtaHref : `/${locale}/become-an-organizer`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-orange-700 shadow-sm transition-colors hover:bg-amber-50"
                >
                  {viewer.isOrganizer ? tOrg('dashboard') : t('becomeOrganizer.cta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href={`/${locale}/plan-an-event`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/10 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {t('planner.cta')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Globe — worldwide reach (real stylized blue planet, not an icon) ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white px-4 py-16 sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
            {/* The planet */}
            <div className="order-1 flex justify-center md:order-none">
              <GlobeVisual className="h-64 w-64 sm:h-80 sm:w-80 lg:h-[26rem] lg:w-[26rem]" />
            </div>
            {/* Copy */}
            <div className="text-center md:text-left">
              <p className="text-sm font-bold uppercase tracking-wide text-sky-600">Worldwide</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Organizers activating life, everywhere
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg md:mx-0">
                From a neighborhood gathering to a large-scale event, ActivLife Hub helps organizers bring
                people together across cities and around the world.
              </p>
              <Link
                href={`/${locale}/marketplace`}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-7 py-3.5 font-bold text-white shadow-sm transition-colors hover:bg-sky-500"
              >
                {t('discover.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Progression path: Discover → Participate → Learn → Organize → Certify ── */}
        <ProgressionPath locale={locale} />

        {/* ── Two paths: Join vs Organize (customer vs organizer clarity) ── */}
        <section className="px-4 py-14 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center sm:mb-14">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
                {t('audience.headline')}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
                {t('audience.subheadline')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {/* Join activities — participants */}
              <div className="card flex flex-col p-6 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Store className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="mt-5 inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  {t('audience.join.badge')}
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{t('audience.join.title')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('audience.join.description')}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                      {t(`audience.join.points.${i}` as 'audience.join.points.0')}
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}/marketplace`} className="btn-secondary mt-7 w-full">
                  {t('audience.join.cta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Organize activities — organizers (primary path) */}
              <div className="card flex flex-col p-6 sm:p-8 ring-2 ring-brand-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Briefcase className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="mt-5 inline-flex w-fit rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {t('audience.organize.badge')}
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{t('audience.organize.title')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('audience.organize.description')}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                      {t(`audience.organize.points.${i}` as 'audience.organize.points.0')}
                    </li>
                  ))}
                </ul>
                <Link href={viewer.isOrganizer ? orgCtaHref : `/${locale}/become-an-organizer`} className="btn-primary mt-7 w-full">
                  {viewer.isOrganizer ? tOrg('dashboard') : t('audience.organize.cta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Academy teaser ────────────────────────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <BadgeCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
              {t('academyTeaser.headline')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
              {t('academyTeaser.subheadline')}
            </p>
            <Link href={`/${locale}/academy`} className="btn-primary mt-7 px-7 py-3">
              {t('academyTeaser.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Built on trust ────────────────────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center sm:mb-14">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
                {t('trustband.headline')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 sm:text-lg">
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
        <section className="px-4 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-brand-50 to-amber-50 px-5 py-10 text-center ring-1 ring-brand-100 sm:px-12 sm:py-14">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
              {t('community.headline')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
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
        <section className="bg-slate-900 px-4 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
              {t('cta.subtitle')}
            </p>
            <Link
              href={viewer.isOrganizer ? orgCtaHref : `/${locale}/become-an-organizer`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base sm:px-8 sm:py-4 font-bold text-white shadow-lg transition-colors hover:bg-brand-400"
            >
              {viewer.isOrganizer ? tOrg('dashboard') : t('cta.button')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}

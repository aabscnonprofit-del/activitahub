import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import {
  ArrowRight, Users, CalendarCheck, GraduationCap, BadgeCheck, Wallet, ShieldCheck,
} from 'lucide-react'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'becomeOrganizerPage.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function BecomeAnOrganizerPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('becomeOrganizerPage')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const cards = [
    { icon: Users, key: 'why' },
    { icon: CalendarCheck, key: 'ope' },
    { icon: GraduationCap, key: 'academy' },
    { icon: BadgeCheck, key: 'certification' },
    { icon: Wallet, key: 'income' },
    { icon: ShieldCheck, key: 'trust' },
  ] as const

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/sign-up?next=/${locale}/onboarding`}
                className="btn-primary w-full px-7 py-3.5 sm:w-auto"
              >
                {t('hero.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={`/${locale}/academy`} className="btn-secondary w-full px-7 py-3.5 sm:w-auto">
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── The path ──────────────────────────────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('path.headline')}</h2>
            <ol className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="card flex flex-col items-center gap-2 p-4 text-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {t(`path.steps.${i}` as 'path.steps.0')}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Value cards ───────────────────────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ icon: Icon, key }) => (
              <div key={key} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900">
                  {t(`${key}.headline` as 'why.headline')}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {t(`${key}.body` as 'why.body')}
                </p>
                {key === 'academy' && (
                  <Link
                    href={`/${locale}/academy`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {t('academy.cta')}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing reference ─────────────────────────────────────────── */}
        <section className="px-4 pb-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="font-bold text-slate-900">{t('pricing.headline')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('pricing.body')}</p>
            </div>
            <Link
              href={`/${locale}/pricing`}
              className="btn-secondary shrink-0 px-6 py-2.5"
            >
              {t('pricing.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t('cta.headline')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">{t('cta.body')}</p>
            <Link
              href={`/${locale}/sign-up?next=/${locale}/onboarding`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-lg transition-colors hover:bg-brand-400"
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

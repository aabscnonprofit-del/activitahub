import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import {
  ArrowRight, Shuffle, Sparkles, Check, GraduationCap,
  LayoutDashboard, Store, FileText, Ticket, CreditCard, Star, CalendarDays, Bell, BarChart3,
  Mail, Share2, Send, MessageCircle,
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

// Icons for the verified, already-live capabilities (one per `today.items` entry).
const TODAY_ICONS = [
  LayoutDashboard, Store, FileText, Ticket, CreditCard, Star, CalendarDays, Bell, BarChart3,
] as const
// Icons for the upcoming, not-yet-built tools (one per `roadmap.items` entry).
const ROADMAP_ICONS = [Bell, Mail, Share2, Send, MessageCircle, Sparkles] as const

export default async function BecomeAnOrganizerPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('becomeOrganizerPage')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1">
        {/* ── Hero: a platform for activity organizers ──────────────────── */}
        <section className="bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t('hero.badge')}
            </p>
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
              <Link href={`/${locale}/pricing`} className="btn-secondary w-full px-7 py-3.5 sm:w-auto">
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stop jumping between 10 different tools ────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Shuffle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('tools.headline')}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              {t('tools.body')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-500"
                >
                  {t(`tools.items.${i}` as 'tools.items.0')}
                </span>
              ))}
            </div>
            <p className="mx-auto mt-7 max-w-2xl text-base font-semibold text-slate-900 sm:text-lg">
              {t('tools.conclusion')}
            </p>
          </div>
        </section>

        {/* ── What ActivLife Hub helps automate today (live features) ────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('today.headline')}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
                {t('today.subheadline')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {TODAY_ICONS.map((Icon, i) => (
                <div key={i} className="card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">
                    {t(`today.items.${i}.title` as 'today.items.0.title')}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {t(`today.items.${i}.body` as 'today.items.0.body')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Organizer Automation Roadmap (Coming Soon) ────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                {t('roadmap.badge')}
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {t('roadmap.headline')}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
                {t('roadmap.subheadline')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ROADMAP_ICONS.map((Icon, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl border border-dashed border-slate-300 bg-white p-6"
                >
                  <span className="absolute right-4 top-4 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t('roadmap.badge')}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">
                    {t(`roadmap.items.${i}.title` as 'roadmap.items.0.title')}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {t(`roadmap.items.${i}.body` as 'roadmap.items.0.body')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why organizers join ActivLife Hub ─────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('why.headline')}</h2>
            <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl bg-white p-4 text-left text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  {t(`why.items.${i}` as 'why.items.0')}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Certification · Academy · pathway (kept, now secondary) ───── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('learn.headline')}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              {t('learn.body')}
            </p>
            <ol className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="card flex flex-col items-center gap-2 p-4 text-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {t(`learn.steps.${i}` as 'learn.steps.0')}
                  </span>
                </li>
              ))}
            </ol>
            <Link href={`/${locale}/academy`} className="btn-secondary mt-8 px-7 py-3">
              {t('learn.academyCta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Pricing reference (unchanged) ─────────────────────────────── */}
        <section className="px-4 pb-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="font-bold text-slate-900">{t('pricing.headline')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('pricing.body')}</p>
            </div>
            <Link href={`/${locale}/pricing`} className="btn-secondary shrink-0 px-6 py-2.5">
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

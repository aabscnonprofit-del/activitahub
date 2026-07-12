import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import {
  HardHat, ArrowRight, UserPlus, CheckCircle2, Sparkles,
  UtensilsCrossed, Wine, Car, Drama, SprayCan, GraduationCap, Compass, Handshake, ClipboardList,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'workPage.meta' })
  return { title: t('title'), description: t('description') }
}

// Public worker onboarding entry. CTA → /dashboard/worker-profile when signed in,
// else → sign-up. No DB / staffing / search / payments / ratings here.
const ROLES = [
  { key: 'waiter', Icon: UtensilsCrossed },
  { key: 'bartender', Icon: Wine },
  { key: 'driver', Icon: Car },
  { key: 'stage_crew', Icon: Drama },
  { key: 'cleaner', Icon: SprayCan },
  { key: 'instructor', Icon: GraduationCap },
  { key: 'guide', Icon: Compass },
  { key: 'assistant', Icon: Handshake },
  { key: 'coordinator', Icon: ClipboardList },
] as const

const STEP_ICONS = [UserPlus, Sparkles, CheckCircle2] as const

export default async function WorkPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('workPage')

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const { data: { user } } = await supabase.auth.getUser()

  const ctaHref = user ? `/${locale}/dashboard/worker-profile` : `/${locale}/sign-up`
  const ctaLabel = user ? t('ctaLoggedIn') : t('cta')

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />
      <main className="flex-1 bg-slate-50">
        {/* Hero */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              <HardHat className="h-4 w-4" />{t('hero.badge')}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t('hero.title')}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">{t('hero.subtitle')}</p>
            <Link href={ctaHref} className="btn-primary mt-7 inline-flex items-center gap-2 text-base">
              {ctaLabel}<ArrowRight className="h-4 w-4" />
            </Link>
            {!user && <p className="mt-3 text-xs text-slate-400">{t('hero.signinHint')}</p>}
          </div>
        </section>

        {/* Roles */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">{t('rolesTitle')}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">{t('rolesSubtitle')}</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ROLES.map(({ key, Icon }) => (
              <div key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-800">{t(`roles.${key}` as 'roles.waiter')}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">{t('rolesMore')}</p>
        </section>

        {/* How it works */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-14">
            <h2 className="text-center text-2xl font-bold text-slate-900">{t('stepsTitle')}</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {(['create', 'invited', 'work'] as const).map((step, i) => {
                const Icon = STEP_ICONS[i]
                return (
                  <div key={step} className="text-center">
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-3 font-semibold text-slate-900">{t(`steps.${step}.title` as 'steps.create.title')}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t(`steps.${step}.desc` as 'steps.create.desc')}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900">{t('bottomCta.title')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">{t('bottomCta.subtitle')}</p>
          <Link href={ctaHref} className="btn-primary mt-6 inline-flex items-center gap-2 text-base">
            {ctaLabel}<ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

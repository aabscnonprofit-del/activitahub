import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, LogOut, Info } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { PathSelector } from '@/components/onboarding/PathSelector'
import { CertificationCheckout } from '@/components/onboarding/CertificationCheckout'
import { BrandMark } from '@/components/brand/BrandMark'
import type { Locale, Profile } from '@/lib/types'
import type { Metadata } from 'next'

interface OnboardingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: OnboardingPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'onboarding' })
  return { title: t('title') }
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('onboarding')
  const tNav = await getTranslations('nav')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware guarantees user is authenticated, but be defensive
  if (!user) {
    redirect(`/${locale}/sign-in`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_status, selected_path, full_name')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as Pick<
    Profile,
    'role' | 'onboarding_status' | 'selected_path' | 'full_name'
  > | null

  // Already subscribed certified organizers shouldn't be here
  if (
    typedProfile?.role === 'certified_organizer' &&
    typedProfile.onboarding_status === 'subscribed'
  ) {
    redirect(`/${locale}/dashboard`)
  }

  // Certified but not subscribed — go to billing
  if (typedProfile?.onboarding_status === 'certified') {
    redirect(`/${locale}/billing`)
  }

  // payment_complete → they paid but haven't certified yet
  // Academy handles the next step (Phase 3A will add this redirect)
  if (
    typedProfile?.onboarding_status === 'payment_complete' ||
    typedProfile?.onboarding_status === 'payment_pending'
  ) {
    redirect(`/${locale}/academy`)
  }

  const firstName = typedProfile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-slate-900 transition-colors hover:text-brand-600"
          >
            <BrandMark size={32} />
            <span className="font-bold">ActivLife Hub</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/${locale}/marketplace`}
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:inline-block"
            >
              {tNav('marketplace')}
            </Link>
            {firstName && (
              <p className="hidden text-sm text-slate-500 sm:block">👋 {firstName}</p>
            )}
            <form action={signOut.bind(null, locale)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title={tNav('signOut')}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{tNav('signOut')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2 sm:mb-10">
          <StepDot step={1} label={t('steps.0' as Parameters<typeof t>[0])} active />
          <StepLine />
          <StepDot step={2} label={t('steps.1' as Parameters<typeof t>[0])} />
          <StepLine />
          <StepDot step={3} label={t('steps.2' as Parameters<typeof t>[0])} />
          <StepLine />
          <StepDot step={4} label={t('steps.3' as Parameters<typeof t>[0])} />
        </div>

        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
            {t('subtitle')}
          </p>
          <p className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            {t('confidence')}
          </p>
          <div className="mx-auto mt-6 flex max-w-xl flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 sm:flex-row sm:gap-2">
            <span>{t('notOrganizer')}</span>
            <Link href={`/${locale}/marketplace`} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
              {tNav('marketplace')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Why the organizer test isn't available yet + what to do next */}
        <div className="mx-auto mb-8 flex max-w-3xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-amber-900">{t('flowNote')}</p>
        </div>

        {/* Payment step: a path is chosen but not yet paid for */}
        {typedProfile?.onboarding_status === 'path_selected' &&
          typedProfile.selected_path && (
            <CertificationCheckout
              locale={locale}
              path={typedProfile.selected_path}
            />
          )}

        <PathSelector
          locale={locale}
          currentPath={typedProfile?.selected_path ?? null}
          onboardingStatus={typedProfile?.onboarding_status ?? 'not_started'}
        />

        {/* Guidance: how certification + earning works, what's next */}
        <div className="mx-auto mt-10 max-w-3xl sm:mt-14">
          <h2 className="text-center text-xl font-bold text-slate-900">
            {t('guide.headline')}
          </h2>
          <dl className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-5">
                <dt className="font-semibold text-slate-900">
                  {t(`guide.items.${i}.q` as 'guide.items.0.q')}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">
                  {t(`guide.items.${i}.a` as 'guide.items.0.a')}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

// ── Step indicator components ─────────────────────────────────────────────────

function StepDot({ step, label, active = false }: { step: number; label: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
          active
            ? 'bg-brand-600 text-white'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        {step}
      </div>
      <span className={`hidden text-xs sm:block ${active ? 'font-medium text-brand-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  )
}

function StepLine() {
  return <div className="h-px w-8 bg-slate-200 sm:w-16" />
}

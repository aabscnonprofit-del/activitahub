import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  createSubscriptionCheckout,
  createBillingPortalSession,
} from '@/lib/actions/billing'
import { CheckCircle2, AlertCircle, XCircle, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Locale, Profile } from '@/lib/types'
import type { Metadata } from 'next'

interface BillingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: BillingPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'billing' })
  return { title: t('title') }
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('billing')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/sign-in`)
  }

  // Fetch profile — always exists for authenticated users
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, onboarding_status, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileRow as Pick<
    Profile,
    'role' | 'onboarding_status' | 'full_name'
  > | null

  // Fetch subscription — table added in Phase 2; returns null until then
  const { data: subscriptionRow } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('profile_id', user.id)
    .maybeSingle()

  const subscription = subscriptionRow as {
    status: string
    current_period_end: string
  } | null

  const isCertified =
    profile?.onboarding_status === 'certified' ||
    profile?.onboarding_status === 'subscribed' ||
    profile?.role === 'certified_organizer'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="font-bold text-slate-900">Activita Hub</span>
          </Link>
          {profile?.role === 'certified_organizer' && (
            <Link
              href={`/${locale}/dashboard`}
              className="text-sm font-medium text-brand-600 hover:text-brand-800"
            >
              ← Dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('pageSubtitle')}</p>
        </div>

        {/* ── Not certified yet ── */}
        {!isCertified && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-amber-900">{t('notCertified.title')}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-amber-700">
              {t('notCertified.description')}
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/academy`}
                className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                {t('notCertified.goToAcademy')}
              </Link>
              <Link
                href={`/${locale}/onboarding`}
                className="rounded-lg border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                {t('notCertified.goToOnboarding')}
              </Link>
            </div>
          </div>
        )}

        {/* ── Certified, no subscription ── */}
        {isCertified && !subscription && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                <CreditCard className="h-6 w-6 text-brand-600" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  {t('noSubscription.title')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('noSubscription.description')}
                </p>

                <div className="my-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {t('noSubscription.price')}
                  </span>
                  <span className="text-slate-500">{t('noSubscription.period')}</span>
                </div>

                <ul className="mb-6 space-y-2">
                  {[
                    t('noSubscription.features.0' as Parameters<typeof t>[0]),
                    t('noSubscription.features.1' as Parameters<typeof t>[0]),
                    t('noSubscription.features.2' as Parameters<typeof t>[0]),
                    t('noSubscription.features.3' as Parameters<typeof t>[0]),
                    t('noSubscription.features.4' as Parameters<typeof t>[0]),
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-green-500"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <form action={createSubscriptionCheckout}>
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    {t('noSubscription.cta')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── Active subscription ── */}
        {isCertified && subscription?.status === 'active' && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-green-500" aria-hidden="true" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-green-900">
                    {t('active.title')}
                  </h2>
                  <Badge label="Active" variant="success" />
                </div>
                {subscription.current_period_end && (
                  <p className="mt-1 text-sm text-green-700">
                    {t('active.renewsOn', {
                      date: new Date(subscription.current_period_end).toLocaleDateString(),
                    })}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={createBillingPortalSession}>
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors"
                    >
                      {t('active.manageSubscription')}
                    </button>
                  </form>
                  <Link
                    href={`/${locale}/dashboard`}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                  >
                    {t('active.goDashboard')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Past due ── */}
        {isCertified && subscription?.status === 'past_due' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-0.5 h-8 w-8 shrink-0 text-red-500" aria-hidden="true" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-red-900">{t('pastDue.title')}</h2>
                  <Badge label="Past Due" variant="error" />
                </div>
                <p className="mt-1 text-sm text-red-700">{t('pastDue.description')}</p>
                <form action={createBillingPortalSession} className="mt-4">
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    {t('pastDue.updatePayment')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── Cancelled ── */}
        {isCertified && subscription?.status === 'cancelled' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex items-start gap-4">
              <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{t('cancelled.title')}</h2>
                  <Badge label="Cancelled" variant="neutral" />
                </div>
                <p className="mt-1 text-sm text-slate-500">{t('cancelled.description')}</p>
                <form action={createSubscriptionCheckout} className="mt-4">
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    {t('cancelled.resubscribe')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

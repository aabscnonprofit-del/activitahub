import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Compass, CalendarPlus, CalendarDays, ArrowRight, LayoutDashboard, Sparkles, History,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Locale, Profile, Booking, BookingStatus } from '@/lib/types'
import type { Metadata } from 'next'

interface AccountPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })
  return { title: t('greetingPlain') }
}

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'success' | 'warning' | 'neutral' | 'error'> = {
  pending: 'warning', confirmed: 'success', completed: 'default', cancelled: 'neutral', refunded: 'error',
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('account')
  const tb = await getTranslations('bookings')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/account`)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const profile = profileRow as Pick<Profile, 'full_name' | 'role'> | null
  const firstName = profile?.full_name?.split(' ')[0] ?? null
  const isOrganizer = profile?.role === 'certified_organizer' || profile?.role === 'admin'

  // Upcoming bookings (demand-side): next few, excluding cancelled/refunded.
  const today = new Date().toISOString().slice(0, 10)
  const { data: bkRows } = await supabase
    .from('bookings')
    .select('id, date, status, activity_id, amount_cents, currency')
    .eq('customer_id', user.id)
    .gte('date', today)
    .not('status', 'in', '(cancelled,refunded)')
    .order('date', { ascending: true })
    .limit(3)
  const bookings = (bkRows ?? []) as Pick<Booking, 'id' | 'date' | 'status' | 'activity_id' | 'amount_cents' | 'currency'>[]

  // Resolve activity titles for the listed bookings.
  const actIds = [...new Set(bookings.map((b) => b.activity_id).filter(Boolean) as string[])]
  const actTitle = new Map<string, string>()
  if (actIds.length) {
    const { data: acts } = await supabase.from('activities').select('id, title').in('id', actIds)
    for (const r of (acts ?? []) as { id: string; title: string }[]) actTitle.set(r.id, r.title)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {firstName ? t('greeting', { name: firstName }) : t('greetingPlain')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">{t('subtitle')}</p>

          {/* Primary participant actions */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href={`/${locale}/activities`} className="card card-hover flex flex-col p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold text-slate-900">{t('explore.title')}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{t('explore.description')}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                {t('explore.cta')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>

            <Link href={`/${locale}/requests/new`} className="card card-hover flex flex-col p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarPlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold text-slate-900">{t('request.title')}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{t('request.description')}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                {t('request.cta')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>

            {/* Participant History — reuses the existing /me/history projection page (navigation only). */}
            <Link href={`/${locale}/me/history`} className="card card-hover flex flex-col p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <History className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold text-slate-900">{t('history.title')}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{t('history.description')}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                {t('history.cta')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>

          {/* Upcoming bookings */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">{t('upcoming.title')}</h2>
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/requests`} className="text-sm font-semibold text-brand-600 hover:underline">
                {t('requestsLink')}
              </Link>
              <Link href={`/${locale}/bookings`} className="text-sm font-semibold text-brand-600 hover:underline">
                {t('upcoming.viewAll')}
              </Link>
            </div>
          </div>
          {bookings.length === 0 ? (
            <p className="card mt-3 p-6 text-center text-sm text-slate-500">{t('upcoming.empty')}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {bookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/${locale}/bookings`}
                  className="card card-hover flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {b.activity_id ? actTitle.get(b.activity_id) ?? tb('activity') : tb('activity')}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(b.date, 'UTC', locale)}
                    </p>
                  </div>
                  <Badge label={tb(`status.${b.status}` as 'status.confirmed')} variant={STATUS_VARIANT[b.status]} />
                </Link>
              ))}
            </div>
          )}

          {/* Role-aware footer card: organizer dashboard vs become-an-organizer opt-in */}
          {isOrganizer ? (
            <Link
              href={`/${locale}/dashboard`}
              className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{t('dashboard.title')}</h2>
                  <p className="mt-0.5 text-sm text-slate-600">{t('dashboard.description')}</p>
                </div>
              </div>
              <span className="btn-primary shrink-0">{t('dashboard.cta')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </Link>
          ) : (
            <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 p-6 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{t('organizer.title')}</h2>
                  <p className="mt-0.5 text-sm text-slate-600">{t('organizer.description')}</p>
                </div>
              </div>
              <Link href={`/${locale}/onboarding`} className="btn-primary shrink-0">
                {t('organizer.cta')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CalendarDays, Inbox, BookOpen, DollarSign, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Locale, Profile } from '@/lib/types'
import type { Metadata } from 'next'

interface DashboardHomeProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: DashboardHomeProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.home' })
  return { title: t('greetingFallback') }
}

// ── Metric card component ─────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor: string
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconColor}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardHomePage({ params }: DashboardHomeProps) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('dashboard.home')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/sign-in`)
  }

  // ── Fetch profile (always exists) ──────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name, onboarding_status, timezone, created_at')
    .eq('id', user.id)
    .single()

  const profile = profileRow as Pick<
    Profile,
    'full_name' | 'onboarding_status' | 'timezone' | 'created_at'
  > | null

  const timezone = profile?.timezone ?? 'UTC'
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  // ── Fetch metrics — tables added in later phases, gracefully return 0 ──────

  // Phase 5: request_matches table
  const { count: requestCount } = await supabase
    .from('request_matches')
    .select('*', { count: 'exact', head: true })
    .eq('organizer_id', user.id)

  // Phase 6A: bookings table
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('organizer_id', user.id)

  // Phase 6A: payments table — sum of booking revenue
  const { data: revenueRow } = await supabase
    .from('payments')
    .select('amount')
    .eq('organizer_id', user.id)
    .eq('status', 'succeeded')

  const totalRevenue =
    revenueRow?.reduce((sum: number, row: { amount: number }) => sum + (row.amount ?? 0), 0) ?? 0

  // Phase 4: upcoming calendar events
  const now = new Date().toISOString()
  const { data: upcomingEvents, count: upcomingCount } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time, type', { count: 'exact' })
    .eq('organizer_id', user.id)
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(5)

  const eventCount = upcomingCount ?? 0
  const events = (upcomingEvents ?? []) as Array<{
    id: string
    title: string
    start_time: string
    end_time: string | null
    type: string
  }>

  return (
    <div className="space-y-8">
      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {firstName ? t('greeting', { name: firstName }) : t('greetingFallback')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      {/* ── Metric cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('metrics.totalRequests')}
          value={requestCount ?? 0}
          icon={Inbox}
          iconColor="bg-blue-50 text-blue-600"
        />
        <MetricCard
          label={t('metrics.totalBookings')}
          value={bookingCount ?? 0}
          icon={BookOpen}
          iconColor="bg-green-50 text-green-600"
        />
        <MetricCard
          label={t('metrics.totalRevenue')}
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          iconColor="bg-amber-50 text-amber-600"
        />
        <MetricCard
          label={t('metrics.upcomingEvents')}
          value={eventCount}
          icon={CalendarDays}
          iconColor="bg-brand-50 text-brand-600"
        />
      </div>

      {/* ── Upcoming events ───────────────────────────────────────────────── */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{t('upcomingEvents.title')}</h2>
          <Link
            href={`/${locale}/dashboard/calendar`}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
          >
            {t('upcomingEvents.viewAll')}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {t('upcomingEvents.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100" role="list">
            {events.map((event) => (
              <li key={event.id} className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <CalendarDays
                    className="h-4 w-4 text-brand-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(event.start_time, timezone, locale)}
                  </p>
                </div>
                <Badge
                  label={event.type === 'block' ? 'Blocked' : 'Event'}
                  variant={event.type === 'block' ? 'neutral' : 'default'}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Account status card ───────────────────────────────────────────── */}
      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">
          {t('accountStatus.title')}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700">
              {t('accountStatus.certified')}
            </span>
          </div>
          {profile?.created_at && (
            <span className="text-sm text-slate-500">
              {t('accountStatus.certifiedSince', {
                date: formatDate(profile.created_at, timezone, locale),
              })}
            </span>
          )}
          <Badge label={t('accountStatus.subscriptionActive')} variant="success" />
        </div>
      </Card>
    </div>
  )
}

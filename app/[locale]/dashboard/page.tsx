import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  CalendarDays, Layers, MapPin, Users, ArrowRight,
  Plus, CalendarCheck, UserCircle, Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTime } from '@/lib/utils'
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

  // ── Real Phase 4 metrics — every count comes from a real owner-scoped query ──
  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: activityCount },
    { count: venueCount },
    { count: clientCount },
    upcoming,
  ] = await Promise.all([
    supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', user.id),
    supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', user.id),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', user.id),
    supabase
      .from('calendar_events')
      .select('id, title, event_type, date, start_time', { count: 'exact' })
      .eq('organizer_id', user.id)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(5),
  ])

  const eventCount = upcoming.count ?? 0
  const events = (upcoming.data ?? []) as Array<{
    id: string
    title: string
    event_type: string
    date: string
    start_time: string | null
  }>

  const noActivities = (activityCount ?? 0) === 0

  const quickActions = [
    { key: 'create', href: `/${locale}/dashboard/activities`, icon: Plus, color: 'bg-indigo-50 text-indigo-600', label: t('quickActions.createActivity'), desc: t('quickActions.createActivityDesc') },
    { key: 'venue', href: `/${locale}/dashboard/venues`, icon: MapPin, color: 'bg-emerald-50 text-emerald-600', label: t('quickActions.venue'), desc: t('quickActions.venueDesc') },
    { key: 'bookings', href: `/${locale}/dashboard/bookings`, icon: CalendarCheck, color: 'bg-brand-50 text-brand-600', label: t('quickActions.bookings'), desc: t('quickActions.bookingsDesc') },
    { key: 'profile', href: `/${locale}/dashboard/profile`, icon: UserCircle, color: 'bg-amber-50 text-amber-600', label: t('quickActions.profile'), desc: t('quickActions.profileDesc') },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {firstName ? t('greeting', { name: firstName }) : t('greetingFallback')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      {/* ── Getting started — momentum for brand-new organizers ───────────── */}
      {noActivities && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">{t('start.title')}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100">{t('start.body')}</p>
              <Link
                href={`/${locale}/dashboard/activities`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('start.cta')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick actions — "what can I do" ───────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          {t('quickActions.title')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.key} href={a.href} className="card card-hover flex flex-col gap-3 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.color}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{a.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Metric cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('metrics.activities')}
          value={activityCount ?? 0}
          icon={Layers}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          label={t('metrics.venues')}
          value={venueCount ?? 0}
          icon={MapPin}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          label={t('metrics.clients')}
          value={clientCount ?? 0}
          icon={Users}
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
                    {formatDate(event.date, timezone, locale)}
                    {event.start_time ? ` · ${formatTime(event.start_time)}` : ''}
                  </p>
                </div>
                <Badge
                  label={event.event_type === 'block' ? 'Blocked' : 'Event'}
                  variant={event.event_type === 'block' ? 'neutral' : 'default'}
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

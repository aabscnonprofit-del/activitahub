import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  AlertTriangle, Clock, MapPinOff, Inbox, Megaphone, CalendarDays, Users, ArrowRight,
  Plus, UserPlus, Send, FileText, Sparkles, CheckCircle2, Star, Ticket,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ConnectPanel from '@/components/dashboard/ConnectPanel'
import type { Locale, Profile } from '@/lib/types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ connect?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.home' })
  return { title: t('greetingFallback') }
}

const safe = async <T,>(p: PromiseLike<{ data: T | null }>, fallback: T): Promise<T> => {
  try { const { data } = await p; return (data ?? fallback) as T } catch { return fallback }
}
const STATUSES = ['invited', 'confirmed', 'maybe', 'declined', 'checked_in', 'no_show'] as const

export default async function CommandCenterPage({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const { connect } = await searchParams
  const t = await getTranslations('dashboard.home')
  const tc = await getTranslations('command')
  const tp = await getTranslations('participants')
  const ta = await getTranslations('activities')
  const tm = await getTranslations('marketplace')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)
  const uid = user.id

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now.getTime() + 86400_000).toISOString().slice(0, 10)
  const weekEnd = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10)
  const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString()

  const { data: profileRow } = await supabase.from('profiles').select('full_name, timezone').eq('id', uid).single()
  const profile = profileRow as Pick<Profile, 'full_name' | 'timezone'> | null
  const tz = profile?.timezone ?? 'UTC'
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  // ── Data (all organizer-scoped, guarded) ──────────────────────────────────
  const [activities, events, parts, promoPkgs, matches, proposals, pendingBookings, recentBookings, recentReviews] =
    await Promise.all([
      safe(supabase.from('activities').select('id, title, status, city').eq('organizer_id', uid), [] as { id: string; title: string; status: string; city: string | null }[]),
      safe(supabase.from('calendar_events').select('activity_id, title, date, start_time').eq('organizer_id', uid).gte('date', today).lte('date', weekEnd).order('date', { ascending: true }), [] as { activity_id: string | null; title: string; date: string; start_time: string | null }[]),
      safe(supabase.from('participants').select('activity_id, status').eq('organizer_id', uid), [] as { activity_id: string; status: string }[]),
      safe(supabase.from('promotion_packages').select('activity_id').eq('organizer_id', uid), [] as { activity_id: string }[]),
      safe(supabase.from('request_matches').select('request_id').eq('organizer_id', uid), [] as { request_id: string }[]),
      safe(supabase.from('proposals').select('id, request_id, status, created_at').eq('organizer_id', uid).order('created_at', { ascending: false }).limit(6), [] as { id: string; request_id: string; status: string; created_at: string }[]),
      safe(supabase.from('bookings').select('id').eq('organizer_id', uid).eq('status', 'pending'), [] as { id: string }[]),
      safe(supabase.from('bookings').select('id').eq('organizer_id', uid).gte('created_at', weekAgo), [] as { id: string }[]),
      safe(supabase.from('reviews').select('id').eq('organizer_id', uid).gte('created_at', weekAgo), [] as { id: string }[]),
    ])

  const actById = new Map(activities.map((a) => [a.id, a]))
  const noActivities = activities.length === 0

  // Participant aggregates.
  const overview: Record<string, number> = { invited: 0, confirmed: 0, maybe: 0, declined: 0, checked_in: 0, no_show: 0 }
  const byActivity = new Map<string, number>()
  for (const p of parts) { overview[p.status] = (overview[p.status] ?? 0) + 1; byActivity.set(p.activity_id, (byActivity.get(p.activity_id) ?? 0) + 1) }
  const participantTotal = Object.values(overview).reduce((a, b) => a + b, 0)

  // Marketplace requests: matched + not yet proposed.
  const reqIds = matches.map((m) => m.request_id)
  const proposedReqIds = new Set(proposals.map((p) => p.request_id))
  let openRequests: { id: string; event_type: string; city: string | null; desired_date: string | null }[] = []
  if (reqIds.length) {
    openRequests = (await safe(
      supabase.from('customer_requests').select('id, event_type, city, desired_date, status').in('id', reqIds).in('status', ['open', 'matched']),
      [] as { id: string; event_type: string; city: string | null; desired_date: string | null; status: string }[],
    )).filter((r) => !proposedReqIds.has(r.id))
  }

  // Promotion status: published activities without a package.
  const promoSet = new Set(promoPkgs.map((p) => p.activity_id))
  const needsPromo = activities.filter((a) => a.status === 'published' && !promoSet.has(a.id))

  // Upcoming, bucketed.
  const buckets: Record<'today' | 'tomorrow' | 'week', typeof events> = { today: [], tomorrow: [], week: [] }
  for (const e of events) {
    if (e.date === today) buckets.today.push(e)
    else if (e.date === tomorrow) buckets.tomorrow.push(e)
    else buckets.week.push(e)
  }

  // ── Section 1: Requires Attention ──────────────────────────────────────────
  type Item = { icon: React.ElementType; text: string; href: string; tone: 'red' | 'amber' | 'brand' }
  const attention: Item[] = []
  if (overview.invited > 0) attention.push({ icon: Users, tone: 'amber', text: tc('attention.notResponded', { count: overview.invited }), href: `/${locale}/dashboard/participants?status=invited` })
  for (const e of buckets.today) attention.push({ icon: Clock, tone: 'red', text: tc('attention.startsSoon', { title: e.title }), href: e.activity_id ? `/${locale}/dashboard/activities/${e.activity_id}/participants` : `/${locale}/dashboard/calendar` })
  for (const a of activities.filter((x) => x.status === 'published' && !(x.city && x.city.trim()))) attention.push({ icon: MapPinOff, tone: 'amber', text: tc('attention.noLocation', { title: a.title }), href: `/${locale}/dashboard/activities` })
  if (pendingBookings.length > 0) attention.push({ icon: Inbox, tone: 'brand', text: tc('attention.bookingsReview', { count: pendingBookings.length }), href: `/${locale}/dashboard/bookings` })
  if (openRequests.length > 0) attention.push({ icon: Megaphone, tone: 'brand', text: tc('attention.requestsWaiting', { count: openRequests.length }), href: `/${locale}/dashboard/requests` })

  const toneCls = { red: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', brand: 'bg-brand-50 text-brand-600' }

  const quick = [
    { icon: Plus, label: tc('quick.createActivity'), href: `/${locale}/dashboard/activities`, c: 'bg-indigo-50 text-indigo-600' },
    { icon: UserPlus, label: tc('quick.addParticipants'), href: `/${locale}/dashboard/activities`, c: 'bg-emerald-50 text-emerald-600' },
    { icon: Megaphone, label: tc('quick.generatePromotion'), href: `/${locale}/dashboard/activities`, c: 'bg-brand-50 text-brand-600' },
    { icon: Send, label: tc('quick.sendUpdate'), href: `/${locale}/dashboard/activities`, c: 'bg-amber-50 text-amber-600' },
    { icon: FileText, label: tc('quick.viewRequests'), href: `/${locale}/dashboard/requests`, c: 'bg-sky-50 text-sky-600' },
    { icon: Sparkles, label: tc('quick.openOpe'), href: `/${locale}/plan-an-event`, c: 'bg-violet-50 text-violet-600' },
  ]

  const weekly = [
    { icon: CalendarDays, label: tc('weekly.activities'), value: new Set(events.map((e) => e.activity_id)).size },
    { icon: Users, label: tc('weekly.participants'), value: participantTotal },
    { icon: Ticket, label: tc('weekly.bookings'), value: recentBookings.length },
    { icon: Star, label: tc('weekly.reviews'), value: recentReviews.length },
  ]

  const statusBadge = (s: string) => s === 'published' ? 'bg-emerald-100 text-emerald-700' : s === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'

  function UpcomingList({ items }: { items: typeof events }) {
    return (
      <ul className="space-y-2">
        {items.map((e, i) => {
          const act = e.activity_id ? actById.get(e.activity_id) : null
          return (
            <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{act?.title || e.title}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(e.date, tz, locale)}{e.start_time ? ' · ' + e.start_time.slice(0, 5) : ''} · {tc('upcoming.participants', { count: e.activity_id ? byActivity.get(e.activity_id) ?? 0 : 0 })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {act && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(act.status)}`}>{ta(`status.${act.status}` as 'status.draft')}</span>}
                {e.activity_id && (
                  <Link href={`/${locale}/dashboard/activities/${e.activity_id}/participants`} className="text-xs font-semibold text-brand-600 hover:underline">
                    {tc('upcoming.view')}
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{firstName ? t('greeting', { name: firstName }) : t('greetingFallback')}</h1>
        <p className="mt-1 text-sm text-slate-500">{tc('subtitle')}</p>
      </div>

      {/* Get paid — Stripe Connect onboarding status (returns here via ?connect=) */}
      <ConnectPanel locale={locale} statusMarker={connect} />

      {noActivities && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
          <h2 className="text-xl font-extrabold sm:text-2xl">{t('start.title')}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100">{t('start.body')}</p>
          <Link href={`/${locale}/dashboard/activities`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50">
            <Plus className="h-4 w-4" />{t('start.cta')}
          </Link>
        </div>
      )}

      {/* Section 1 — Requires Attention */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <h2 className="font-bold text-slate-900">{tc('attention.title')}</h2>
        </div>
        {attention.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />{tc('attention.allClear')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {attention.slice(0, 8).map((it, i) => {
              const Icon = it.icon
              return (
                <Link key={i} href={it.href} className="card card-hover flex items-center gap-3 p-3.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneCls[it.tone]}`}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{it.text}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 6 — Quick Actions (surfaced high for fast operation) */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{tc('quick.title')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quick.map((a, i) => { const Icon = a.icon; return (
            <Link key={i} href={a.href} className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.c}`}><Icon className="h-5 w-5" /></span>
              <span className="text-xs font-semibold text-slate-800">{a.label}</span>
            </Link>
          )})}
        </div>
      </section>

      {/* Section 2 — Upcoming Activities */}
      <section className="card p-5">
        <h2 className="mb-4 font-bold text-slate-900">{tc('upcoming.title')}</h2>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">{tc('upcoming.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {(['today', 'tomorrow', 'week'] as const).map((b) => (
              <div key={b}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{tc('upcoming.' + b)}</p>
                {buckets[b].length === 0 ? <p className="text-xs text-slate-300">—</p> : <UpcomingList items={buckets[b]} />}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3 — Participant Overview */}
      {participantTotal > 0 && (
        <section>
          <h2 className="mb-3 font-bold text-slate-900">{tc('participants.title')}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {STATUSES.map((s) => (
              <Link key={s} href={`/${locale}/dashboard/participants?status=${s}`} className="card card-hover p-3 text-center">
                <p className="text-2xl font-extrabold text-slate-900">{overview[s] ?? 0}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{tp(`status.${s}` as 'status.invited')}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Section 4 — Marketplace Requests */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{tc('requests.title')}</h2>
            <Link href={`/${locale}/dashboard/requests`} className="text-xs font-semibold text-brand-600 hover:underline">{tc('requests.viewAll')}</Link>
          </div>
          {openRequests.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">{tc('requests.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {openRequests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{tm(`categories.${r.event_type}` as 'categories.birthday')}</p>
                    <p className="text-xs text-slate-500">{[r.city, r.desired_date && formatDate(r.desired_date, tz, locale)].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <Link href={`/${locale}/dashboard/requests`} className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500">{tc('requests.createProposal')}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold text-slate-900">{tc('requests.recentProposals')}</h2>
          {proposals.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">{tc('requests.noProposals')}</p>
          ) : (
            <ul className="space-y-2">
              {proposals.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm">
                  <span className="text-slate-700">{formatDate(p.created_at.slice(0, 10), tz, locale)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Section 5 — Promotion Status */}
      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-brand-500" />
          <h2 className="font-bold text-slate-900">{tc('promotion.title')}</h2>
        </div>
        {needsPromo.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">{tc('promotion.allPromoted')}</p>
        ) : (
          <ul className="space-y-2">
            {needsPromo.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <p className="min-w-0 truncate text-sm font-medium text-slate-800">{a.title}</p>
                <Link href={`/${locale}/dashboard/activities`} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                  <Megaphone className="h-3.5 w-3.5" />{tc('promotion.generate')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section 7 — Weekly Snapshot */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{tc('weekly.title')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {weekly.map((w, i) => { const Icon = w.icon; return (
            <div key={i} className="card flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
              <div>
                <p className="text-xl font-extrabold text-slate-900">{w.value}</p>
                <p className="text-xs text-slate-500">{w.label}</p>
              </div>
            </div>
          )})}
        </div>
      </section>
    </div>
  )
}

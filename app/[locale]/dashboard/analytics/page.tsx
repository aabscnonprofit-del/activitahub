import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { DollarSign, CalendarCheck, TrendingUp, Repeat, Star, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { getOrganizerAnalytics } from '@/lib/analytics/queries'
import { formatPrice } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </Card>
  )
}

export default async function OrganizerAnalyticsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('analytics')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const a = await getOrganizerAnalytics(supabase, user.id)
  if (!a) {
    return <p className="text-sm text-slate-500">{t('unavailable')}</p>
  }

  const maxRevenue = Math.max(1, ...a.revenue_by_month.map((m) => m.revenue_cents))
  const maxPop = Math.max(1, ...a.activity_popularity.map((p) => p.bookings))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t('revenue')} value={formatPrice(a.revenue_cents, 'usd', locale) ?? '$0'} icon={DollarSign} color="bg-amber-50 text-amber-600" />
        <Metric label={t('bookings')} value={a.total_bookings} icon={CalendarCheck} color="bg-brand-50 text-brand-600" />
        <Metric label={t('completionRate')} value={`${a.completion_rate}%`} icon={TrendingUp} color="bg-green-50 text-green-600" />
        <Metric label={t('repeatCustomers')} value={a.repeat_customers} icon={Repeat} color="bg-indigo-50 text-indigo-600" />
        <Metric label={t('proposalConversion')} value={`${a.proposal_conversion}%`} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
        <Metric label={t('proposalsSent')} value={a.proposals_sent} icon={Layers} color="bg-slate-100 text-slate-600" />
        <Metric label={t('avgRating')} value={a.avg_rating != null ? a.avg_rating.toFixed(1) : '—'} icon={Star} color="bg-amber-50 text-amber-500" />
        <Metric label={t('completed')} value={a.completed_bookings} icon={CalendarCheck} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue over time */}
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">{t('revenueOverTime')}</h2>
          {a.revenue_by_month.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>
          ) : (
            <ul className="space-y-2.5">
              {a.revenue_by_month.map((m, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-10 shrink-0 text-slate-500">{m.month}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(m.revenue_cents / maxRevenue) * 100}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right font-medium text-slate-700">{formatPrice(m.revenue_cents, 'usd', locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Activity popularity */}
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">{t('activityPopularity')}</h2>
          {a.activity_popularity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>
          ) : (
            <ul className="space-y-2.5">
              {a.activity_popularity.slice(0, 6).map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-slate-600">{p.title}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(p.bookings / maxPop) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right font-medium text-slate-700">{p.bookings}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

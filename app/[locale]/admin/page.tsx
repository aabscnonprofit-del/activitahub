import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { getPlatformAnalytics } from '@/lib/analytics/queries'
import { formatPrice } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('admin')

  const supabase = await createClient()
  const a = await getPlatformAnalytics(supabase)
  if (!a) return <p className="text-sm text-slate-500">{t('unavailable')}</p>

  const metrics = [
    { label: t('metrics.gmv'), value: formatPrice(a.gmv_cents, 'usd', locale) ?? '$0' },
    { label: t('metrics.activeOrganizers'), value: a.active_organizers },
    { label: t('metrics.activeCustomers'), value: a.active_customers },
    { label: t('metrics.conversion'), value: `${a.marketplace_conversion}%` },
    { label: t('metrics.bookings'), value: a.total_bookings },
    { label: t('metrics.requests'), value: a.total_requests },
    { label: t('metrics.reviews'), value: a.total_reviews },
    { label: t('metrics.pendingReviews'), value: a.pending_reviews },
  ]
  const maxMonth = Math.max(1, ...a.bookings_by_month.map((m) => m.count))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{m.label}</p>
            <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{m.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">{t('bookingGrowth')}</h2>
          {a.bookings_by_month.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>
          ) : (
            <ul className="space-y-2.5">
              {a.bookings_by_month.map((m, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-10 shrink-0 text-slate-500">{m.month}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(m.count / maxMonth) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right font-medium text-slate-700">{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">{t('topCategories')}</h2>
          {a.top_categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>
          ) : (
            <ul className="space-y-2">
              {a.top_categories.slice(0, 6).map((c, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">{c.category}</span>
                  <span className="font-semibold text-slate-800">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {a.pending_reviews > 0 && (
        <Link href={`/${locale}/admin/reviews`} className="inline-block text-sm font-medium text-brand-600 hover:underline">
          {t('reviewQueue', { count: a.pending_reviews })} →
        </Link>
      )}
    </div>
  )
}

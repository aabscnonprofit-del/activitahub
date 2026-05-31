import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { CalendarCheck, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Badge } from '@/components/ui/Badge'
import { cancelBooking } from '@/lib/actions/bookings'
import { createBookingCheckout, requestRefund } from '@/lib/actions/bookingPayments'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { StarRating } from '@/components/ui/StarRating'
import { getCustomerStats } from '@/lib/analytics/queries'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, Booking, BookingStatus } from '@/lib/types'

const VARIANT: Record<BookingStatus, 'default' | 'success' | 'warning' | 'neutral' | 'error'> = {
  pending: 'warning', confirmed: 'success', completed: 'default', cancelled: 'neutral', refunded: 'error',
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function BookingsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('bookings')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/bookings`)

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', user.id)
    .order('date', { ascending: false })
  const bookings = (data ?? []) as Booking[]

  // Resolve organizer display names + activity titles.
  const orgIds = [...new Set(bookings.map((b) => b.organizer_id))]
  const actIds = [...new Set(bookings.map((b) => b.activity_id).filter(Boolean) as string[])]
  const orgName = new Map<string, string>()
  const actTitle = new Map<string, string>()
  if (orgIds.length) {
    const { data: o } = await supabase.from('organizer_profiles').select('user_id, display_name').in('user_id', orgIds)
    for (const r of (o ?? []) as { user_id: string; display_name: string | null }[]) if (r.display_name) orgName.set(r.user_id, r.display_name)
  }
  if (actIds.length) {
    const { data: a } = await supabase.from('activities').select('id, title').in('id', actIds)
    for (const r of (a ?? []) as { id: string; title: string }[]) actTitle.set(r.id, r.title)
  }

  // Which bookings already have a review (own reviews, RLS-scoped).
  const { data: revData } = await supabase
    .from('reviews')
    .select('booking_id, rating')
    .eq('customer_id', user.id)
  const reviewedRating = new Map<string, number>()
  for (const r of (revData ?? []) as { booking_id: string; rating: number }[]) {
    reviewedRating.set(r.booking_id, r.rating)
  }

  // Active refund requests on these bookings (RLS via booking ownership).
  const { data: refundData } = await supabase
    .from('refund_requests')
    .select('booking_id, status')
    .in('status', ['requested', 'approved', 'refunded'])
  const refundStatus = new Map<string, string>()
  for (const r of (refundData ?? []) as { booking_id: string; status: string }[]) {
    refundStatus.set(r.booking_id, r.status)
  }

  const stats = await getCustomerStats(supabase)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>

          {/* Customer history / lifetime value */}
          {stats && stats.total_bookings > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t('history.bookings'), value: stats.total_bookings },
                { label: t('history.spent'), value: formatPrice(stats.total_spent_cents, 'usd', locale) ?? '$0' },
                { label: t('history.organizers'), value: stats.organizers },
                { label: t('history.repeat'), value: stats.repeat_organizers },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{s.label}</p>
                  <p className="mt-0.5 text-xl font-extrabold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">{t('empty')}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {b.activity_id ? actTitle.get(b.activity_id) ?? t('activity') : t('activity')}
                        </h3>
                        <Badge label={t(`status.${b.status}` as 'status.confirmed')} variant={VARIANT[b.status]} />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(b.date, 'UTC', locale)} · {orgName.get(b.organizer_id) ?? t('organizer')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-900">{formatPrice(b.amount_cents, b.currency, locale) ?? '—'}</p>
                      {b.payment_status && (
                        <Badge label={t(`payment.${b.payment_status}` as 'payment.unpaid')} variant={b.payment_status === 'paid' ? 'success' : b.payment_status === 'refunded' ? 'error' : 'neutral'} />
                      )}
                    </div>
                  </div>

                  {/* Pay / refund actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <form action={cancelBooking}>
                        <input type="hidden" name="booking_id" value={b.id} />
                        <button className="text-sm font-medium text-red-600 hover:underline">{t('cancel')}</button>
                      </form>
                    )}
                    {(b.status === 'confirmed' || b.status === 'pending') &&
                      b.payment_status && b.payment_status !== 'paid' && b.payment_status !== 'refunded' && (
                        <form action={createBookingCheckout}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="booking_id" value={b.id} />
                          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t('payNow')}</button>
                        </form>
                      )}
                    {b.payment_status === 'paid' && !refundStatus.has(b.id) && (
                      <form action={requestRefund} className="flex items-center gap-2">
                        <input type="hidden" name="booking_id" value={b.id} />
                        <button className="text-sm font-medium text-slate-600 hover:underline">{t('requestRefund')}</button>
                      </form>
                    )}
                    {refundStatus.get(b.id) === 'requested' && (
                      <span className="text-xs text-amber-600">{t('refundRequested')}</span>
                    )}
                  </div>
                  {b.status === 'completed' &&
                    (reviewedRating.has(b.id) ? (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500">{t('reviewed')}</span>
                        <StarRating rating={reviewedRating.get(b.id)!} />
                      </div>
                    ) : (
                      <ReviewForm bookingId={b.id} />
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

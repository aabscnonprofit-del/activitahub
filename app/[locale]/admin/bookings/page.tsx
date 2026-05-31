import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, Booking, BookingStatus, RefundRequest } from '@/lib/types'

const VARIANT: Record<BookingStatus, 'default' | 'success' | 'warning' | 'neutral' | 'error'> = {
  pending: 'warning', confirmed: 'success', completed: 'default', cancelled: 'neutral', refunded: 'error',
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AdminBookingsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('admin')

  const supabase = await createClient()
  const [{ data: bData }, { data: rData }] = await Promise.all([
    supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('refund_requests').select('*'),
  ])
  const bookings = (bData ?? []) as Booking[]
  const refunds = (rData ?? []) as RefundRequest[]
  const refundByBooking = new Map<string, RefundRequest>()
  for (const r of refunds) refundByBooking.set(r.booking_id, r)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('bookings.title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('bookings.subtitle')}</p>
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">{t('bookings.empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('bookings.date')}</th>
                <th className="px-4 py-3">{t('bookings.amount')}</th>
                <th className="px-4 py-3">{t('bookings.status')}</th>
                <th className="px-4 py-3">{t('bookings.payment')}</th>
                <th className="px-4 py-3">{t('bookings.dispute')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => {
                const refund = refundByBooking.get(b.id)
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(b.date, 'UTC', locale)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{formatPrice(b.amount_cents, b.currency, locale) ?? '—'}</td>
                    <td className="px-4 py-3"><Badge label={b.status} variant={VARIANT[b.status]} /></td>
                    <td className="px-4 py-3 text-slate-600">{b.payment_status}</td>
                    <td className="px-4 py-3">
                      {refund ? <Badge label={`refund: ${refund.status}`} variant={refund.status === 'refunded' ? 'error' : 'warning'} /> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

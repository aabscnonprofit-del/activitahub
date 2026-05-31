import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { CalendarCheck, CalendarDays, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { cancelBooking, completeBooking, refundBooking } from '@/lib/actions/bookings'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, Booking, BookingStatus } from '@/lib/types'

const VARIANT: Record<BookingStatus, 'default' | 'success' | 'warning' | 'neutral' | 'error'> = {
  pending: 'warning', confirmed: 'success', completed: 'default', cancelled: 'neutral', refunded: 'error',
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function OrganizerBookingsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('bookings')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('organizer_id', user.id)
    .order('date', { ascending: false })
  const bookings = (data ?? []) as Booking[]

  const actIds = [...new Set(bookings.map((b) => b.activity_id).filter(Boolean) as string[])]
  const actTitle = new Map<string, string>()
  if (actIds.length) {
    const { data: a } = await supabase.from('activities').select('id, title').in('id', actIds)
    for (const r of (a ?? []) as { id: string; title: string }[]) actTitle.set(r.id, r.title)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('organizerTitle')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('organizerSubtitle')}</p>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('organizerEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(b.date, 'UTC', locale)}</span>
                    {b.participant_count != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.participant_count}</span>}
                  </div>
                </div>
                <p className="shrink-0 font-bold text-slate-900">{formatPrice(b.amount_cents, b.currency, locale) ?? '—'}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {b.status === 'confirmed' && (
                  <form action={completeBooking}>
                    <input type="hidden" name="booking_id" value={b.id} />
                    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">{t('complete')}</button>
                  </form>
                )}
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <form action={cancelBooking}>
                    <input type="hidden" name="booking_id" value={b.id} />
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">{t('cancel')}</button>
                  </form>
                )}
                {(b.status === 'cancelled' || b.status === 'confirmed') && (
                  <form action={refundBooking}>
                    <input type="hidden" name="booking_id" value={b.id} />
                    <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">{t('refund')}</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

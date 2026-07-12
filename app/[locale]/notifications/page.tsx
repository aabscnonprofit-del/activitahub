import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, BellOff, Check, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import { formatDate } from '@/lib/utils'
import type { Locale, AppNotification } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
}

function hrefFor(locale: string, n: AppNotification): string {
  const d = n.data || {}
  if (typeof d.activity_id === 'string') return `/${locale}/marketplace/${d.activity_id}`
  if (typeof d.booking_id === 'string') return `/${locale}/bookings`
  if (typeof d.request_id === 'string') return `/${locale}/requests/${d.request_id}`
  if (d.digest) return `/${locale}/marketplace`
  return `/${locale}/notifications`
}

export default async function NotificationsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('notifications')

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/notifications`)

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  const notifications = (data ?? []) as AppNotification[]
  const unread = notifications.filter((n) => !n.read_at).length

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated isOrganizer={viewer.isOrganizer} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
              {unread > 0 && <p className="mt-0.5 text-sm text-slate-500">{t('unreadCount', { count: unread })}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/notifications/preferences`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('preferencesLink')}
              </Link>
              {unread > 0 && (
                <form action={markAllNotificationsRead}>
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Check className="h-4 w-4" />
                    {t('markAllRead')}
                  </button>
                </form>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <BellOff className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">{t('empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    n.read_at ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50/40'
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.read_at ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600'}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <Link href={hrefFor(locale, n)} className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read_at ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at, 'UTC', locale)}</p>
                  </Link>
                  {!n.read_at && (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notification_id" value={n.id} />
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title={t('markRead')}>
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

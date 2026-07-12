import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import NotificationPreferencesForm from '@/components/alerts/NotificationPreferencesForm'
import { getAlertPreferences, hasPushSubscription } from '@/lib/alerts/preferences'
import { ALERT_RADII_MILES, kmToMiles } from '@/lib/alerts/constants'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function NotificationPreferencesPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('alerts')

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/notifications/preferences`)

  const prefs = await getAlertPreferences(supabase, user.id)
  const pushSubscribed = await hasPushSubscription(supabase, user.id)

  // Map the stored km radius to the nearest UI option (miles).
  const storedMiles = prefs ? kmToMiles(prefs.radius_km) : 25
  const radiusMiles = ALERT_RADII_MILES.reduce((best, m) =>
    Math.abs(m - storedMiles) < Math.abs(best - storedMiles) ? m : best,
  )

  const initial = {
    categories: prefs?.categories ?? [],
    language: prefs?.language ?? locale,
    radiusMiles,
    frequency: (prefs?.frequency as 'immediate' | 'daily_digest') ?? 'immediate',
    city: prefs?.city ?? null,
    paused: prefs?.paused ?? false,
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link
            href={`/${locale}/notifications`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-1 text-slate-500">{t('subtitle')}</p>
          <div className="mt-6">
            <NotificationPreferencesForm locale={locale} initial={initial} pushSubscribed={pushSubscribed} />
          </div>
        </div>
      </main>
    </div>
  )
}

import { getTranslations } from 'next-intl/server'
import { CalendarCheck, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import RsvpButtons from '@/components/rsvp/RsvpButtons'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string; token: string }>
}

type RsvpInfo = {
  participant_name: string
  status: string
  activity_title: string
  city: string | null
  next_date: string | null
}

export default async function RsvpPage({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  const t = await getTranslations('rsvp')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let info: RsvpInfo | null = null
  try {
    const { data } = await supabase.rpc('rsvp_lookup', { p_token: token })
    info = (data as RsvpInfo) ?? null
  } catch {
    info = null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-lg px-4 py-12">
          {!info ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">{t('invalid')}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm font-semibold text-brand-600">{t('invited')}</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{info.activity_title}</h1>
              <p className="mt-1 text-slate-600">{t('greeting', { name: info.participant_name })}</p>
              <div className="mt-4 space-y-1 text-sm text-slate-600">
                {info.next_date && (
                  <p className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-slate-400" />
                    {info.next_date}
                  </p>
                )}
                {info.city && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {info.city}
                  </p>
                )}
              </div>
              <p className="mt-6 text-sm font-medium text-slate-700">{t('prompt')}</p>
              <div className="mt-3">
                <RsvpButtons token={token} initialStatus={info.status} />
              </div>
            </div>
          )}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

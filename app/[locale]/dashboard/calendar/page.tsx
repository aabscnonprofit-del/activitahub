import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from '@/components/dashboard/CalendarClient'
import type { CalendarEvent } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function CalendarPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const [{ data: eventRows }, { data: activityRows }, { data: venueRows }] =
    await Promise.all([
      supabase
        .from('calendar_events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('date', { ascending: true }),
      supabase
        .from('activities')
        .select('id, title')
        .eq('organizer_id', user.id)
        .order('title', { ascending: true }),
      supabase
        .from('venues')
        .select('id, name')
        .eq('organizer_id', user.id)
        .order('name', { ascending: true }),
    ])

  const activities = ((activityRows ?? []) as { id: string; title: string }[]).map(
    (a) => ({ id: a.id, label: a.title })
  )
  const venues = ((venueRows ?? []) as { id: string; name: string }[]).map((v) => ({
    id: v.id,
    label: v.name,
  }))
  const todayKey = new Date().toISOString().slice(0, 10)

  return (
    <CalendarClient
      initialEvents={(eventRows ?? []) as CalendarEvent[]}
      activities={activities}
      venues={venues}
      locale={locale}
      todayKey={todayKey}
    />
  )
}

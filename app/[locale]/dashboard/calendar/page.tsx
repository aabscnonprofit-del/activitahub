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
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('organizer_id', user.id)
    .order('date', { ascending: true })

  return <CalendarClient initialEvents={(data ?? []) as CalendarEvent[]} locale={locale} />
}

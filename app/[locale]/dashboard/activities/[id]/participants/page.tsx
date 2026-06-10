import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParticipantsClient from '@/components/dashboard/ParticipantsClient'
import type { Participant } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string; id: string }>
}

export default async function ParticipantsPage({ params }: Props) {
  const { locale, id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/dashboard/activities/${id}/participants`)

  const { data: activity } = await supabase
    .from('activities')
    .select('id, title, reminder_offsets_hours')
    .eq('id', id)
    .eq('organizer_id', user.id)
    .maybeSingle()
  if (!activity) redirect(`/${locale}/dashboard/activities`)
  const a = activity as { id: string; title: string; reminder_offsets_hours?: number[] | null }

  let participants: Participant[] = []
  try {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('activity_id', id)
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: true })
    participants = (data ?? []) as Participant[]
  } catch {
    participants = []
  }

  return (
    <ParticipantsClient
      locale={locale}
      activityId={id}
      activityTitle={a.title}
      reminderOffsets={a.reminder_offsets_hours ?? [168, 24, 2]}
      initial={participants}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || ''}
    />
  )
}

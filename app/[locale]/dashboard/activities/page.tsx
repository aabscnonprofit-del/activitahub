import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActivitiesClient from '@/components/dashboard/ActivitiesClient'
import type { Activity } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function ActivitiesPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return <ActivitiesClient initialActivities={(data ?? []) as Activity[]} locale={locale} />
}

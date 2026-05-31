import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VenuesClient from '@/components/dashboard/VenuesClient'
import type { Venue } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function VenuesPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const { data } = await supabase
    .from('venues')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return <VenuesClient initialVenues={(data ?? []) as Venue[]} locale={locale} />
}

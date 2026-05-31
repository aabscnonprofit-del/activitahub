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

  const venues = (data ?? []) as Venue[]

  // Fetch photos for these venues and resolve public URLs.
  const { data: photoRows } = await supabase
    .from('venue_photos')
    .select('id, venue_id, storage_path, sort_order')
    .eq('organizer_id', user.id)
    .order('sort_order', { ascending: true })

  const initialPhotos: Record<string, { id: string; url: string }[]> = {}
  for (const p of (photoRows ?? []) as {
    id: string
    venue_id: string
    storage_path: string
  }[]) {
    const url = supabase.storage.from('venue-photos').getPublicUrl(p.storage_path).data.publicUrl
    ;(initialPhotos[p.venue_id] ??= []).push({ id: p.id, url })
  }

  return (
    <VenuesClient initialVenues={venues} initialPhotos={initialPhotos} locale={locale} />
  )
}

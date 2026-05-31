'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Venue } from '@/lib/types'

export async function getVenues(): Promise<Venue[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('venues')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as Venue[]
}

export async function createVenue(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = (formData.get('name') as string)?.trim()
  if (!name) return

  const capacityRaw = formData.get('capacity') as string
  const capacity = capacityRaw ? parseInt(capacityRaw) : null

  await supabase.from('venues').insert({
    organizer_id: user.id,
    name,
    address: (formData.get('address') as string)?.trim() || null,
    city: (formData.get('city') as string)?.trim() || null,
    country: (formData.get('country') as string)?.trim() || null,
    capacity: capacity && !isNaN(capacity) ? capacity : null,
    indoor_outdoor: (formData.get('indoor_outdoor') as string) || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  })

  // Update onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_status')
    .eq('id', user.id)
    .single()

  if (
    profile &&
    (profile.onboarding_status === 'not_started' ||
      profile.onboarding_status === 'profile_created' ||
      profile.onboarding_status === 'first_activity_added')
  ) {
    await supabase
      .from('profiles')
      .update({ onboarding_status: 'venue_added' })
      .eq('id', user.id)
  }

  revalidatePath('/dashboard/venues')
  revalidatePath('/dashboard')
}

export async function updateVenue(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = (formData.get('name') as string)?.trim()
  if (!name) return

  const capacityRaw = formData.get('capacity') as string
  const capacity = capacityRaw ? parseInt(capacityRaw) : null

  await supabase
    .from('venues')
    .update({
      name,
      address: (formData.get('address') as string)?.trim() || null,
      city: (formData.get('city') as string)?.trim() || null,
      country: (formData.get('country') as string)?.trim() || null,
      capacity: capacity && !isNaN(capacity) ? capacity : null,
      indoor_outdoor: (formData.get('indoor_outdoor') as string) || null,
      notes: (formData.get('notes') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/venues')
}

export async function deleteVenue(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('venues').delete().eq('id', id).eq('organizer_id', user.id)

  revalidatePath('/dashboard/venues')
}

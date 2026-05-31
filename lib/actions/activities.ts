'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Activity } from '@/lib/types'

export async function getActivities(): Promise<Activity[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as Activity[]
}

// Parses the marketplace fields shared by create/update.
function parseFields(formData: FormData) {
  const priceRaw = (formData.get('price') as string)?.trim()
  const langRaw = (formData.get('languages') as string)?.trim()
  const minAge = (formData.get('min_age') as string)?.trim()
  const maxAge = (formData.get('max_age') as string)?.trim()
  const duration = (formData.get('duration_minutes') as string)?.trim()

  return {
    title: (formData.get('title') as string)?.trim(),
    description: (formData.get('description') as string)?.trim() || null,
    status: (formData.get('status') as string) || 'draft',
    category: (formData.get('category') as string) || null,
    price_cents: priceRaw ? Math.round(parseFloat(priceRaw) * 100) : null,
    languages: langRaw ? langRaw.split(',').map((s) => s.trim()).filter(Boolean) : null,
    min_age: minAge ? parseInt(minAge) : null,
    max_age: maxAge ? parseInt(maxAge) : null,
    city: (formData.get('city') as string)?.trim() || null,
    country: (formData.get('country') as string)?.trim() || null,
    indoor_outdoor: (formData.get('indoor_outdoor') as string) || null,
    venue_id: (formData.get('venue_id') as string) || null,
    duration_minutes: duration ? parseInt(duration) : null,
  }
}

export async function createActivity(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const fields = parseFields(formData)
  if (!fields.title) return

  await supabase.from('activities').insert({ organizer_id: user.id, ...fields })

  revalidatePath('/dashboard/activities')
  revalidatePath('/dashboard')
}

export async function updateActivity(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const fields = parseFields(formData)
  if (!fields.title) return

  await supabase
    .from('activities')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/activities')
}

export async function setActivityStatus(
  id: string,
  status: 'draft' | 'published' | 'archived'
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('activities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/activities')
  revalidatePath('/dashboard')
}

export async function deleteActivity(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('activities').delete().eq('id', id).eq('organizer_id', user.id)

  revalidatePath('/dashboard/activities')
  revalidatePath('/dashboard')
}

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

export async function createActivity(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const title = (formData.get('title') as string)?.trim()
  if (!title) return

  await supabase.from('activities').insert({
    organizer_id: user.id,
    title,
    description: (formData.get('description') as string)?.trim() || null,
    status: (formData.get('status') as string) || 'draft',
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
      profile.onboarding_status === 'profile_created')
  ) {
    await supabase
      .from('profiles')
      .update({ onboarding_status: 'first_activity_added' })
      .eq('id', user.id)
  }

  revalidatePath('/dashboard/activities')
  revalidatePath('/dashboard')
}

export async function updateActivity(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const title = (formData.get('title') as string)?.trim()
  if (!title) return

  await supabase
    .from('activities')
    .update({
      title,
      description: (formData.get('description') as string)?.trim() || null,
      status: (formData.get('status') as string) || 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/activities')
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

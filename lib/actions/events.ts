'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CalendarEvent } from '@/lib/types'

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('organizer_id', user.id)
    .order('date', { ascending: true })

  return (data ?? []) as CalendarEvent[]
}

export async function createCalendarEvent(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const title = (formData.get('title') as string)?.trim()
  const date = formData.get('date') as string
  if (!title || !date) return

  const startTime = (formData.get('start_time') as string) || null

  await supabase.from('calendar_events').insert({
    organizer_id: user.id,
    title,
    event_type: (formData.get('event_type') as string) || 'session',
    activity_id: (formData.get('activity_id') as string) || null,
    venue_id: (formData.get('venue_id') as string) || null,
    date,
    start_time: startTime,
    end_time: (formData.get('end_time') as string) || null,
    all_day: !startTime,
    notes: (formData.get('notes') as string)?.trim() || null,
  })

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')
}

export async function updateCalendarEvent(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const title = (formData.get('title') as string)?.trim()
  const date = formData.get('date') as string
  if (!title || !date) return

  const startTime = (formData.get('start_time') as string) || null

  await supabase
    .from('calendar_events')
    .update({
      title,
      event_type: (formData.get('event_type') as string) || 'session',
      activity_id: (formData.get('activity_id') as string) || null,
      venue_id: (formData.get('venue_id') as string) || null,
      date,
      start_time: startTime,
      end_time: (formData.get('end_time') as string) || null,
      all_day: !startTime,
      notes: (formData.get('notes') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('calendar_events').delete().eq('id', id).eq('organizer_id', user.id)

  revalidatePath('/dashboard/calendar')
}

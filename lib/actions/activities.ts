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

const ACTIVITY_STATUSES = new Set(['draft', 'published', 'archived'])
const ACTIVITY_CATEGORIES = new Set([
  'sports', 'arts', 'music', 'education', 'outdoor',
  'wellness', 'workshop', 'party', 'food', 'other',
])
const INDOOR_OUTDOOR = new Set(['indoor', 'outdoor', 'both'])

function cap(v: FormDataEntryValue | null, n: number): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, n) : null
}
function intField(v: FormDataEntryValue | null, max: number): number | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null
}
function enumField(v: FormDataEntryValue | null, allowed: Set<string>): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s && allowed.has(s) ? s : null
}

// Parses + validates the marketplace fields shared by create/update. Every
// value is bounded / whitelisted so malformed input can't reach the DB.
function parseFields(formData: FormData) {
  const priceRaw = (formData.get('price') as string)?.trim()
  const price = priceRaw ? Math.round(parseFloat(priceRaw) * 100) : null
  const langRaw = (formData.get('languages') as string)?.trim()
  const statusRaw = (formData.get('status') as string) || 'draft'

  return {
    title: cap(formData.get('title'), 120),
    description: cap(formData.get('description'), 4000),
    status: ACTIVITY_STATUSES.has(statusRaw) ? statusRaw : 'draft',
    category: enumField(formData.get('category'), ACTIVITY_CATEGORIES),
    price_cents:
      price != null && Number.isFinite(price) && price >= 0 ? Math.min(price, 100_000_000) : null,
    languages: langRaw
      ? langRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12)
      : null,
    min_age: intField(formData.get('min_age'), 150),
    max_age: intField(formData.get('max_age'), 150),
    city: cap(formData.get('city'), 120),
    country: cap(formData.get('country'), 120),
    indoor_outdoor: enumField(formData.get('indoor_outdoor'), INDOOR_OUTDOOR),
    venue_id: (formData.get('venue_id') as string) || null,
    duration_minutes: intField(formData.get('duration_minutes'), 100_000),
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

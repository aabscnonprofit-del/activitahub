'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { milesToKm } from '@/lib/alerts/constants'

export interface SavePrefsInput {
  categories: string[]
  language?: string | null
  radiusMiles?: number
  frequency?: 'immediate' | 'daily_digest'
  city?: string | null
  paused?: boolean
}

export async function saveAlertPreferences(input: SavePrefsInput): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const row = {
    profile_id: user.id,
    categories: Array.isArray(input.categories) ? input.categories.slice(0, 40) : [],
    language: input.language || null,
    radius_km: input.radiusMiles ? milesToKm(input.radiusMiles) : 40,
    frequency: input.frequency === 'daily_digest' ? 'daily_digest' : 'immediate',
    city: (input.city || '').trim().slice(0, 120) || null,
    paused: !!input.paused,
    updated_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase
      .from('alert_preferences')
      .upsert(row, { onConflict: 'profile_id' })
    if (error) return { ok: false }
  } catch {
    return { ok: false }
  }
  revalidatePath('/notifications/preferences')
  return { ok: true }
}

export async function savePushSubscription(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false }

  try {
    await supabase.from('push_subscriptions').upsert(
      { profile_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: 'endpoint' },
    )
    // Make sure a preferences row exists with push enabled.
    await supabase
      .from('alert_preferences')
      .upsert({ profile_id: user.id, push: true, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' })
  } catch {
    return { ok: false }
  }
  return { ok: true }
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  try {
    await supabase.from('push_subscriptions').delete().eq('profile_id', user.id).eq('endpoint', endpoint)
    await supabase
      .from('alert_preferences')
      .upsert({ profile_id: user.id, push: false, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' })
  } catch {
    return { ok: false }
  }
  return { ok: true }
}

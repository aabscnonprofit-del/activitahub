import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type { AlertPreferences } from '@/lib/types'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Load a participant's alert preferences, or null (incl. when the table is absent). */
export async function getAlertPreferences(
  supabase: ServerClient,
  userId: string,
): Promise<AlertPreferences | null> {
  try {
    const { data } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle()
    return (data as AlertPreferences) ?? null
  } catch {
    return null
  }
}

/** Whether the participant has at least one active browser-push subscription. */
export async function hasPushSubscription(
  supabase: ServerClient,
  userId: string,
): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', userId)
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

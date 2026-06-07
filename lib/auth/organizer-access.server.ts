import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { hasOrganizerAccess } from './organizer-access'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Server-side entitlement check for organizer write actions. Loads the user's
 * role + included-access window + subscription status using the caller's
 * RLS-scoped client and applies hasOrganizerAccess().
 *
 * Mirrors the middleware navigation gate so that publishing/managing/accepting
 * is blocked at the action layer too — critical because the certified_organizer
 * role persists after the window expires (middleware guards pages, not writes).
 */
export async function userHasOrganizerAccess(
  supabase: ServerClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organizer_access_until')
    .eq('id', userId)
    .single()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('profile_id', userId)
    .maybeSingle()

  return hasOrganizerAccess({
    role: (profile as { role?: string } | null)?.role,
    subscriptionStatus: (sub as { status?: string } | null)?.status,
    organizerAccessUntil: (profile as { organizer_access_until?: string | null } | null)?.organizer_access_until,
  })
}

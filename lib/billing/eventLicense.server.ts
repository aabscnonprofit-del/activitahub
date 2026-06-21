import 'server-only'
import { createClient } from '@/lib/supabase/server'

// Read-only entitlement helpers for the One Event License. Owner-scoped via RLS
// (event_licenses_select_own). No gating is enforced anywhere yet — these exist so
// surfaces can reflect ownership (e.g. a "license active" banner).

/** Count of ACTIVE (unused) One Event Licenses owned by the signed-in user. */
export async function getActiveEventLicenseCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from('event_licenses')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('status', 'active')
  return count ?? 0
}

/** True if the signed-in user holds at least one active One Event License. */
export async function hasActiveEventLicense(): Promise<boolean> {
  return (await getActiveEventLicenseCount()) > 0
}

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { OrganizerConnectAccount } from '@/lib/types'

/**
 * Load the current user's Stripe Connect account row (migration 035), or null
 * if they have none yet. RLS owner-scoped (organizer_connect_accounts grants the
 * owner SELECT only), so this returns nothing for any other user's row.
 *
 * Read-only: this commit does not create accounts or onboarding links. Pair with
 * deriveConnectStatus / organizerCanReceivePayments (lib/billing/connect.ts) to
 * turn the row into a status or the receive-payments gate.
 */
export async function getMyConnectAccount(): Promise<OrganizerConnectAccount | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('organizer_connect_accounts')
    .select('*')
    .eq('organizer_id', user.id)
    .maybeSingle()

  return (data as OrganizerConnectAccount) ?? null
}

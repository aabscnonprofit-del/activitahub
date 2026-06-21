import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { hasIncludedAccess } from '@/lib/auth/organizer-access'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ViewerAccessKind = 'paid' | 'included' | 'none'

/**
 * Viewer state for adapting public-page CTAs (no redirects, no logic changes).
 * Reuses the canonical access helpers. `accessKind` is null when the viewer is
 * not an organizer.
 */
export interface ViewerCtaState {
  isAuthenticated: boolean
  isOrganizer: boolean
  accessKind: ViewerAccessKind | null
}

export async function getViewerCtaState(supabase: ServerClient): Promise<ViewerCtaState> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isAuthenticated: false, isOrganizer: false, accessKind: null }

  const { data: prof } = await supabase
    .from('profiles')
    .select('role, organizer_access_until')
    .eq('id', user.id)
    .maybeSingle()
  const role = (prof as { role?: string } | null)?.role
  const isOrganizer = role === 'certified_organizer' || role === 'admin'
  if (!isOrganizer) return { isAuthenticated: true, isOrganizer: false, accessKind: null }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('profile_id', user.id)
    .maybeSingle()
  const status = (sub as { status?: string } | null)?.status
  const until = (prof as { organizer_access_until?: string | null } | null)?.organizer_access_until

  const accessKind: ViewerAccessKind =
    status === 'active' || status === 'trialing'
      ? 'paid'
      : hasIncludedAccess(until)
        ? 'included'
        : 'none'

  return { isAuthenticated: true, isOrganizer: true, accessKind }
}

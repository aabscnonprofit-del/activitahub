import 'server-only'
import { createClient as createJsClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server code that must
 * act across users (e.g. fanning Activity Alerts out to many participants).
 * Never expose to the client. Throws if the service key is not configured.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service-role client not configured')
  return createJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

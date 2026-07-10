import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Uses the anon key — RLS policies govern all access.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies are read-only.
            // The middleware handles cookie refresh for session persistence.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client with the service role key that TRULY bypasses RLS.
 * Use ONLY in trusted server-side contexts (webhooks, admin actions, public-safe projections that read
 * owner-only tables on behalf of any visitor). Never expose to the client.
 *
 * It deliberately does NOT read the request's auth cookies. @supabase/ssr derives the outgoing Authorization
 * header from the session cookies; if a user is signed in, that would send THEIR JWT and PostgREST would run
 * as that user — silently re-applying RLS and hiding owner-only rows (e.g. project_event_plans_v2) from every
 * non-owner viewer. So this client is given no cookies and its Authorization is pinned to the service-role key,
 * making it service_role for every caller regardless of who is logged in.
 */
export async function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      // No session: never inherit the caller's cookies.
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
      // Belt-and-suspenders: force the service-role key as the bearer token.
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    }
  )
}

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Handles the Supabase PKCE auth callback.
 *
 * Called after:
 * - Email confirmation (sign-up)
 * - Password reset (redirects user to update-password page)
 *
 * The `next` search param controls where to redirect on success.
 * Supabase sets this via the `emailRedirectTo` option in auth calls.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only allow same-origin relative paths to prevent open redirects.
  const rawNext = searchParams.get('next') ?? '/en/activities'
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/en/activities'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(
            cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Session established — redirect to the intended (same-origin) destination
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Code missing or exchange failed — send back to sign-in with error flag
  const errorUrl = new URL('/en/sign-in', origin)
  errorUrl.searchParams.set('error', 'auth_callback_failed')
  return NextResponse.redirect(errorUrl)
}

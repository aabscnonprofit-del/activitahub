import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { routing } from '@/i18n/routing'
import type { UserRole, OnboardingStatus } from '@/lib/types'

// ── i18n middleware ───────────────────────────────────────────────────────────

const handleI18nRouting = createMiddleware(routing)

// ── Path classification helpers ───────────────────────────────────────────────

/**
 * Paths (without locale prefix) that require authentication.
 * Everything NOT in this list is publicly accessible.
 */
const AUTH_REQUIRED_PREFIXES = [
  '/account',
  '/onboarding',
  '/billing',
  // /academy itself is a PUBLIC marketing landing; only the gated course
  // surfaces below require auth (and the academy access check still applies).
  '/academy/exam',
  '/academy/certificate',
  '/academy/lessons',
  '/dashboard',
  '/admin',
  '/requests',
  '/bookings',
  '/notifications',
]

/**
 * Paths where already-authenticated users should be redirected away.
 */
const REDIRECT_IF_AUTHED_PREFIXES = ['/sign-in', '/sign-up']

function getLocaleFromPathname(pathname: string): string {
  const segment = pathname.split('/')[1] ?? ''
  return (routing.locales as readonly string[]).includes(segment)
    ? segment
    : routing.defaultLocale
}

function stripLocale(pathname: string, locale: string): string {
  const stripped = pathname.startsWith(`/${locale}`)
    ? pathname.slice(`/${locale}`.length)
    : pathname
  return stripped || '/'
}

function requiresAuth(path: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}

function shouldRedirectIfAuthed(path: string): boolean {
  return REDIRECT_IF_AUTHED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}

// ── Main middleware ───────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = getLocaleFromPathname(pathname)
  const path = stripLocale(pathname, locale)

  // Build the base i18n response (handles locale prefix redirects)
  let response = handleI18nRouting(request)

  // If next-intl returned a redirect (missing locale prefix), honour it immediately
  if (response.status === 307 || response.status === 308) {
    return response
  }

  // Create Supabase client that reads cookies from the request
  // and writes refreshed session cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Write cookies to both the request (for subsequent reads in this
          // request cycle) and the response (for the browser)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Re-create response so cookie Set-headers are applied cleanly
          response = handleI18nRouting(request)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session token — this is the canonical Supabase SSR pattern.
  // getUser() validates the JWT with the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Authenticated users on sign-in/sign-up → redirect to appropriate page ──

  if (user && shouldRedirectIfAuthed(path)) {
    // Honour an explicit organizer-intent `next` (e.g. ?next=/en/onboarding);
    // otherwise land on the participant home, NOT organizer onboarding.
    const nextParam = request.nextUrl.searchParams.get('next')
    const dest =
      nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
        ? nextParam
        : `/${locale}/account`
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // ── Unauthenticated users on protected paths → sign-in ────────────────────

  if (!user && requiresAuth(path)) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url)
    // Preserve the intended destination for post-login redirect
    signInUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // ── Authenticated users: enforce zone-specific rules ──────────────────────

  if (user && requiresAuth(path)) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role, onboarding_status, suspended')
      .eq('id', user.id)
      .single()

    const role = profileRow?.role as UserRole | undefined
    const status = profileRow?.onboarding_status as OnboardingStatus | undefined
    const suspended = profileRow?.suspended as boolean | undefined

    // Suspended accounts: sign out and redirect
    if (suspended) {
      await supabase.auth.signOut()
      const url = new URL(`/${locale}/sign-in`, request.url)
      url.searchParams.set('reason', 'suspended')
      const redirectResponse = NextResponse.redirect(url)
      // Clear the session cookie
      redirectResponse.cookies.delete('sb-access-token')
      redirectResponse.cookies.delete('sb-refresh-token')
      return redirectResponse
    }

    // ── /dashboard zone: certified_organizer + subscribed ─────────────────
    if (path.startsWith('/dashboard')) {
      if (role !== 'certified_organizer' && role !== 'admin') {
        if (status === 'certified') {
          // Certified but no active subscription → billing
          return NextResponse.redirect(
            new URL(`/${locale}/billing`, request.url)
          )
        }
        // Not certified → onboarding
        return NextResponse.redirect(
          new URL(`/${locale}/onboarding`, request.url)
        )
      }

      // Subscription gate: organizers need an ACTIVE subscription to reach the
      // dashboard. Admins bypass. Read is RLS-scoped to the user's own row.
      if (role === 'certified_organizer') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (sub?.status !== 'active') {
          return NextResponse.redirect(
            new URL(`/${locale}/billing`, request.url)
          )
        }
      }
    }

    // ── /admin zone: admin role only ──────────────────────────────────────
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
    }

    // ── /academy zone: students who have paid for certification ──────────
    if (path.startsWith('/academy') && role !== 'admin') {
      const hasAccess =
        role === 'certified_organizer' ||
        status === 'payment_complete' ||
        status === 'certified' ||
        status === 'subscribed'

      if (!hasAccess) {
        // Not yet paid — send back to onboarding (which routes to payment).
        return NextResponse.redirect(
          new URL(`/${locale}/onboarding`, request.url)
        )
      }
    }

    // ── /billing and /onboarding: any authenticated user ─────────────────
    // No additional checks needed — already passed the auth guard above
  }

  return response
}

export const config = {
  // Run on all paths except Next.js internals, API routes, and any static
  // file with an extension (favicon, icon.png, apple-icon.png,
  // opengraph-image.png, logo.png, robots.txt, …). Without the extension
  // exclusion these brand assets get locale-redirected and fail to load.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.[\\w]+$).*)',
  ],
}

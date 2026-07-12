import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { routing } from '@/i18n/routing'
import { hasOrganizerAccess } from '@/lib/auth/organizer-access'
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

/**
 * The project id when `path` targets a Project Workspace route — `/dashboard/projects/<uuid>` or a
 * sub-route such as `.../budget` — else null. Used to scope One Event License access to the
 * purchaser's OWN project workspace only (never the rest of /dashboard).
 */
function projectWorkspaceId(path: string): string | null {
  const m = path.match(/^\/dashboard\/projects\/([0-9a-fA-F-]{36})(?:\/.*)?$/)
  return m ? m[1] : null
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
      .select('role, onboarding_status, suspended, organizer_access_until')
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
        // One Event License continuity: a One Event License purchaser may reach the Project
        // Workspace of a project they OWN — the single activity they paid to organize — and NOTHING
        // else in /dashboard. BOTH conditions are required: ownership (also RLS-enforced at the data
        // layer) AND a purchased license. This restores the approved One Event License workflow
        // without granting broader dashboard access; the certified-organizer + subscription checks
        // below are unchanged, and a user with no license still falls through to the redirect.
        const workspaceProjectId = projectWorkspaceId(path)
        let ownedLicensedWorkspace = false
        if (workspaceProjectId) {
          const [{ data: owned }, { data: license }] = await Promise.all([
            supabase
              .from('projects')
              .select('id')
              .eq('id', workspaceProjectId)
              .eq('owner_id', user.id)
              .maybeSingle(),
            supabase
              .from('event_licenses')
              .select('id')
              .eq('profile_id', user.id)
              .limit(1)
              .maybeSingle(),
          ])
          ownedLicensedWorkspace = !!owned && !!license
        }

        if (!ownedLicensedWorkspace) {
          if (status === 'certified') {
            // Certified but no active subscription → billing
            return NextResponse.redirect(
              new URL(`/${locale}/billing`, request.url)
            )
          }
          // Not certified and not their own licensed Project Workspace → onboarding
          return NextResponse.redirect(
            new URL(`/${locale}/onboarding`, request.url)
          )
        }
        // Own licensed Project Workspace → allow through (no subscription required for one's own
        // purchased activity). Fall past the /dashboard gate to the i18n response.
      }

      // Access gate: organizers reach the dashboard with EITHER an active/
      // trialing paid subscription OR a live certification-included 30-day
      // window. Admins bypass. Reads are RLS-scoped to the user's own rows.
      if (role === 'certified_organizer') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('profile_id', user.id)
          .maybeSingle()

        const allowed = hasOrganizerAccess({
          role,
          subscriptionStatus: (sub as { status?: string } | null)?.status,
          organizerAccessUntil: (profileRow as { organizer_access_until?: string | null } | null)?.organizer_access_until,
        })

        if (!allowed) {
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

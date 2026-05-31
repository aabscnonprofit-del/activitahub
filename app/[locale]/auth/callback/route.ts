import { NextResponse } from 'next/server'

// The Supabase OAuth callback redirects to the URL set in Google OAuth,
// which should be /auth/callback (root). This route handles the case
// where someone navigates to the locale-prefixed version.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const locale = url.pathname.split('/')[1] || 'en'

  // Forward to root callback with locale
  const targetUrl = new URL('/auth/callback', url.origin)
  if (code) targetUrl.searchParams.set('code', code)
  targetUrl.searchParams.set('locale', locale)

  return NextResponse.redirect(targetUrl)
}

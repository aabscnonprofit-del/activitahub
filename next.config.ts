import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Baseline production security headers. CSP is intentionally omitted (Stripe /
// Supabase / next-image make a correct policy non-trivial) — tracked as a
// follow-up; these headers are safe and high-value on their own.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the file-tracing root to this project (a stray lockfile in the home dir
  // otherwise makes Next infer the wrong workspace root).
  outputFileTracingRoot: process.cwd(),
  // Activity/venue cover uploads ride through server actions as FormData; the
  // default 1 MB cap rejects normal photos before they reach Storage. Match the
  // app cover cap (MAX_COVER_BYTES = 8 MB in lib/actions/activities.ts).
  // Note: on Vercel the serverless request-body ceiling (~4.5 MB) can still apply
  // above that — a future client-direct-to-Storage upload would remove it.
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)

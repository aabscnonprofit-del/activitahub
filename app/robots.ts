import type { MetadataRoute } from 'next'

/**
 * Allow indexing of public surfaces (home, marketplace, organizer profiles,
 * pricing, legal) while keeping private/authenticated areas out of search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/dashboard',
          '/*/account',
          '/*/admin',
          '/*/billing',
          '/*/onboarding',
          '/*/bookings',
          '/*/requests',
          '/*/notifications',
          '/*/sign-in',
          '/*/sign-up',
          '/*/reset-password',
        ],
      },
    ],
  }
}

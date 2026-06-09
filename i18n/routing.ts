import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'fr', 'ru', 'de', 'pt'] as const,
  defaultLocale: 'en',
})

export type Locale = (typeof routing.locales)[number]

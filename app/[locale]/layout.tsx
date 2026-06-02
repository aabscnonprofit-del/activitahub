import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing, type Locale } from '@/i18n/routing'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: {
    default: 'ActivLife Hub',
    template: '%s | ActivLife Hub',
  },
  description:
    'Discover experiences from certified organizers near you — or get certified to host your own. Activate life together.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.activitahub.com'
  ),
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  // Reject unknown locales — next-intl will have redirected valid ones already
  if (!routing.locales.includes(locale as Locale)) {
    notFound()
  }

  // Load translation messages for this locale
  const messages = await getMessages()

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

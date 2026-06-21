'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { Menu, X, Globe, Bell, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand/BrandMark'
import { signOut } from '@/lib/actions/auth'
import { replaceLocaleInPath } from '@/i18n/locale-path'
import type { Locale } from '@/lib/types'

interface PublicHeaderProps {
  locale: Locale
  isAuthenticated: boolean
  /** Certified organizer / admin: swap the "Become an organizer" CTA for "Dashboard". */
  isOrganizer?: boolean
}

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
]

export function PublicHeader({ locale, isAuthenticated, isOrganizer = false }: PublicHeaderProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  // Build the same-page URL for locale switching: replace the leading locale
  // segment (or prepend if absent), preserving the query string and hash. The
  // previous regex missed `de`/`pt` and matched non-segment prefixes, producing
  // /pt/de-style 404s; replaceLocaleInPath fixes both.
  function localizedPath(targetLocale: Locale): string {
    const base = replaceLocaleInPath(pathname, targetLocale)
    if (typeof window === 'undefined') return base
    return base + window.location.search + window.location.hash
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 text-slate-900 hover:text-brand-600 transition-colors"
        >
          <BrandMark size={32} priority />
          <span className="hidden font-bold sm:block">ActivLife Hub</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={`/${locale}/marketplace`}
            className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
          >
            {t('marketplace')}
          </Link>
          <Link
            href={isOrganizer ? `/${locale}/dashboard` : `/${locale}/become-an-organizer`}
            className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
          >
            {isOrganizer ? t('dashboard') : t('becomeOrganizer')}
          </Link>
          <Link
            href={`/${locale}/academy`}
            className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
          >
            {t('academy')}
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
          >
            {t('pricing')}
          </Link>
        </nav>

        {/* Right: locale switcher + auth */}
        <div className="flex items-center gap-3">
          {/* Locale switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Switch language"
              aria-expanded={langOpen}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{locale}</span>
            </button>

            {langOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {LOCALES.map((loc) => (
                    <Link
                      key={loc.code}
                      href={localizedPath(loc.code)}
                      onClick={() => setLangOpen(false)}
                      className={cn(
                        'block px-4 py-2.5 text-sm transition-colors',
                        loc.code === locale
                          ? 'bg-brand-50 font-semibold text-brand-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {loc.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          {isAuthenticated && (
            <Link
              href={`/${locale}/notifications`}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
          )}

          {/* Auth buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href={`/${locale}/account`}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                >
                  {t('account')}
                </Link>
                <form action={signOut.bind(null, locale)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    title={t('signOut')}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden lg:inline">{t('signOut')}</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/sign-in`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t('signIn')}
                </Link>
                <Link
                  href={`/${locale}/sign-up`}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                >
                  {t('signUp')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href={`/${locale}`}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('home')}
            </Link>
            <Link
              href={`/${locale}/marketplace`}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('marketplace')}
            </Link>
            <Link
              href={isOrganizer ? `/${locale}/dashboard` : `/${locale}/become-an-organizer`}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {isOrganizer ? t('dashboard') : t('becomeOrganizer')}
            </Link>
            <Link
              href={`/${locale}/academy`}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('academy')}
            </Link>
            <Link
              href={`/${locale}/pricing`}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('pricing')}
            </Link>
            <div className="my-2 border-t border-slate-100" />
            {isAuthenticated ? (
              <>
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {t('account')}
                </Link>
                <form action={signOut.bind(null, locale)}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t('signOut')}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/sign-in`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t('signIn')}
                </Link>
                <Link
                  href={`/${locale}/sign-up`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {t('signUp')}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default PublicHeader

import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LogOut, Bell } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { BrandMark } from '@/components/brand/BrandMark'
import type { Locale } from '@/lib/types'

interface DashboardTopbarProps {
  locale: Locale
  fullName: string | null
  avatarUrl: string | null
}

/**
 * Dashboard topbar — Server Component.
 * Sign-out is a server action (no client JS needed).
 */
export async function DashboardTopbar({
  locale,
  fullName,
  avatarUrl,
}: DashboardTopbarProps) {
  const t = await getTranslations('nav')

  const signOutWithLocale = signOut.bind(null, locale)

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Logo */}
      <Link
        href={`/${locale}`}
        className="flex items-center gap-2 text-slate-900 hover:text-brand-600 transition-colors"
      >
        <BrandMark size={28} />
        <span className="hidden font-bold sm:block text-sm">ActivLife Hub</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell — wired in Phase 6B */}
        <button
          className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User avatar + name */}
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={fullName ?? 'User avatar'}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 ring-2 ring-white">
              <span className="text-xs font-semibold text-brand-700">
                {initials}
              </span>
            </div>
          )}
          {fullName && (
            <span className="hidden text-sm font-medium text-slate-700 md:block max-w-[120px] truncate">
              {fullName}
            </span>
          )}
        </div>

        {/* Sign out */}
        <form action={signOutWithLocale}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={t('signOut')}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('signOut')}</span>
          </button>
        </form>
      </div>
    </header>
  )
}

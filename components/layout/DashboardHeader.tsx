'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import {
  LayoutDashboard, User, Layers, Calendar,
  MapPin, Users, Settings, LogOut, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand/BrandMark'
import { useState } from 'react'

type Props = {
  locale: string
  userName: string | null
  avatarUrl: string | null
}

const navItems = [
  { key: 'overview' as const, icon: LayoutDashboard, suffix: '' },
  { key: 'profile' as const, icon: User, suffix: '/profile' },
  { key: 'activities' as const, icon: Layers, suffix: '/activities' },
  { key: 'calendar' as const, icon: Calendar, suffix: '/calendar' },
  { key: 'venues' as const, icon: MapPin, suffix: '/venues' },
  { key: 'clients' as const, icon: Users, suffix: '/clients' },
  { key: 'settings' as const, icon: Settings, suffix: '/settings' },
]

export default function DashboardHeader({ locale, userName, avatarUrl }: Props) {
  const t = useTranslations('dashboard.nav')
  const pathname = usePathname()
  const base = `/${locale}/dashboard`
  const [mobileOpen, setMobileOpen] = useState(false)

  const signOutAction = signOut.bind(null, locale)

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="container-page h-16 flex items-center justify-between gap-4">
        {/* Logo — inside the organizer's working environment, "home" is the Dashboard, not the
            public landing, so the organizer is never pulled back into customer-facing pages. */}
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 shrink-0">
          <BrandMark size={28} />
          <span className="font-extrabold text-slate-900 text-base hidden sm:block">
            ActivLife<span className="text-indigo-600">Hub</span>
          </span>
        </Link>

        {/* Desktop nav tabs */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {navItems.map(({ key, suffix }) => {
            const href = `${base}${suffix}`
            const isActive = suffix === '' ? pathname === base : pathname.startsWith(href)
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {t(key)}
              </Link>
            )
          })}
        </nav>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-3 shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold">
              {userName?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <span className="text-sm font-medium text-slate-700 hidden sm:block truncate max-w-[120px]">
            {userName ?? 'Organizer'}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Sign out">
              <LogOut size={16} />
            </button>
          </form>
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3">
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
            {navItems.map(({ key, icon: Icon, suffix }) => {
              const href = `${base}${suffix}`
              const isActive = suffix === '' ? pathname === base : pathname.startsWith(href)
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium transition-colors',
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  {t(key)}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

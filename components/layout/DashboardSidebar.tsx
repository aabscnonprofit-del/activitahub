import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  LayoutDashboard,
  Layers,
  ClipboardList,
  CalendarDays,
  BookOpen,
  Inbox,
  FileText,
  Users,
  UsersRound,
  MapPin,
  Store,
  HardHat,
  BarChart2,
  UserCircle,
  CreditCard,
  ShieldCheck,
  FolderKanban,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale, UserRole, OnboardingStatus } from '@/lib/types'

interface SidebarNavItem {
  key: string
  href: string
  icon: React.ElementType
  /** Optional literal label; when set, used instead of the i18n message for `key`. */
  label?: string
}

interface DashboardSidebarProps {
  locale: Locale
  role: UserRole
  onboardingStatus: OnboardingStatus
  currentPath: string
}

/**
 * Role-aware sidebar — Server Component.
 * Only renders nav items the current user is allowed to access.
 * Never shows greyed-out / locked items to users without access.
 */
export async function DashboardSidebar({
  locale,
  role,
  currentPath,
}: DashboardSidebarProps) {
  const t = await getTranslations('dashboard.nav')
  const base = `/${locale}/dashboard`

  // Primary — the Project workflow. This is the organizer's main world (Stage A: Project is primary).
  const primaryItems: SidebarNavItem[] = [
    { key: 'home', href: base, icon: LayoutDashboard },
    { key: 'projects', href: `${base}/projects`, icon: FolderKanban, label: 'Projects' },
    // History reuses the existing Participant History page (/me/history); literal label, no new i18n key.
    { key: 'history', href: `/${locale}/me/history`, icon: History, label: 'History' },
    { key: 'profile', href: `${base}/profile`, icon: UserCircle },
  ]

  // Classic — the legacy workflow, kept available for compatibility. Nothing removed; only grouped + separated.
  const legacyItems: SidebarNavItem[] = [
    { key: 'activities', href: `${base}/activities`, icon: Layers },
    { key: 'plans', href: `${base}/plans`, icon: ClipboardList },
    { key: 'calendar', href: `${base}/calendar`, icon: CalendarDays },
    { key: 'bookings', href: `${base}/bookings`, icon: BookOpen },
    { key: 'requests', href: `${base}/requests`, icon: Inbox },
    { key: 'proposals', href: `${base}/proposals`, icon: FileText },
    { key: 'clients', href: `${base}/clients`, icon: Users },
    { key: 'venues', href: `${base}/venues`, icon: MapPin },
    { key: 'vendors', href: `${base}/vendors`, icon: Store },
    { key: 'workers', href: `${base}/workers`, icon: UsersRound },
    { key: 'workerProfile', href: `${base}/worker-profile`, icon: HardHat },
    { key: 'analytics', href: `${base}/analytics`, icon: BarChart2 },
  ]

  // Billing is always accessible to authenticated users
  const billingItem: SidebarNavItem = {
    key: 'billing',
    href: `/${locale}/billing`,
    icon: CreditCard,
  }

  // Admin section — only for admin role
  const adminItem: SidebarNavItem = {
    key: 'admin',
    href: `/${locale}/admin`,
    icon: ShieldCheck,
  }

  // Organizer sees Primary + Classic; billing (and admin) trail. Non-organizers see billing only. Nothing removed.
  const isOrganizer = role === 'admin' || role === 'certified_organizer'
  const trailingItems: SidebarNavItem[] = role === 'admin' ? [billingItem, adminItem] : [billingItem]

  const renderItem = (item: SidebarNavItem) => {
    const Icon = item.icon
    // Exact match for home, prefix match for others
    const isActive = item.href === base ? currentPath === base : currentPath.startsWith(item.href)

    return (
      <Link
        key={item.key}
        href={item.href}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')}
          aria-hidden="true"
        />
        {item.label ?? t(item.key as Parameters<typeof t>[0])}
      </Link>
    )
  }

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <nav className="space-y-0.5" aria-label="Dashboard navigation">
        {isOrganizer && primaryItems.map(renderItem)}
        {isOrganizer && (
          <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Classic</p>
        )}
        {isOrganizer && legacyItems.map(renderItem)}
        {trailingItems.map(renderItem)}
      </nav>
    </aside>
  )
}

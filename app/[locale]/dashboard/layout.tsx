import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { DashboardTopbar } from '@/components/layout/DashboardTopbar'
import type { Locale, Profile } from '@/lib/types'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params as { locale: Locale }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already enforces auth, but be defensive
  if (!user) {
    redirect(`/${locale}/sign-in`)
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, onboarding_status, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const profile = profileRow as Pick<
    Profile,
    'role' | 'onboarding_status' | 'full_name' | 'avatar_url'
  > | null

  // Get the current request path to highlight active nav item
  const headersList = await headers()
  const currentPath = headersList.get('x-pathname') ?? `/${locale}/dashboard`

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Topbar — fixed at top (hidden when printing, e.g. proposal PDF export) */}
      <div className="print:hidden">
        <DashboardTopbar
          locale={locale}
          fullName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </div>

      <div className="flex flex-1">
        {/* Sidebar — sticky, rendered based on role; hidden when printing */}
        <div className="hidden lg:block print:hidden">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 w-60">
            <DashboardSidebar
              locale={locale}
              role={profile?.role ?? 'student'}
              onboardingStatus={profile?.onboarding_status ?? 'not_started'}
              currentPath={currentPath}
            />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

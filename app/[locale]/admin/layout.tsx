import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/lib/types'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('admin')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((prof as { role: string } | null)?.role !== 'admin') redirect(`/${locale}/dashboard`)

  const nav = [
    { key: 'dashboard', href: `/${locale}/admin` },
    { key: 'reviews', href: `/${locale}/admin/reviews` },
    { key: 'experienced', href: `/${locale}/admin/experienced` },
    { key: 'bookings', href: `/${locale}/admin/bookings` },
    { key: 'organizers', href: `/${locale}/admin/organizers` },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <span className="font-bold text-slate-900">{t('brand')}</span>
          </div>
          <nav className="flex gap-1 pb-2">
            {nav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {t(`nav.${n.key}` as 'nav.dashboard')}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}

import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { GraduationCap } from 'lucide-react'
import type { Locale } from '@/lib/types'

interface AcademyLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AcademyLayout({
  children,
  params,
}: AcademyLayoutProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('academy')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href={`/${locale}/academy`}
            className="flex items-center gap-2 text-slate-900"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold">{t('brand')}</span>
          </Link>
          <Link
            href={`/${locale}`}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t('exit')}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}

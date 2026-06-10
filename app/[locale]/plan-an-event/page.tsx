import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import PlannerClient from '@/components/planner/PlannerClient'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'planner' })
  return { title: t('title'), description: t('subtitle') }
}

export default async function PlanAnEventPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('planner')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="mb-6">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              {t('devNote')}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('title')}</h1>
            <p className="mt-2 text-base text-slate-600">{t('subtitle')}</p>
          </div>
          <PlannerClient />
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

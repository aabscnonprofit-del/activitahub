import { getTranslations } from 'next-intl/server'
import { CheckCircle2, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import PlannerClient from '@/components/planner/PlannerClient'
import { BuyEventLicenseButton } from '@/components/planner/BuyEventLicenseButton'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ purchase?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'planner' })
  return { title: t('title'), description: t('subtitle') }
}

export default async function PlanAnEventPage({ params, searchParams }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const { purchase } = await searchParams
  const t = await getTranslations('planner')
  const tL = await getTranslations('eventLicense')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          {/* One Event License — success / cancel feedback (success_url returns here). */}
          {purchase === 'success' && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
              <div>
                <p className="font-semibold text-green-900">{tL('success.title')}</p>
                <p className="text-sm text-green-800">{tL('success.body')}</p>
              </div>
            </div>
          )}
          {(purchase === 'cancelled' || purchase === 'error') && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-sm text-slate-600">
                {purchase === 'cancelled' ? tL('cancelled.body') : tL('error.body')}
              </p>
            </div>
          )}

          <div className="mb-6">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              {t('devNote')}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('title')}</h1>
            <p className="mt-2 text-base text-slate-600">{t('subtitle')}</p>
          </div>

          <PlannerClient />

          {/* Purchase entry point — platform checkout for the One Event License. */}
          {purchase !== 'success' && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-center">
              <p className="text-sm text-slate-600">{tL('panel.body')}</p>
              <div className="mx-auto mt-4 max-w-xs">
                <BuyEventLicenseButton
                  locale={locale}
                  buttonClassName="btn-primary w-full justify-center"
                />
              </div>
            </div>
          )}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CertificationCheckout } from '@/components/onboarding/CertificationCheckout'
import { ExperiencedApplicationForm } from '@/components/onboarding/ExperiencedApplicationForm'
import { switchToAcademyPath } from '@/lib/actions/experiencedReview'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'experiencedReview' })
  return { title: t('metaTitle') }
}

export default async function ExperiencedReviewPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('experiencedReview')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('selected_path, onboarding_status')
    .eq('id', user.id)
    .single()
  const sel = (profile as { selected_path: string | null } | null)?.selected_path ?? null

  // Only the experienced path uses the review queue. (Redirected applicants have
  // selected_path='beginner' and fall back to the standard onboarding flow.)
  if (sel !== 'experienced') redirect(`/${locale}/onboarding`)

  // Already past onboarding (paid/certified/subscribed) → let onboarding route them.
  const status = (profile as { onboarding_status: string } | null)?.onboarding_status
  if (status === 'payment_complete' || status === 'certified' || status === 'subscribed') {
    redirect(`/${locale}/onboarding`)
  }

  const { data: app } = await supabase.rpc('get_experienced_application')
  const appStatus = (app as { status?: string } | null)?.status ?? 'none'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {appStatus === 'none' && <ExperiencedApplicationForm locale={locale} />}

        {(appStatus === 'under_review' || appStatus === 'approved') && (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-brand-600" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">{t('underReview.title')}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              {t('underReview.body')}
            </p>
          </div>
        )}

        {appStatus === 'activated' && (
          <div className="mx-auto max-w-xl">
            <div className="card mb-6 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-bold text-slate-900">{t('activated.title')}</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                {t('activated.body')}
              </p>
            </div>
            <CertificationCheckout locale={locale} path="experienced" />
          </div>
        )}

        {appStatus === 'rejected' && (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">{t('rejected.title')}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              {t('rejected.body')}
            </p>
            <form action={switchToAcademyPath} className="mt-6">
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn-primary w-full justify-center">
                {t('rejected.academyCta')}
              </button>
            </form>
            <Link
              href={`/${locale}/marketplace`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              {t('rejected.browseCta')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* No 'redirected' branch: admin Redirect sets selected_path='beginner', so the
            guard above bounces these users to /onboarding before this page renders. */}
      </div>
    </div>
  )
}

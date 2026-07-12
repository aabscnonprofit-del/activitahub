import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import type { Locale } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function TermsPage({ params }: Props) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('terms')

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />
      <div className="flex-1 container-page py-16 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{t('title')}</h1>
        <p className="text-slate-400 text-sm mb-10">{t('lastUpdated')}</p>

        <div className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance</h2>
            <p>By using ActivLife Hub, you agree to these Terms. If you disagree, please do not use the platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Your Account</h2>
            <p>You are responsible for your account and all activity that occurs under it. You must be at least 16 years old to create an account.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Acceptable Use</h2>
            <p>You may use ActivLife Hub to manage your activities, venues, clients, and calendar. You may not use the platform to distribute harmful content or violate others&apos; rights.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Your Content</h2>
            <p>Activities, venues, and client data you create remain yours. We store it to provide the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Subscriptions</h2>
            <p>Free accounts are free forever. Pro subscriptions billing details will be published when payments launch.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Limitation of Liability</h2>
            <p>ActivLife Hub is provided &ldquo;as is.&rdquo; We are not responsible for outcomes of activities organized using our platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Contact</h2>
            <p>Questions? Email <a href="mailto:hello@activitahub.com" className="text-indigo-600 hover:underline">hello@activitahub.com</a>.</p>
          </section>
        </div>
      </div>
      <PublicFooter locale={locale} />
    </div>
  )
}

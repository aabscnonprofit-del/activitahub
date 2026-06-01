import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import type { Locale } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params as { locale: Locale }
  const t = await getTranslations('privacy')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <div className="flex-1 container-page py-16 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{t('title')}</h1>
        <p className="text-slate-400 text-sm mb-10">{t('lastUpdated')}</p>

        <div className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. What We Collect</h2>
            <p>When you sign in with Google, we receive your name, email address, and profile picture. We store this to create and identify your account. We also collect the activities, venues, clients, and events you create in ActivLife Hub.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Data</h2>
            <p>We use your data to operate the platform — to show you your activities, venues, clients, and calendar. We do not sell your data. We do not show you ads.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Storage</h2>
            <p>Your data is stored in Supabase with row-level security. Your private data is never accessible to other users.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Your Rights</h2>
            <p>You can delete your account at any time from Settings. Deletion removes all your personal data from our systems within 30 days.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Contact</h2>
            <p>Questions? Email us at <a href="mailto:hello@activitahub.com" className="text-indigo-600 hover:underline">hello@activitahub.com</a>.</p>
          </section>
        </div>
      </div>
      <PublicFooter locale={locale} />
    </div>
  )
}

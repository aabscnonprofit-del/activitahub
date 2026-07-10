import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NewPlanForm from '@/components/dashboard/NewPlanForm'

// Organizer create → persist (M5 WP2). Auth-gated page hosting the create form;
// on submit it calls createPlan() and redirects to the saved plan detail.

type Props = { params: Promise<{ locale: string }> }

export default async function NewPlanPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'workspace' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Link href={`/${locale}/dashboard/plans`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {t('backToPlans')}
      </Link>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">{t('newPlan')}</h1>
      <NewPlanForm locale={locale} />
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/actions/opePlans'
import PlanDetailClient from '@/components/dashboard/PlanDetailClient'

// Organizer detail view of a saved OPE plan. Loads from PlanStore (getPlan →
// ope_plans) on the server, then hands off to PlanDetailClient, which renders the
// persisted result read-only and hosts the WP5.1 inputs editor (Save & Recalculate
// → updatePlanInputs). The engine is never run on read; recompute is server-side.

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function SavedPlanPage({ params }: Props) {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'workspace' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const backLink = (
    <Link href={`/${locale}/dashboard/plans`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" /> {t('backToPlans')}
    </Link>
  )

  const res = await getPlan(id)

  if (!res.success || !res.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {backLink}
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{t('notFound')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {backLink}
      <PlanDetailClient initialPlan={res.data} />
    </div>
  )
}

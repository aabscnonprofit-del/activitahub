import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/actions/opePlans'
import PlanDetailClient from '@/components/dashboard/PlanDetailClient'
import VendorSourcingPanel from '@/components/vendors/VendorSourcingPanel'
import InvoicesPanel from '@/components/dashboard/InvoicesPanel'
import OpeOutputPreview from '@/components/dashboard/OpeOutputPreview'
import { assembleOpeOutput } from '@/lib/ope/output-contract'
import type { Locale } from '@/lib/types'

// Organizer detail view of a saved OPE plan. Loads from PlanStore (getPlan →
// ope_plans) on the server, then hands off to PlanDetailClient, which renders the
// persisted result read-only and hosts the WP5.1 inputs editor (Save & Recalculate
// → updatePlanInputs). The engine is never run on read; recompute is server-side.

type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ invoiceError?: string }>
}

export default async function SavedPlanPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  const { invoiceError } = await searchParams
  const t = await getTranslations({ locale, namespace: 'workspace' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

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

  // Assemble the OPE Output Contract V1 from the SAVED PlannerOutput (read-only;
  // the engine is not run here). Null when the saved result has no plan.
  const opeOutput = res.data.result.plan ? assembleOpeOutput(res.data.result.plan) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {backLink}
      {/* Stage D — bridge into the Project world: from a plan straight to its Project workspace
          (publish / visibility / occurrence / public activity live there). Reuses the plan's project_id. */}
      {res.data.project_id && (
        <Link
          href={`/${locale}/dashboard/projects/${res.data.project_id}`}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Open project workspace →
        </Link>
      )}
      <PlanDetailClient initialPlan={res.data} />
      <VendorSourcingPanel plan={res.data} locale={locale as Locale} />
      <InvoicesPanel plan={res.data} locale={locale as Locale} errorCode={invoiceError} />
      <OpeOutputPreview output={opeOutput} />
    </div>
  )
}

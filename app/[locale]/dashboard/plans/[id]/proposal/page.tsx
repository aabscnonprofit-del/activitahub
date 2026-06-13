import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/actions/opePlans'
import { buildProposal } from '@/lib/workspace/proposal'
import ProposalDocument from '@/components/dashboard/ProposalDocument'

// Proposal Generator V1 (C2) — client-facing proposal for a saved OPE plan.
// Loads the plan owner-only via getPlan (the /dashboard gate already requires a
// certified organizer), maps it deterministically with buildProposal, and renders
// ProposalDocument. No persistence, no export — generated live from the saved plan.
// Distinct route from the /dashboard/proposals marketplace surface.

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function PlanProposalPage({ params }: Props) {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'proposal' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const backLink = (
    <Link href={`/${locale}/dashboard/plans/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" /> {t('back')}
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

  const vm = buildProposal(res.data)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {backLink}
      <ProposalDocument vm={vm} />
    </div>
  )
}

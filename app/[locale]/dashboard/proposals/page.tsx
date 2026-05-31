import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, Proposal, ProposalStatus, ActivityCategory, RequestStatus } from '@/lib/types'

const VARIANT: Record<ProposalStatus, 'default' | 'success' | 'neutral' | 'warning'> = {
  sent: 'warning', accepted: 'success', declined: 'neutral', withdrawn: 'neutral',
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function OrganizerProposalsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('requests')
  const tm = await getTranslations('marketplace')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data } = await supabase
    .from('proposals')
    .select('*, request:customer_requests(event_type, city, status)')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  const proposals = (data ?? []) as unknown as (Proposal & {
    request: { event_type: ActivityCategory; city: string | null; status: RequestStatus } | null
  })[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('organizer.proposalsTitle')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('organizer.proposalsSubtitle')}</p>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('organizer.proposalsEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {p.request ? tm(`categories.${p.request.event_type}` as 'categories.sports') : '—'}
                  </h3>
                  <Badge label={t(`proposalStatus.${p.status}` as 'proposalStatus.sent')} variant={VARIANT[p.status]} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {[p.request?.city, p.proposed_date ? formatDate(p.proposed_date, 'UTC', locale) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="shrink-0 font-bold text-slate-900">{formatPrice(p.price_cents, p.currency, locale) ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

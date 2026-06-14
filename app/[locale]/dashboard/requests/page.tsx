import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox, CalendarDays, Users, Sparkles, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { sendProposal } from '@/lib/actions/requests'
import { generatePlanFromRequestAction } from '@/lib/actions/opePlans'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, CustomerRequest, Proposal } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ planError?: string }>
}

export default async function OrganizerRequestsPage({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const { planError } = await searchParams
  const t = await getTranslations('requests')
  const tm = await getTranslations('marketplace')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const [{ data: matchRows }, { data: propRows }, { data: actRows }, { data: planRows }] = await Promise.all([
    supabase
      .from('request_matches')
      .select('id, created_at, request:customer_requests(*)')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('proposals').select('request_id, price_cents, status').eq('organizer_id', user.id),
    supabase.from('activities').select('id, title').eq('organizer_id', user.id).eq('status', 'published'),
    supabase.from('ope_plans').select('id, source_request_id').eq('organizer_id', user.id).not('source_request_id', 'is', null),
  ])

  const matches = (matchRows ?? []) as unknown as { id: string; request: CustomerRequest | null }[]
  const requests = matches.map((m) => m.request).filter((r): r is CustomerRequest => !!r)
  const proposalByRequest = new Map<string, Pick<Proposal, 'price_cents' | 'status'>>()
  for (const p of (propRows ?? []) as { request_id: string; price_cents: number | null; status: Proposal['status'] }[]) {
    proposalByRequest.set(p.request_id, { price_cents: p.price_cents, status: p.status })
  }
  const activities = (actRows ?? []) as { id: string; title: string }[]
  const planByRequest = new Map<string, string>()
  for (const p of (planRows ?? []) as { id: string; source_request_id: string }[]) {
    planByRequest.set(p.source_request_id, p.id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('organizer.title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('organizer.subtitle')}</p>
      </div>

      {planError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('organizer.planError')}: {planError}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('organizer.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const existing = proposalByRequest.get(r.id)
            const closed = r.status === 'booked' || r.status === 'cancelled' || r.status === 'closed'
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {tm(`categories.${r.event_type}` as 'categories.sports')}
                  </h3>
                  {existing && <Badge label={t('organizer.proposalSent')} variant="success" />}
                  {closed && <Badge label={t(`status.${r.status}` as 'status.open')} variant="neutral" />}
                </div>
                <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-500">
                  {r.city && <span>{r.city}{r.country ? `, ${r.country}` : ''}</span>}
                  {r.desired_date && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(r.desired_date, 'UTC', locale)}</span>}
                  {r.participant_count != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{r.participant_count}</span>}
                  {r.budget_cents != null && <span>{t('detail.budget')}: {formatPrice(r.budget_cents, r.currency, locale)}</span>}
                </div>
                {r.notes && <p className="mt-2 text-sm text-slate-600">{r.notes}</p>}

                {/* OPE Task #1: generate (or open) a deterministic OPE plan for this request. */}
                <div className="mt-3">
                  {planByRequest.has(r.id) ? (
                    <Link href={`/${locale}/dashboard/plans/${planByRequest.get(r.id)}`} className="btn-secondary inline-flex w-fit items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {t('organizer.openPlan')}
                    </Link>
                  ) : (
                    <form action={generatePlanFromRequestAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="request_id" value={r.id} />
                      <button className="btn-secondary inline-flex w-fit items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        {t('organizer.generatePlan')}
                      </button>
                    </form>
                  )}
                </div>

                {!closed && (
                  <form action={sendProposal} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="request_id" value={r.id} />
                    <div>
                      <label className="label-base">{t('proposalForm.activity')}</label>
                      <select name="activity_id" className="input-base">
                        <option value="">{t('proposalForm.none')}</option>
                        {activities.map((a) => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-base">{t('proposalForm.price')}</label>
                        <input name="price" type="number" min="0" step="0.01" defaultValue={existing?.price_cents != null ? existing.price_cents / 100 : ''} className="input-base" />
                      </div>
                      <div>
                        <label className="label-base">{t('proposalForm.date')}</label>
                        <input name="proposed_date" type="date" defaultValue={r.desired_date ?? ''} className="input-base" />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-base">{t('proposalForm.message')}</label>
                      <textarea name="message" rows={2} className="input-base resize-none" />
                    </div>
                    <div className="sm:col-span-2">
                      <button className="btn-primary">{existing ? t('proposalForm.update') : t('proposalForm.send')}</button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check, X, CalendarDays, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { acceptProposal, declineProposal } from '@/lib/actions/requests'
import MessageThread from '@/components/messaging/MessageThread'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, CustomerRequest, Proposal } from '@/lib/types'

interface RequestDetailProps {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RequestDetailPage({ params, searchParams }: RequestDetailProps) {
  const { locale, id } = (await params) as { locale: Locale; id: string }
  const sp = await searchParams
  const t = await getTranslations('requests')
  const tm = await getTranslations('marketplace')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data: reqRow } = await supabase
    .from('customer_requests')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle()
  if (!reqRow) redirect(`/${locale}/requests`)
  const request = reqRow as CustomerRequest

  const { data: propRows } = await supabase
    .from('proposals')
    .select('*')
    .eq('request_id', id)
    .order('price_cents', { ascending: true })
  const proposals = (propRows ?? []) as Proposal[]

  // Public organizer display names.
  const orgIds = [...new Set(proposals.map((p) => p.organizer_id))]
  const nameById = new Map<string, string>()
  if (orgIds.length) {
    const { data: orgs } = await supabase
      .from('organizer_profiles')
      .select('user_id, display_name')
      .in('user_id', orgIds)
    for (const o of (orgs ?? []) as { user_id: string; display_name: string | null }[]) {
      if (o.display_name) nameById.set(o.user_id, o.display_name)
    }
  }

  const canAct = request.status !== 'booked' && request.status !== 'cancelled'
  const error = typeof sp.error === 'string' ? sp.error : null
  const nextMsg =
    request.status === 'booked'
      ? t('detail.nextBooked')
      : proposals.length > 0
        ? t('detail.nextProposals')
        : t('detail.nextOpen')
  const hasActionable = canAct && proposals.some((p) => p.status === 'sent')

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Link href={`/${locale}/requests`} className="text-sm text-slate-500 hover:text-slate-800">← {t('detail.back')}</Link>

          {/* Request summary */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">
                {tm(`categories.${request.event_type}` as 'categories.sports')}
              </h1>
              <Badge label={t(`status.${request.status}` as 'status.open')} variant={request.status === 'booked' ? 'success' : 'info'} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
              {request.city && <span>{request.city}{request.country ? `, ${request.country}` : ''}</span>}
              {request.desired_date && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(request.desired_date, 'UTC', locale)}</span>}
              {request.participant_count != null && <span>{t('detail.participants', { n: request.participant_count })}</span>}
              {(request.age_min != null || request.age_max != null) && <span>{t('detail.ages')} {request.age_min ?? 0}–{request.age_max ?? '∞'}</span>}
              {request.budget_cents != null && <span>{t('detail.budget')}: {formatPrice(request.budget_cents, request.currency, locale)}</span>}
            </div>
            {request.notes && <p className="mt-3 text-sm text-slate-600">{request.notes}</p>}
          </div>

          {/* What happens now — status-aware reassurance */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-relaxed text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>{nextMsg}</span>
          </div>

          {/* Proposals */}
          <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">{t('detail.proposals')} ({proposals.length})</h2>
          {hasActionable && <p className="mb-3 -mt-1 text-xs text-slate-500">{t('detail.acceptHint')}</p>}
          {error && <div className="mb-3"><Alert variant="error" message={error} /></div>}

          {proposals.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">{t('detail.noProposals')}</p>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/${locale}/organizers/${p.organizer_id}`} className="flex items-center gap-1 font-semibold text-slate-900 hover:underline">
                        {nameById.get(p.organizer_id) ?? t('detail.organizer')}
                      </Link>
                      {p.proposed_date && (
                        <p className="mt-0.5 text-xs text-slate-500">{t('detail.proposedDate')}: {formatDate(p.proposed_date, 'UTC', locale)}</p>
                      )}
                      {p.message && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{p.message}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold text-slate-900">{formatPrice(p.price_cents, p.currency, locale) ?? '—'}</p>
                      {p.status !== 'sent' && (
                        <Badge label={t(`proposalStatus.${p.status}` as 'proposalStatus.accepted')} variant={p.status === 'accepted' ? 'success' : 'neutral'} className="mt-1" />
                      )}
                    </div>
                  </div>

                  {canAct && p.status === 'sent' && (
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                      <form action={acceptProposal}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="proposal_id" value={p.id} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <button className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                          <Check className="h-4 w-4" />{t('detail.accept')}
                        </button>
                      </form>
                      <form action={declineProposal}>
                        <input type="hidden" name="proposal_id" value={p.id} />
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                          <X className="h-4 w-4" />{t('detail.decline')}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Messaging (MVP): request owner ↔ this organizer, attached to the request. */}
                  <MessageThread
                    contextType="request"
                    contextId={request.id}
                    otherProfileId={p.organizer_id}
                    currentUserId={user.id}
                    locale={locale}
                    otherName={nameById.get(p.organizer_id) ?? null}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

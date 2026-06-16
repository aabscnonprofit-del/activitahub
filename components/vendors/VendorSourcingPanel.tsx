import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Store, Send, CheckCircle2, Link2, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { applyBudgetCorrections } from '@/lib/workspace/budget-overlay'
import { createVendorRequest, selectVendorQuote, getVendorSourcing } from '@/lib/actions/vendorSourcing'
import type { BudgetLine } from '@/lib/ope/types'
import type { Locale, SavedPlan, Vendor, VendorRequest } from '@/lib/types'

// Vendor Sourcing (migration 030). Turns the plan's required resource lines into
// sourcing requests to the organizer's own vendor profiles (029), captures token
// quotes (no account, like RSVP), and lets the organizer select one. Server component.

const humanize = (k: string) => k.replace(/_/g, ' ')
const money = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

export default async function VendorSourcingPanel({ plan, locale }: { plan: SavedPlan; locale: Locale }) {
  const t = await getTranslations('vendorSourcing')

  const original = plan.result.plan?.section_c_budget
  const budget = original ? applyBudgetCorrections(original, plan.corrections) : undefined
  const currency = budget?.currency ?? 'USD'

  // Needs = required (non-optional) priced lines, deduped by item_key (biggest first).
  const seen = new Set<string>()
  const needs: BudgetLine[] = (budget?.is_priced ? budget.breakdown ?? [] : [])
    .filter((l) => !l.optional && !seen.has(l.item_key) && seen.add(l.item_key))
    .sort((a, b) => b.line.likely - a.line.likely)
  const currentKeys = new Set(needs.map((n) => n.item_key))

  const supabase = await createClient()
  const { data: vendorRows } = await supabase
    .from('vendors').select('*').order('name', { ascending: true })
  const vendors = (vendorRows ?? []) as Vendor[]
  const requests = await getVendorSourcing(plan.id)

  // Requests whose resource_item_key is no longer a current plan need stay visible
  // (a recalculated budget must never hide already-sent requests / received quotes).
  const orphanRequests = requests.filter((r) => !r.resource_item_key || !currentKeys.has(r.resource_item_key))

  // Shared renderer for a request's quotes (used by current needs and the Previous group).
  const renderQuotes = (req: VendorRequest) => {
    const quotes = req.vendor_quotes ?? []
    if (quotes.length === 0) return <p className="text-xs text-slate-400">{t('awaiting')}</p>
    return quotes.map((q) => {
      const isSelected = q.status === 'selected'
      return (
        <div key={q.id} className={`rounded-lg border p-3 text-sm ${isSelected ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-800">{q.vendor_name}</span>
            <span className="text-xs text-slate-500">{t(`status.${q.status}` as 'status.invited')}</span>
          </div>
          {q.price_cents != null && <p className="mt-0.5 text-slate-700">{money(q.price_cents / 100, currency)}</p>}
          {q.message && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{q.message}</p>}
          {q.status === 'invited' && (
            <p className="mt-1 flex items-center gap-1 break-all text-[11px] text-slate-400">
              <Link2 className="h-3 w-3 shrink-0" />
              <a href={`/${locale}/vendor-quote/${q.token}`} className="hover:underline">{`/${locale}/vendor-quote/${q.token}`}</a>
            </p>
          )}
          {q.status === 'quoted' && !req.selected_quote_id && (
            <form action={selectVendorQuote} className="mt-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="plan_id" value={plan.id} />
              <input type="hidden" name="request_id" value={req.id} />
              <input type="hidden" name="quote_id" value={q.id} />
              <button className="btn-primary inline-flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />{t('select')}
              </button>
            </form>
          )}
        </div>
      )
    })
  }

  const nothingToShow = needs.length === 0 && orphanRequests.length === 0

  return (
    <div className="card mt-6 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Store className="h-4 w-4 text-brand-500" />
        <h3 className="font-bold text-slate-900">{t('title')}</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">{t('subtitle')}</p>

      {nothingToShow ? (
        <p className="text-sm text-slate-400">{t('noNeeds')}</p>
      ) : (
        <div className="space-y-5">
          {needs.length > 0 && vendors.length === 0 && (
            <p className="text-sm text-slate-500">
              {t('noVendors')}{' '}
              <Link href={`/${locale}/dashboard/vendors`} className="font-medium text-brand-600 hover:underline">{t('addVendors')}</Link>
            </p>
          )}

          {/* Current plan needs */}
          {needs.map((need) => {
            const reqs = requests.filter((r) => r.resource_item_key === need.item_key)
            return (
              <div key={need.item_key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold capitalize text-slate-900">{humanize(need.item_key)}</p>
                  <span className="text-xs text-slate-500">{t('estimate')}: {money(need.line.likely, currency)}</span>
                </div>

                {reqs.map((req) => (
                  <div key={req.id} className="mt-3 space-y-2">{renderQuotes(req)}</div>
                ))}

                {vendors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-brand-600">{t('requestQuotes')}</summary>
                    <form action={createVendorRequest} className="mt-3 space-y-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <input type="hidden" name="resource_label" value={humanize(need.item_key)} />
                      <input type="hidden" name="resource_item_key" value={need.item_key} />
                      <div>
                        <label className="label-base">{t('spec')}</label>
                        <textarea name="spec" rows={2} placeholder={t('specPlaceholder')} className="input-base resize-none" />
                      </div>
                      <div>
                        <label className="label-base">{t('budget')}</label>
                        <input name="budget" type="number" min="0" step="0.01" defaultValue={need.line.likely} className="input-base" />
                      </div>
                      <div>
                        <label className="label-base">{t('selectVendors')}</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {vendors.map((v) => (
                            <label key={v.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                              <input type="checkbox" name="vendor_id" value={v.id} className="h-3.5 w-3.5" />
                              {v.company_name || v.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button className="btn-secondary inline-flex items-center gap-1.5 text-sm">
                        <Send className="h-4 w-4" />{t('send')}
                      </button>
                    </form>
                  </details>
                )}
              </div>
            )
          })}

          {/* Previous requests — their resource is no longer in the current plan budget,
              but already-sent requests / received quotes must stay visible & selectable. */}
          {orphanRequests.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Archive className="h-4 w-4 text-slate-400" />{t('previous')}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{t('previousHint')}</p>
              {orphanRequests.map((req) => (
                <div key={req.id} className="mt-3">
                  <p className="text-sm font-medium capitalize text-slate-800">{req.resource_label}</p>
                  <div className="mt-2 space-y-2">{renderQuotes(req)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

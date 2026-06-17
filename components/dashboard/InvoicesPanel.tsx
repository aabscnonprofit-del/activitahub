import { getTranslations } from 'next-intl/server'
import { Receipt, Ban, ExternalLink } from 'lucide-react'
import { getInvoicesForPlan } from '@/lib/billing/invoices.server'
import { createInvoice, voidInvoice } from '@/lib/actions/invoices'
import { formatDate } from '@/lib/utils'
import CopyLinkButton from '@/components/dashboard/CopyLinkButton'
import type { Locale, SavedPlan } from '@/lib/types'

// Organizer Invoices panel on the plan detail page (migration 036). Server component:
// lists the plan's invoices and hosts create/void via the existing server actions
// (createInvoice / voidInvoice). MVP scope — every invoice is created as kind='full';
// deposit/final/additional flows come later. No booking-checkout / webhook / OPE here.

const money = (cents: number, cur: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: (cur || 'usd').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100)

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  open: 'border border-amber-200 bg-amber-50 text-amber-700',
  paid: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  void: 'bg-slate-100 text-slate-400 line-through',
}

// createInvoice ?invoiceError codes we have a message for; others → 'generic'.
const KNOWN_ERRORS = new Set([
  'no_access', 'connect_required', 'connect_restricted', 'invalid_amount', 'title_required',
])

export default async function InvoicesPanel({
  plan,
  locale,
  errorCode,
}: {
  plan: SavedPlan
  locale: Locale
  errorCode?: string
}) {
  const t = await getTranslations('invoiceManage')
  const invoices = await getInvoicesForPlan(plan.id)
  const currency = (plan.result.plan?.section_c_budget?.currency as string | undefined) ?? 'usd'

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-brand-500" />
        <h2 className="text-lg font-bold text-slate-900">{t('title')}</h2>
      </div>

      {errorCode && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(`error.${KNOWN_ERRORS.has(errorCode) ? errorCode : 'generic'}` as 'error.generic')}
        </div>
      )}

      <form action={createInvoice} className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <input type="hidden" name="plan_id" value={plan.id} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="kind" value="full" />
        <input type="hidden" name="currency" value={currency} />
        <div>
          <label className="label-base">{t('fTitle')}</label>
          <input name="title" required placeholder={t('fTitlePh')} className="input-base" />
        </div>
        <div>
          <label className="label-base">{t('fAmount')}</label>
          <input name="amount" type="number" min="0" step="0.01" required className="input-base w-32" />
        </div>
        <button type="submit" className="btn-primary">{t('create')}</button>
      </form>

      {invoices.length === 0 ? (
        <p className="text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {invoices.map((inv) => {
            const path = `/${locale}/invoice/${inv.token}`
            const sharable = inv.status === 'open' || inv.status === 'draft'
            return (
              <li key={inv.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{inv.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{money(inv.amount_cents, inv.currency)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDate(inv.created_at, 'UTC', locale)}</p>
                  {sharable && (
                    <div className="mt-1 flex items-center gap-3">
                      <a
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('open')}
                      </a>
                      <CopyLinkButton path={path} label={t('copy')} copiedLabel={t('copied')} />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                    {t(`status.${inv.status}` as 'status.open')}
                  </span>
                  {sharable && (
                    <form action={voidInvoice}>
                      <input type="hidden" name="invoice_id" value={inv.id} />
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        <Ban className="h-3 w-3" />
                        {t('void')}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

import { getTranslations } from 'next-intl/server'
import { Receipt, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { createClient } from '@/lib/supabase/server'
import { invoiceLookup, createInvoiceCheckout } from '@/lib/actions/invoices'
import type { Locale } from '@/lib/types'

// Public, token-gated invoice payment page (Invoice MVP Commit 6). No login.
// Reads curated fields via invoiceLookup (SECURITY DEFINER RPC) and pays through
// the shared Connect checkout (createInvoiceCheckout). Mirrors the vendor-quote
// public page pattern. No booking-checkout / webhook / OPE changes.

interface Props {
  params: Promise<{ locale: string; token: string }>
  searchParams: Promise<{ pay?: string; paid?: string }>
}

type InvoiceInfo = {
  title: string
  description: string | null
  amount_cents: number
  currency: string
  kind: 'deposit' | 'final' | 'full' | 'additional'
  status: 'draft' | 'open' | 'paid' | 'void'
  organizer_name: string | null
}

// ?pay reasons we have a message for; anything else falls back to 'generic'.
const KNOWN_ERRORS = new Set([
  'notfound', 'lookup_error', 'not_payable', 'not_connected', 'onboarding', 'restricted',
])

const money = (cents: number, cur: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: (cur || 'usd').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100)

export default async function InvoicePage({ params, searchParams }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  const { pay, paid } = await searchParams
  const t = await getTranslations('invoicePage')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let info: InvoiceInfo | null = null
  try {
    info = ((await invoiceLookup(token)) as unknown as InvoiceInfo) ?? null
  } catch {
    info = null
  }

  const errorReason = pay ? (KNOWN_ERRORS.has(pay) ? pay : 'generic') : null
  const showPaid = info?.status === 'paid'
  // Just returned from a successful Checkout but the webhook hasn't flipped the
  // row yet — show a confirming state instead of a misleading "Paid" or "Pay now".
  const showProcessing = !showPaid && paid === '1' && info?.status === 'open'

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-lg px-4 py-12">
          {!info ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <Receipt className="mx-auto h-8 w-8 text-slate-300" />
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">{t('notFound')}</h1>
              <p className="mt-1 text-sm text-slate-500">{t('notFoundHint')}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                <Receipt className="h-4 w-4" />
                {t(`kind.${info.kind}` as 'kind.full')}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{info.title}</h1>
              {info.organizer_name && (
                <p className="mt-1 text-sm text-slate-600">{t('fromOrganizer', { name: info.organizer_name })}</p>
              )}
              {info.description && <p className="mt-3 text-sm text-slate-600">{info.description}</p>}

              <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-5">
                <span className="text-sm text-slate-500">{t('amountDue')}</span>
                <span className="text-2xl font-extrabold text-slate-900">{money(info.amount_cents, info.currency)}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-400">{t(`status.${info.status}` as 'status.open')}</p>

              {errorReason && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t(`error.${errorReason}` as 'error.generic')}</span>
                </div>
              )}

              {showPaid ? (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('paidNote')}</span>
                </div>
              ) : showProcessing ? (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('processingNote')}</span>
                </div>
              ) : info.status === 'open' ? (
                <form action={createInvoiceCheckout} className="mt-5">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="btn-primary w-full">{t('payNow')}</button>
                  <p className="mt-2 text-center text-xs text-slate-400">{t('secure')}</p>
                </form>
              ) : info.status === 'void' ? (
                <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t('voidNote')}</p>
              ) : (
                <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t('draftNote')}</p>
              )}
            </div>
          )}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

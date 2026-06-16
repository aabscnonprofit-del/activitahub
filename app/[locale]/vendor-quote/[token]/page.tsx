import { getTranslations } from 'next-intl/server'
import { Store, CheckCircle2 } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { createClient } from '@/lib/supabase/server'
import { vendorQuoteLookup } from '@/lib/actions/vendorSourcing'
import VendorQuoteForm from '@/components/vendors/VendorQuoteForm'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string; token: string }>
}

type QuoteInfo = {
  vendor_name: string
  status: 'invited' | 'quoted' | 'declined' | 'selected'
  price_cents: number | null
  message: string | null
  resource_label: string
  spec: string | null
  budget_cents: number | null
}

const money = (cents: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(cents / 100)

export default async function VendorQuotePage({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  const t = await getTranslations('vendorSourcing')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let info: QuoteInfo | null = null
  try {
    info = ((await vendorQuoteLookup(token)) as unknown as QuoteInfo) ?? null
  } catch {
    info = null
  }

  const responded = info && (info.status === 'quoted' || info.status === 'declined' || info.status === 'selected')

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-lg px-4 py-12">
          {!info ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">{t('quote.invalid')}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                <Store className="h-4 w-4" />{t('quote.invited')}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold capitalize text-slate-900">{info.resource_label}</h1>
              <p className="mt-1 text-slate-600">{t('quote.greeting', { name: info.vendor_name })}</p>

              <div className="mt-4 space-y-1 text-sm text-slate-600">
                {info.spec && <p>{info.spec}</p>}
                {info.budget_cents != null && <p>{t('quote.budget')}: {money(info.budget_cents)}</p>}
              </div>

              {responded ? (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {info.status === 'declined'
                      ? t('quote.declinedConfirm')
                      : t('quote.submittedConfirm', { price: info.price_cents != null ? money(info.price_cents) : '—' })}
                  </span>
                </div>
              ) : (
                <VendorQuoteForm token={token} locale={locale} />
              )}
            </div>
          )}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

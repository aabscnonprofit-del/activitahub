'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { submitVendorQuote } from '@/lib/actions/vendorSourcing'

// Public vendor quote form (no account; token-gated). Submits a price+message or
// declines via the vendor_quote_submit RPC. Mirrors the RSVP response surface.

export default function VendorQuoteForm({ token, locale }: { token: string; locale: string }) {
  const t = useTranslations('vendorSourcing')
  const [pending, setPending] = useState(false)

  return (
    <form
      action={async (formData) => {
        setPending(true)
        try {
          await submitVendorQuote(formData)
        } finally {
          setPending(false)
        }
      }}
      className="mt-5 space-y-4"
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label-base">{t('quote.price')}</label>
        <input name="price" type="number" min="0" step="0.01" placeholder={t('quote.pricePlaceholder')} className="input-base" />
      </div>
      <div>
        <label className="label-base">{t('quote.message')}</label>
        <textarea name="message" rows={3} placeholder={t('quote.messagePlaceholder')} className="input-base resize-none" />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? t('quote.sending') : t('quote.submit')}
        </button>
        <button type="submit" name="decline" value="true" className="btn-secondary flex-1" disabled={pending}>
          {t('quote.decline')}
        </button>
      </div>
    </form>
  )
}

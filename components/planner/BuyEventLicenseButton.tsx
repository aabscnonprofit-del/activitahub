'use client'

import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { createOneEventLicenseCheckout } from '@/lib/actions/eventLicense'

/**
 * One Event License purchase CTA — posts to the platform checkout action.
 * Drop-in replacement for the "$9.99 planner" CTAs. `buttonClassName` lets each
 * surface match its existing button styling.
 */
export function BuyEventLicenseButton({
  locale,
  buttonClassName = 'btn-primary w-full justify-center',
}: {
  locale: string
  buttonClassName?: string
}) {
  const t = useTranslations('eventLicense')
  return (
    <form action={createOneEventLicenseCheckout}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={buttonClassName}>
        {t('buyCta')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  )
}

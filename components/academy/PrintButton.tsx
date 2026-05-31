'use client'

import { Printer } from 'lucide-react'
import { useTranslations } from 'next-intl'

/** Triggers the browser print dialog for the certificate. */
export function PrintButton() {
  const t = useTranslations('certificate')
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {t('print')}
    </button>
  )
}

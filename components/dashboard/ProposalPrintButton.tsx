'use client'

import { Printer } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Browser-print export for the OPE proposal (no server-side PDF, no dependency).
// The user picks "Save as PDF" in the native print dialog. Hidden in the printout
// itself (print:hidden); the dashboard chrome is hidden via the layout's print
// rules so only ProposalDocument prints.
export default function ProposalPrintButton() {
  const t = useTranslations('proposal')
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary inline-flex items-center gap-1.5 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {t('print')}
    </button>
  )
}

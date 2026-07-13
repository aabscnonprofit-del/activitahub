'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { startConnectOnboarding } from '@/lib/actions/connect'

// First-time Stripe Connect safety gate. Before the very first Express account is created,
// require the organizer to confirm they understand ALH creates a SEPARATE Connect account for
// this profile — a realistic first-user failure mode is mixing in an existing personal/business
// Stripe login and linking the wrong account. Shown only for status 'none'; the resume
// ("Finish setup") flow and connected state are untouched. On confirm it invokes the existing
// startConnectOnboarding server action exactly once (double-submit guarded by `submitting`).

type WarningCopy = {
  title: string
  body1: string
  body2: string
  body3: string
  body4: string
  checkbox: string
  cancel: string
  continue: string
}

export default function ConnectStripeFirstTime({
  locale,
  label,
  warning,
}: {
  locale: string
  label: string
  warning: WarningCopy
}) {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function close() {
    if (submitting) return // never dismiss mid-redirect
    setOpen(false)
    setConfirmed(false)
  }

  return (
    <div className="mt-4">
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {label}
      </button>

      <Modal open={open} onClose={close} title={warning.title} size="md">
        <div className="space-y-3 text-sm text-slate-600">
          <p>{warning.body1}</p>
          <p>{warning.body2}</p>
          <p>{warning.body3}</p>
          <p>{warning.body4}</p>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>{warning.checkbox}</span>
        </label>

        <form
          action={startConnectOnboarding}
          onSubmit={() => setSubmitting(true)}
          className="mt-6 flex justify-end gap-3"
        >
          <input type="hidden" name="locale" value={locale} />
          <button type="button" onClick={close} disabled={submitting} className="btn-secondary">
            {warning.cancel}
          </button>
          <button
            type="submit"
            disabled={!confirmed || submitting}
            aria-disabled={!confirmed || submitting}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {warning.continue}
          </button>
        </form>
      </Modal>
    </div>
  )
}

'use client'

// Worker work-confirmation island — the worker taps "Confirm my work" on their Worker View; the token-scoped
// action records it and the page refreshes. No login (access is by invite token). No clock/randomness here.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmWorkAction } from '@/lib/actions/worker-access'

export function WorkerConfirm({ token, locale, confirmed }: { token: string; locale: string; confirmed: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (confirmed) {
    return <p className="mt-6 rounded bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">You have confirmed your work for this event.</p>
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const res = await confirmWorkAction(token, locale)
            if (res.ok) router.refresh()
            else setError('Could not confirm right now.')
          })
        }}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        Confirm my work
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

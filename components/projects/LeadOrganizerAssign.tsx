'use client'

// Lead Organizer assignment — the interactive "assign a qualified Lead Organizer" path. The owner enters a
// qualified organizer's id; the server action validates capacity and assigns (or clears). On success the page
// refreshes so the Capacity Gate re-evaluates against the effective lead. No clock/randomness → no hydration
// mismatch. (Organizer discovery — a directory/marketplace — is intentionally out of scope; assignment is by id.)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignLeadOrganizerAction } from '@/lib/actions/lead-organizer'

export function LeadOrganizerAssign({
  projectId,
  locale,
  currentLeadId,
}: {
  projectId: string
  locale: string
  currentLeadId: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(currentLeadId ?? '')
  const [error, setError] = useState<string | null>(null)

  function run(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await assignLeadOrganizerAction(projectId, id, locale)
      if (res.ok) router.refresh()
      else setError(res.reason === 'lead_unqualified'
        ? 'That organizer does not have enough capacity to lead a project of this size.'
        : `Could not assign: ${res.reason.replace(/_/g, ' ')}`)
    })
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Qualified Lead Organizer ID"
          className="w-56 rounded border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => run(value)}
          disabled={pending || !value.trim()}
          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Assign
        </button>
        {currentLeadId && (
          <button
            type="button"
            onClick={() => { setValue(''); run('') }}
            disabled={pending}
            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

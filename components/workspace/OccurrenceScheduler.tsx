'use client'

// Minimal occurrence scheduler — a single datetime input to set/update the event start time for the CURRENT
// occurrence it was given (an explicit occurrenceId — never an implicit "first occurrence"). Submits an ISO
// instant (input interpreted as UTC, minute precision) to the server action, which validates + persists; on
// success the router refreshes so the workspace timeline reloads. No clock/randomness → no hydration mismatch.

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleOccurrenceAction } from '@/lib/actions/occurrence'

/** ISO → the value a <input type="datetime-local"> expects (UTC, minute precision). Pure string slice. */
function toLocalInput(iso?: string): string {
  return iso ? iso.slice(0, 16) : ''
}

export function OccurrenceScheduler({
  projectId,
  locale,
  occurrenceId,
  currentStartIso,
}: {
  projectId: string
  locale: string
  occurrenceId?: string
  currentStartIso?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(toLocalInput(currentStartIso))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (!value) {
      setError('Pick a date and time')
      return
    }
    const iso = `${value}:00.000Z` // interpret the input as UTC (minute precision)
    startTransition(async () => {
      const res = await scheduleOccurrenceAction(projectId, iso, locale, occurrenceId)
      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        setError(`Could not schedule: ${res.reason.replace(/_/g, ' ')}`)
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-xs text-slate-500">
        Event start (UTC)
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => {
            setSaved(false)
            setValue(e.target.value)
          }}
          className="mt-0.5 block rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Save start time
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {saved && !error && <span className="text-xs text-emerald-600">Saved</span>}
    </form>
  )
}

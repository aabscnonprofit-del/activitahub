'use client'

// Participants (Organizer control) — the roster of people who JOINED this Project, grouped by status. This
// stage only DISPLAYS participants by status and lets the organizer approve/decline PENDING join requests. No
// messaging, editing, attendance, or ticketing. Runs the owner-gated Project-participant actions.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveParticipantAction, declineParticipantAction } from '@/lib/actions/project-participants'

type ParticipantStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

interface RosterItem {
  id: string
  accountId: string
  status: ParticipantStatus
  createdAt: string
}

const STATUS_ORDER: ParticipantStatus[] = ['pending', 'approved', 'declined', 'cancelled']
// Short labels for the count chips.
const STATUS_LABEL: Record<ParticipantStatus, string> = { pending: 'Pending', approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled' }
// Understandable group headings.
const GROUP_HEADING: Record<ParticipantStatus, string> = {
  pending: 'Pending requests',
  approved: 'Approved participants',
  declined: 'Declined requests',
  cancelled: 'Cancelled participation',
}

export function ParticipantsRosterPanel({
  participants,
  projectId,
  locale,
}: {
  participants: RosterItem[]
  projectId: string
  locale: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ ok: boolean }>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res.ok) router.refresh()
      else setError('Could not update the participant. Please try again.')
    })
  }

  const groups = STATUS_ORDER.map((status) => ({ status, items: participants.filter((p) => p.status === status) }))

  return (
    <div className="space-y-3">
      {/* Counts by status. */}
      <div className="flex flex-wrap gap-2 text-xs">
        {groups.map(({ status, items }) => (
          <span key={status} className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-600">
            {STATUS_LABEL[status]}: {items.length}
          </span>
        ))}
      </div>

      {participants.length === 0 ? (
        <p className="rounded-lg border border-slate-200 p-3 text-xs text-slate-400">No participants yet.</p>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map(({ status, items }) => (
            <div key={status}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{GROUP_HEADING[status]}</h3>
              <ul className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-xs text-slate-500">Participant {p.accountId.slice(0, 8)}…</span>
                    {status === 'pending' && (
                      <span className="flex items-center gap-2">
                        <button type="button" disabled={pending} onClick={() => run(() => approveParticipantAction(projectId, p.id, locale))}
                          className="rounded border border-emerald-300 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Approve</button>
                        <button type="button" disabled={pending} onClick={() => run(() => declineParticipantAction(projectId, p.id, locale))}
                          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Decline</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

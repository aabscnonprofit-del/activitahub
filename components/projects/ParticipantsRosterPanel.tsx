'use client'

// Participant Workspace (Organizer control) — the operational UI for managing people already associated with the
// Project. Participant CARDS (name / email / phone / status / join source / joined date) grouped by status, with
// status-appropriate actions: Pending → Approve/Decline, Approved → Remove, Declined → Approve, Cancelled →
// read-only. It manages ONLY Participants (Project data) — not ticket acquisition, not Project Access. No
// messaging/notifications/check-in/attendance/payments. Runs the owner-gated Project-participant actions.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveParticipantAction, declineParticipantAction, removeParticipantAction } from '@/lib/actions/project-participants'

type ParticipantStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

interface ParticipantCard {
  id: string
  accountId: string
  status: ParticipantStatus
  createdAt: string
  name: string | null
  email: string | null
  phone: string | null
  joinSource: string
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
const BADGE: Record<ParticipantStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
}

export function ParticipantsRosterPanel({
  participants,
  projectId,
  locale,
}: {
  participants: ParticipantCard[]
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

  function Actions({ p }: { p: ParticipantCard }) {
    const approve = (
      <button type="button" disabled={pending} onClick={() => run(() => approveParticipantAction(projectId, p.id, locale))}
        className="rounded border border-emerald-300 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Approve</button>
    )
    if (p.status === 'pending') {
      return (
        <>
          {approve}
          <button type="button" disabled={pending} onClick={() => run(() => declineParticipantAction(projectId, p.id, locale))}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Decline</button>
        </>
      )
    }
    if (p.status === 'declined') return approve
    if (p.status === 'approved') {
      return (
        <button type="button" disabled={pending} onClick={() => run(() => removeParticipantAction(projectId, p.id, locale))}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove</button>
      )
    }
    return null // cancelled → read-only
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
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{p.name || p.email || `Participant ${p.accountId.slice(0, 8)}…`}</p>
                      <p className="text-xs text-slate-500">{p.email || '—'} · {p.phone || 'no phone'}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className={`rounded px-1.5 py-0.5 font-semibold ${BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                        <span>Source: {p.joinSource}</span>
                        <span>Joined {p.createdAt.slice(0, 10)}</span>
                      </p>
                    </div>
                    <span className="flex flex-wrap items-center gap-2"><Actions p={p} /></span>
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

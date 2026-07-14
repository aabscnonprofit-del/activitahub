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
  occurrenceId: string | null
  status: ParticipantStatus
  createdAt: string
  name: string | null
  email: string | null
  phone: string | null
  joinSource: string
}

// Per-occurrence capacity summary shown as each occurrence group's header.
export interface OccurrenceSummary {
  id: string
  label: string
  registered: number
  capacity: number | null
  remaining: number | null
  full: boolean
}

const STATUS_ORDER: ParticipantStatus[] = ['pending', 'approved', 'declined', 'cancelled']
// Short labels for the count chips.
const STATUS_LABEL: Record<ParticipantStatus, string> = { pending: 'Pending', approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled' }
// Understandable group headings.
const BADGE: Record<ParticipantStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
}

export function ParticipantsRosterPanel({
  participants,
  occurrences = [],
  projectId,
  locale,
}: {
  participants: ParticipantCard[]
  occurrences?: OccurrenceSummary[]
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

  const statusCounts = STATUS_ORDER.map((status) => ({ status, count: participants.filter((p) => p.status === status).length }))

  // Group participants by occurrence (each occurrence is a distinct registration bucket); a
  // project-level (occurrence_id = null) group holds free/instant/approval joins.
  const known = new Set(occurrences.map((o) => o.id))
  const occGroups = occurrences.map((occ) => ({
    key: occ.id, label: occ.label, summary: occ as OccurrenceSummary | null,
    items: participants.filter((p) => p.occurrenceId === occ.id),
  }))
  const projectLevel = participants.filter((p) => p.occurrenceId == null)
  if (projectLevel.length > 0) occGroups.push({ key: 'project', label: 'Project-wide', summary: null, items: projectLevel })
  for (const oid of [...new Set(participants.filter((p) => p.occurrenceId && !known.has(p.occurrenceId)).map((p) => p.occurrenceId as string))]) {
    occGroups.push({ key: oid, label: 'Other date', summary: null, items: participants.filter((p) => p.occurrenceId === oid) })
  }
  const visibleGroups = occGroups.filter((g) => g.items.length > 0 || (g.summary && g.summary.capacity != null))

  const Card = ({ p }: { p: ParticipantCard }) => (
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
  )

  return (
    <div className="space-y-3">
      {/* Overall counts by status. */}
      <div className="flex flex-wrap gap-2 text-xs">
        {statusCounts.map(({ status, count }) => (
          <span key={status} className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-600">
            {STATUS_LABEL[status]}: {count}
          </span>
        ))}
      </div>

      {participants.length === 0 && visibleGroups.length === 0 ? (
        <p className="rounded-lg border border-slate-200 p-3 text-xs text-slate-400">No participants yet.</p>
      ) : (
        visibleGroups.map((g) => (
          <div key={g.key}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</h3>
              {g.summary && g.summary.capacity != null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${g.summary.full ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {g.summary.registered}/{g.summary.capacity} · {g.summary.full ? 'Full' : `${g.summary.remaining} left`}
                </span>
              )}
            </div>
            {g.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-2 text-xs text-slate-400">No registrations yet.</p>
            ) : (
              <ul className="space-y-2">{g.items.map((p) => <Card key={p.id} p={p} />)}</ul>
            )}
          </div>
        ))
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

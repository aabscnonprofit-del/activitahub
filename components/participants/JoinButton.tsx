'use client'

// Join button (participant, Activity Page) — behavior driven by the Project's Join Policy and the participant's
// current state. instant → "Join" (→ approved); approval → "Request to Join" (→ pending); ticket → "Get
// Tickets" (non-functional, no participant created yet). Once joined, it shows the participation status and lets
// the participant cancel. Requires sign-in to join. Runs the Project-participant server actions; creates no
// ticket/registration.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { joinProjectAction, cancelParticipationAction } from '@/lib/actions/project-participants'

type JoinPolicy = 'instant' | 'approval' | 'ticket'
type ParticipantStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

const CTA: Record<Exclude<JoinPolicy, 'ticket'>, string> = { instant: 'Join', approval: 'Request to Join' }
const STATUS_MSG: Record<ParticipantStatus, string> = {
  approved: 'You’re in — your participation is confirmed.',
  pending: 'Request sent — waiting for the organizer to approve.',
  declined: 'Your join request was declined.',
  cancelled: 'You cancelled your participation.',
}

export function JoinButton({
  projectId,
  locale,
  joinPolicy,
  initialStatus,
  isAuthenticated,
  signInHref,
}: {
  projectId: string
  locale: string
  joinPolicy: JoinPolicy
  initialStatus: ParticipantStatus | null
  isAuthenticated: boolean
  signInHref: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ParticipantStatus | null>(initialStatus)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Ticket policy — non-functional CTA (future Ticket System); never creates a participant.
  if (joinPolicy === 'ticket') {
    return (
      <div className="mt-8">
        <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-7 py-3.5 font-bold text-slate-500">
          Get Tickets
        </span>
        <p className="mt-2 text-xs text-slate-400">Ticketing opens in a future update. (coming soon)</p>
      </div>
    )
  }

  // Already has a participation → show its status (+ let active participants cancel).
  if (status === 'approved' || status === 'pending') {
    return (
      <div className="mt-8">
        <p className="text-sm font-semibold text-slate-800">{STATUS_MSG[status]}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              const res = await cancelParticipationAction(projectId, locale)
              if (res.ok) { setStatus('cancelled'); router.refresh() } else setError('Could not cancel. Please try again.')
            })
          }
          className="mt-2 text-sm font-medium text-slate-500 underline hover:text-slate-700 disabled:opacity-60"
        >
          Cancel participation
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }
  if (status === 'declined' || status === 'cancelled') {
    return (
      <div className="mt-8">
        <p className="text-sm text-slate-500">{STATUS_MSG[status]}</p>
      </div>
    )
  }

  // Not joined yet.
  if (!isAuthenticated) {
    return (
      <div className="mt-8">
        <Link href={signInHref} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-500">
          Sign in to {joinPolicy === 'instant' ? 'join' : 'request'}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const res = await joinProjectAction(projectId, locale)
            if (res.ok && res.outcome !== 'ticket') { setStatus(res.outcome); router.refresh() }
            else if (!res.ok) setError(res.error === 'not_authenticated' ? 'Please sign in to join.' : 'Could not join. Please try again.')
          })
        }
        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
      >
        {pending ? 'Working…' : CTA[joinPolicy]}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

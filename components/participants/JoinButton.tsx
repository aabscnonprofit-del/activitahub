'use client'

// Join button (participant, Activity Page) — behavior driven by the Project's Join Policy, the Ticket System
// (when the policy is 'ticket'), and the participant's current state.
//   instant            → "Join" (→ approved)
//   approval           → "Request to Join" (→ pending)
//   ticket + free      → "Get Free Ticket" (→ approved; free ticket granted immediately)
//   ticket + paid      → "Buy Ticket" (display only — future Checkout; no participant)
//   ticket + donation  → "Support this Activity" (display only — future Donation; no participant)
// Once joined, it shows the participation status and lets the participant cancel. Requires sign-in to join. Runs
// the Project-participant server actions; creates no ticket/checkout/payment.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { joinProjectAction, cancelParticipationAction } from '@/lib/actions/project-participants'

type JoinPolicy = 'instant' | 'approval' | 'ticket'
type TicketType = 'free' | 'paid' | 'donation'
type ParticipantStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

const CTA: Record<Exclude<JoinPolicy, 'ticket'>, string> = { instant: 'Join', approval: 'Request to Join' }
// What happens after each Join Policy (shown under the CTA before joining).
const HINT: Record<Exclude<JoinPolicy, 'ticket'>, string> = {
  instant: 'You will be added to this activity immediately.',
  approval: 'The organizer will review your request.',
}
// Clear status shown once the participant has joined.
const STATUS_MSG: Record<ParticipantStatus, string> = {
  approved: 'You are approved for this activity.',
  pending: 'Request sent. Waiting for organizer approval.',
  declined: 'Your request was declined.',
  cancelled: 'You cancelled your participation.',
}
// Ticket System CTAs (when Join Policy is 'ticket'). Paid/Donation are display-only in this stage.
const TICKET_PAID = { label: 'Buy Ticket', message: 'Payment required. Checkout will be available in a future update.' }
const TICKET_DONATION = { label: 'Support this Activity', message: 'Donation support will be available in a future update.' }

export function JoinButton({
  projectId,
  locale,
  joinPolicy,
  ticketType,
  initialStatus,
  isAuthenticated,
  signInHref,
}: {
  projectId: string
  locale: string
  joinPolicy: JoinPolicy
  ticketType: TicketType
  initialStatus: ParticipantStatus | null
  isAuthenticated: boolean
  signInHref: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ParticipantStatus | null>(initialStatus)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 1. Already has a participation → show its status (+ let active participants cancel).
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

  // 2. Ticket policy — the Ticket System decides. Paid/Donation are display-only (no participant yet).
  if (joinPolicy === 'ticket' && ticketType === 'paid') {
    return (
      <div className="mt-8">
        <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-7 py-3.5 font-bold text-slate-500">{TICKET_PAID.label}</span>
        <p className="mt-2 text-xs text-slate-400">{TICKET_PAID.message}</p>
      </div>
    )
  }
  if (joinPolicy === 'ticket' && ticketType === 'donation') {
    return (
      <div className="mt-8">
        <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-7 py-3.5 font-bold text-slate-500">{TICKET_DONATION.label}</span>
        <p className="mt-2 text-xs text-slate-400">{TICKET_DONATION.message}</p>
      </div>
    )
  }
  // ticket + free (and instant/approval) create a participant → require sign-in.
  const isTicketFree = joinPolicy === 'ticket' // (only 'free' reaches here for ticket)
  const ctaLabel = isTicketFree ? 'Get Free Ticket' : CTA[joinPolicy as Exclude<JoinPolicy, 'ticket'>]
  const ctaHint = isTicketFree ? 'Free ticket — you will be added to this activity immediately.' : HINT[joinPolicy as Exclude<JoinPolicy, 'ticket'>]

  if (!isAuthenticated) {
    return (
      <div className="mt-8">
        <Link href={signInHref} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-500">
          Sign in to {isTicketFree ? 'get your free ticket' : joinPolicy === 'instant' ? 'join' : 'request'}
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
            if (res.ok && (res.outcome === 'approved' || res.outcome === 'pending')) { setStatus(res.outcome); router.refresh() }
            else if (!res.ok) setError(res.error === 'not_authenticated' ? 'Please sign in to join.' : 'Could not join. Please try again.')
          })
        }
        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
      >
        {pending ? 'Working…' : ctaLabel}
      </button>
      <p className="mt-2 text-xs text-slate-400">{ctaHint}</p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

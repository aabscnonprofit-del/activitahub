'use client'

// Join button (participant, Activity Page) — behavior driven by the Project's Join Policy, the Ticket System
// (when the policy is 'ticket'), and the participant's current state.
//   instant            → "Join" (→ approved)
//   approval           → "Request to Join" (→ pending)
//   ticket + free      → "Get Free Ticket" (ticket acquired → a Participant is created; status per Join Policy)
//   ticket + paid      → "Buy Ticket" (Stripe Connect Checkout → admitted on payment; occurrence price)
//   ticket + donation  → "Support this Activity" (participant-chosen amount → Checkout → admitted on payment)
// Once joined, it shows the participation status and lets the participant cancel. Requires sign-in to join. Paid/
// donation require the organizer to have charges enabled; otherwise it shows "Connect Stripe to accept payments."

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { joinProjectAction, cancelParticipationAction } from '@/lib/actions/project-participants'
import { startTicketCheckout } from '@/lib/actions/tickets'

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
// Ticket System CTAs (when Join Policy is 'ticket'). Paid/Donation run the Stripe Connect Checkout flow.
const TICKET_LABEL: Record<'paid' | 'donation', string> = { paid: 'Buy Ticket', donation: 'Support this Activity' }
const CONNECT_REQUIRED = 'Connect Stripe to accept payments.'
function ticketErrorMessage(code: string): string {
  const map: Record<string, string> = {
    not_authenticated: 'Please sign in to continue.',
    already_registered: 'You already have a spot for this date.',
    occurrence_invalid: 'Please choose a date.',
    occurrence_full: 'That date is full. Please choose another.',
    not_connected: CONNECT_REQUIRED,
    no_price: 'The ticket price hasn’t been set yet.',
    invalid_amount: 'Enter a valid amount.',
  }
  return map[code] ?? 'Could not start checkout. Please try again.'
}
function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// One purchasable occurrence (serializable subset passed from the server).
export type TicketOcc = {
  id: string
  startsAt: string
  priceCents: number | null
  remaining: number | null
  full: boolean
}
function formatOcc(startsAt: string): string {
  const d = new Date(startsAt)
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function spotsLabel(remaining: number | null): string {
  if (remaining == null) return ''
  return remaining <= 0 ? 'Full' : `${remaining} left`
}

export function JoinButton({
  projectId,
  locale,
  joinPolicy,
  ticketType,
  initialStatus,
  isAuthenticated,
  signInHref,
  occurrences = [],
  canReceivePayments = false,
}: {
  projectId: string
  locale: string
  joinPolicy: JoinPolicy
  ticketType: TicketType
  initialStatus: ParticipantStatus | null
  isAuthenticated: boolean
  signInHref: string
  occurrences?: TicketOcc[]
  canReceivePayments?: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ParticipantStatus | null>(initialStatus)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [donationInput, setDonationInput] = useState('')
  // Default the selection to the first date with room.
  const [selectedId, setSelectedId] = useState<string | null>(
    occurrences.find((o) => !o.full)?.id ?? occurrences[0]?.id ?? null,
  )
  const selectedOcc = occurrences.find((o) => o.id === selectedId) ?? null

  // Paid/donation → Stripe Connect Checkout for the SELECTED occurrence; the participant is
  // admitted to that occurrence by the webhook on payment.
  function buyTicket(occurrenceId: string, amountCents?: number) {
    startTransition(async () => {
      setError(null)
      const res = await startTicketCheckout(projectId, locale, occurrenceId, amountCents)
      if (res.ok) window.location.href = res.url
      else setError(ticketErrorMessage(res.error))
    })
  }

  // 1. Already has a participation → a clear confirmation of the spot (+ onward navigation and cancel).
  if (status === 'approved' || status === 'pending') {
    const isApproved = status === 'approved'
    return (
      <div className={`mt-8 rounded-xl border p-4 ${isApproved ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-2">
          {isApproved
            ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            : <Clock className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />}
          <p className={`text-sm font-semibold ${isApproved ? 'text-emerald-800' : 'text-slate-800'}`}>{STATUS_MSG[status]}</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {isApproved
            ? 'You’re on the list. Coordinate your arrival under “Getting there” below.'
            : 'Your spot will be confirmed here as soon as the organizer approves your request.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/activities`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
            Browse more activities<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
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
            className="text-sm font-medium text-slate-500 underline hover:text-slate-700 disabled:opacity-60"
          >
            Cancel participation
          </button>
        </div>
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

  // 2. Ticket policy — Paid/Donation run Stripe Connect Checkout; admission happens on payment.
  if (joinPolicy === 'ticket' && (ticketType === 'paid' || ticketType === 'donation')) {
    // Safety: unavailable unless the organizer can receive payments (charges_enabled).
    if (!canReceivePayments) {
      return (
        <div className="mt-8">
          <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-7 py-3.5 font-bold text-slate-500">{TICKET_LABEL[ticketType]}</span>
          <p className="mt-2 text-xs text-slate-400">{CONNECT_REQUIRED}</p>
        </div>
      )
    }
    if (!isAuthenticated) {
      return (
        <div className="mt-8">
          <Link href={signInHref} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-500">
            Sign in to {ticketType === 'paid' ? 'buy a ticket' : 'support this activity'}
          </Link>
        </div>
      )
    }
    if (occurrences.length === 0) {
      return <div className="mt-8"><p className="text-sm text-slate-500">No upcoming dates available yet.</p></div>
    }
    // Occurrence selector — the buyer chooses ONE date; price, remaining capacity, and admission
    // are all per-occurrence. Donation is the same flow with a participant-entered amount.
    const donationCents = Math.round(parseFloat(donationInput) * 100)
    const validDonation = Number.isFinite(donationCents) && donationCents > 0
    const paidHasPrice = ticketType === 'paid' && selectedOcc?.priceCents != null && selectedOcc.priceCents > 0
    const canBuy = !!selectedOcc && !selectedOcc.full && (ticketType === 'donation' ? validDonation : paidHasPrice)
    return (
      <div className="mt-8">
        <p className="mb-2 text-sm font-semibold text-slate-800">Choose a date</p>
        <ul className="space-y-2" role="radiogroup" aria-label="Choose a date">
          {occurrences.map((o) => {
            const selected = o.id === selectedId
            return (
              <li key={o.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={o.full}
                  onClick={() => setSelectedId(o.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'
                  } ${o.full ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="text-sm font-medium text-slate-900">{formatOcc(o.startsAt)}</span>
                  <span className="flex items-center gap-3 text-sm">
                    {ticketType === 'paid' && o.priceCents != null && <span className="font-semibold text-slate-900">{formatUsd(o.priceCents)}</span>}
                    <span className={o.full ? 'text-rose-600' : 'text-slate-500'}>{spotsLabel(o.remaining)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {ticketType === 'donation' && (
          <div className="mt-4 flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number" min="1" step="1" inputMode="decimal"
                value={donationInput}
                onChange={(e) => setDonationInput(e.target.value)}
                placeholder="20"
                className="w-32 rounded-xl border border-slate-300 py-3 pl-7 pr-3 font-medium text-slate-900 focus:border-brand-500 focus:outline-none"
                aria-label="Donation amount in dollars"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={pending || !canBuy}
          onClick={() => selectedOcc && buyTicket(selectedOcc.id, ticketType === 'donation' ? donationCents : undefined)}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
        >
          {pending
            ? 'Working…'
            : ticketType === 'paid'
              ? `${TICKET_LABEL.paid}${paidHasPrice ? ` · ${formatUsd(selectedOcc!.priceCents!)}` : ''}`
              : TICKET_LABEL.donation}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          {ticketType === 'donation'
            ? 'Choose a date and an amount. Funds go to the organizer.'
            : 'You’ll pay securely on Stripe, then you’re admitted to the selected date.'}
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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

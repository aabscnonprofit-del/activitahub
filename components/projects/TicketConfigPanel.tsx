'use client'

// Ticket Configuration (Organizer control) — the Ticket System's ticket type. The Ticket System sits ON TOP OF
// Participants and applies only when the Join Policy is "Ticket Required"; it decides WHAT ticket is required.
//   free     → participant gets a ticket immediately (a Participant is created, per the Ticket System)
//   paid     → requires the future Checkout System (no participant yet)
//   donation → requires the future Donation flow (no participant yet)
// Runs the owner-gated setProjectTicketTypeAction. No checkout/payment — configuration only.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, CreditCard, HandHeart } from 'lucide-react'
import { setProjectTicketTypeAction } from '@/lib/actions/projects'

type TicketType = 'free' | 'paid' | 'donation'

export function TicketConfigPanel({
  projectId,
  locale,
  initialTicketType,
  joinPolicyIsTicket,
}: {
  projectId: string
  locale: string
  initialTicketType: TicketType
  joinPolicyIsTicket: boolean
}) {
  const router = useRouter()
  const [ticketType, setTicketType] = useState<TicketType>(initialTicketType)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function choose(next: TicketType) {
    if (next === ticketType || pending) return
    setError(null)
    const prev = ticketType
    setTicketType(next) // optimistic
    startTransition(async () => {
      const res = await setProjectTicketTypeAction(projectId, next, locale)
      if (res.ok) router.refresh()
      else {
        setTicketType(prev)
        setError('Could not update the ticket type. Please try again.')
      }
    })
  }

  const options: { value: TicketType; icon: typeof Ticket; title: string; desc: string }[] = [
    { value: 'free', icon: Ticket, title: 'Free Ticket', desc: 'Participants receive a ticket immediately and are added to the activity.' },
    { value: 'paid', icon: CreditCard, title: 'Paid Ticket', desc: 'Payment required. Checkout will be available in a future update.' },
    { value: 'donation', icon: HandHeart, title: 'Donation', desc: 'Donation support will be available in a future update.' },
  ]

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <h2 className="text-base font-bold text-slate-900">Ticket Configuration</h2>
      <p className="mt-0.5 text-sm text-slate-600">
        The ticket required to join this activity.{' '}
        {joinPolicyIsTicket ? 'Applies now — your Join Policy is “Ticket Required”.' : 'Applies only when your Join Policy is “Ticket Required”.'}
      </p>

      <div className="mt-4 space-y-2">
        {options.map(({ value, icon: Icon, title, desc }) => {
          const selected = ticketType === value
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                selected ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50'
              } ${pending ? 'opacity-70' : ''}`}
            >
              <input
                type="radio"
                name={`ticket-type-${projectId}`}
                className="mt-1"
                checked={selected}
                onChange={() => choose(value)}
                disabled={pending}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>
              </span>
            </label>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

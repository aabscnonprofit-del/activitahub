'use client'

// Participation (Organizer control) — sets the Project's JOIN POLICY: how a participant joins once they find
// this Project in Local Activities. Project-level behavior only — it drives the Join action on the public
// Activity Page and creates no Join/Ticket/Registration entity and no payment. Switching is a single click
// (optimistic; reverted on failure). Runs the owner-gated setProjectJoinPolicyAction on the shared Project
// Service — no Planning/Budget/Execution/Publication/Visibility/lifecycle change.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, CheckCheck, Ticket } from 'lucide-react'
import { setProjectJoinPolicyAction } from '@/lib/actions/projects'

type JoinPolicy = 'instant' | 'approval' | 'ticket'

export function JoinPolicyPanel({
  projectId,
  locale,
  initialJoinPolicy,
}: {
  projectId: string
  locale: string
  initialJoinPolicy: JoinPolicy
}) {
  const router = useRouter()
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>(initialJoinPolicy)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function choose(next: JoinPolicy) {
    if (next === joinPolicy || pending) return
    setError(null)
    const prev = joinPolicy
    setJoinPolicy(next) // optimistic
    startTransition(async () => {
      const res = await setProjectJoinPolicyAction(projectId, next, locale)
      if (res.ok) router.refresh()
      else {
        setJoinPolicy(prev)
        setError('Could not update participation. Please try again.')
      }
    })
  }

  const options: { value: JoinPolicy; icon: typeof Zap; title: string; desc: string }[] = [
    { value: 'instant', icon: Zap, title: 'Instant Join', desc: 'Participants join immediately, no approval needed.' },
    { value: 'approval', icon: CheckCheck, title: 'Approval Required', desc: 'Participants request to join; you approve or reject each request.' },
    { value: 'ticket', icon: Ticket, title: 'Ticket Required', desc: 'Participants complete the ticket flow before joining. (Ticketing opens in a future stage.)' },
  ]

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <h2 className="text-base font-bold text-slate-900">Participation</h2>
      <p className="mt-0.5 text-sm text-slate-600">Choose how participants join this Project.</p>

      <div className="mt-4 space-y-2">
        {options.map(({ value, icon: Icon, title, desc }) => {
          const selected = joinPolicy === value
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                selected ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50'
              } ${pending ? 'opacity-70' : ''}`}
            >
              <input
                type="radio"
                name={`join-policy-${projectId}`}
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

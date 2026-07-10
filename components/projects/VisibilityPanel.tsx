'use client'

// Visibility (Organizer control) — part of the publication decision. Publication answers "Is this Project
// published?"; visibility answers "Who can discover this published Project?" (Private vs Public (Local
// Activities)). Core rule: Local Activities = published Projects with visibility = public. Switching is a single
// click (optimistic; reverted on failure). Runs the owner-gated setProjectVisibilityAction on the shared
// Project Service — no Planning/Budget/Execution/lifecycle/approval change.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Globe } from 'lucide-react'
import { setProjectVisibilityAction } from '@/lib/actions/projects'

type Visibility = 'private' | 'public'

export function VisibilityPanel({
  projectId,
  locale,
  initialVisibility,
}: {
  projectId: string
  locale: string
  initialVisibility: Visibility
}) {
  const router = useRouter()
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function choose(next: Visibility) {
    if (next === visibility || pending) return
    setError(null)
    const prev = visibility
    setVisibility(next) // optimistic
    startTransition(async () => {
      const res = await setProjectVisibilityAction(projectId, next, locale)
      if (res.ok) router.refresh()
      else {
        setVisibility(prev)
        setError(
          res.error === 'no_future_occurrence'
            ? 'Set a date first — a published activity needs an upcoming date before it can go public. Use the Schedule section above.'
            : 'Could not update visibility. Please try again.',
        )
      }
    })
  }

  const options: { value: Visibility; icon: typeof Lock; title: string; desc: string }[] = [
    { value: 'private', icon: Lock, title: 'Private', desc: 'Hidden from Local Activities. Accessible only by invitation or direct link.' },
    { value: 'public', icon: Globe, title: 'Public (Local Activities)', desc: 'Show this Project in Local Activities so people can discover and join it.' },
  ]

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <h2 className="text-base font-bold text-slate-900">Visibility</h2>
      <p className="mt-0.5 text-sm text-slate-600">Choose who can discover this Project once it&rsquo;s published.</p>

      <div className="mt-4 space-y-2">
        {options.map(({ value, icon: Icon, title, desc }) => {
          const selected = visibility === value
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                selected ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50'
              } ${pending ? 'opacity-70' : ''}`}
            >
              <input
                type="radio"
                name={`visibility-${projectId}`}
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

      <p className="mt-3 text-xs text-slate-400">
        A Project appears in Local Activities only when it is both <span className="font-medium">published</span> and{' '}
        <span className="font-medium">public</span>.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

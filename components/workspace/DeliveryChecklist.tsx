'use client'

// Interactive delivery checklist — the delivery operational surface. Each component shows its kind, label,
// detail, current status, and assignee, with buttons for the allowed next statuses and a small assignee input.
// Actions call the runtime-validated server actions and refresh on success so the workspace reloads with the
// persisted delivery state. No new model/route; no clock/randomness → no hydration mismatch.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateDeliveryStatusAction, assignDeliveryComponentAction } from '@/lib/actions/delivery'
import { ALLOWED_DELIVERY_TRANSITIONS, type DeliveryStatus } from '@/lib/delivery/status'

interface DeliveryItem {
  id: string
  kind: 'resource' | 'role'
  label: string
  detail: string
  status: DeliveryStatus
  assignee: string | null
}

const ACTION_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Reset',
  assigned: 'Assign',
  confirmed: 'Confirm',
  delivered: 'Deliver',
}

export function DeliveryChecklist({
  items,
  projectId,
  locale,
}: {
  items: DeliveryItem[]
  projectId: string
  locale: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  function run(action: () => Promise<{ ok: boolean; reason?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res.ok) router.refresh()
      else setError(`Could not update: ${(res.reason ?? 'error').replace(/_/g, ' ')}`)
    })
  }

  return (
    <div>
      <ul className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <span className="min-w-0">
              <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{item.kind}</span>{' '}
              <span>{item.label}</span>
              {item.detail && <span className="text-xs text-slate-400"> — {item.detail}</span>}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                defaultValue={item.assignee ?? ''}
                placeholder="Assignee"
                onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                className="w-28 rounded border border-slate-300 px-2 py-0.5 text-xs"
              />
              <button
                type="button"
                onClick={() => run(() => assignDeliveryComponentAction(projectId, item.id, drafts[item.id] ?? item.assignee ?? '', locale))}
                disabled={pending}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Save
              </button>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{item.status}</span>
              {ALLOWED_DELIVERY_TRANSITIONS[item.status].map((to) => (
                <button
                  key={to}
                  type="button"
                  onClick={() => run(() => updateDeliveryStatusAction(projectId, item.id, to, locale))}
                  disabled={pending}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {ACTION_LABEL[to]}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

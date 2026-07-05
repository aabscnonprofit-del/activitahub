'use client'

// Interactive execution checklist — the first operational surface. Each item shows its status and the buttons
// for the base-allowed next statuses (ALLOWED_TRANSITIONS). Clicking calls the server action, which re-checks
// ALL runtime rules (valid transition + trigger + prerequisites) and persists; on success the router refreshes
// so the workspace reloads with the persisted status; a rejection is shown inline. No new model/route.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateExecutionStatusAction } from '@/lib/actions/execution'
import { ALLOWED_TRANSITIONS } from '@/lib/execution/runtime'
import type { MonitoringStatus } from '@/lib/execution/status'

interface ChecklistItem {
  id: string
  label: string
  status: MonitoringStatus
}

const ACTION_LABEL: Record<MonitoringStatus, string> = {
  active: 'Start',
  completed: 'Complete',
  blocked: 'Block',
  pending: 'Reset',
}

export function ExecutionChecklist({
  items,
  projectId,
  locale,
}: {
  items: ChecklistItem[]
  projectId: string
  locale: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(itemId: string, to: MonitoringStatus) {
    setError(null)
    startTransition(async () => {
      const res = await updateExecutionStatusAction(projectId, itemId, to, locale)
      if (res.ok) router.refresh()
      else setError(`Could not update: ${res.reason.replace(/_/g, ' ')}`)
    })
  }

  return (
    <div>
      <ul className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2">
            <span>{item.label}</span>
            <span className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                {item.status}
              </span>
              {ALLOWED_TRANSITIONS[item.status].map((to) => (
                <button
                  key={to}
                  type="button"
                  onClick={() => change(item.id, to)}
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

'use client'

// Interactive execution checklist — the operational surface. Each item shows its status, the buttons for the
// base-allowed next statuses (ALLOWED_TRANSITIONS), and its activation readiness: a pending item that cannot be
// started yet hides "Start" and shows WHY (waiting on prerequisites / earlier items / an automatic trigger).
// Clicking calls the server action, which re-checks ALL runtime rules and persists; on success the router
// refreshes so the workspace reloads with the persisted status. No new model/route.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateExecutionStatusAction } from '@/lib/actions/execution'
import { ALLOWED_TRANSITIONS } from '@/lib/execution/runtime'
import type { MonitoringStatus } from '@/lib/execution/status'
import type { ItemActivationReadiness } from '@/lib/execution/readiness'

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

const BLOCK_LABEL: Record<NonNullable<ItemActivationReadiness['blockedReason']>, string> = {
  prerequisites_incomplete: 'Waiting on prerequisites',
  after_item_incomplete: 'Waiting on earlier items',
  trigger_not_bound: 'Starts automatically',
  invalid_transition: 'Not startable yet',
}

export function ExecutionChecklist({
  items,
  readiness,
  projectId,
  locale,
}: {
  items: ChecklistItem[]
  readiness: Record<string, ItemActivationReadiness>
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
        {items.map((item) => {
          const r = readiness[item.id]
          const blocked = item.status === 'pending' && r && !r.canStart
          return (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span>{item.label}</span>
              <span className="flex items-center gap-2">
                {blocked && r.blockedReason && (
                  <span className="text-[10px] font-medium text-amber-600">{BLOCK_LABEL[r.blockedReason]}</span>
                )}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {item.status}
                </span>
                {ALLOWED_TRANSITIONS[item.status].map((to) => {
                  // Gate the "Start" action on live readiness so the UI never offers a rejected transition.
                  if (to === 'active' && r && !r.canStart) return null
                  return (
                    <button
                      key={to}
                      type="button"
                      onClick={() => change(item.id, to)}
                      disabled={pending}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {ACTION_LABEL[to]}
                    </button>
                  )
                })}
              </span>
            </li>
          )
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

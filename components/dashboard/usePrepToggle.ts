'use client'

import { useState } from 'react'
import { savePrepState } from '@/lib/actions/opePlans'
import { toggleId } from '@/lib/workspace/prep'
import type { OpePlanPrepState, SavedPlan } from '@/lib/types'

// WP7 — shared client helper for the preparation lenses (tasks/risks/resources).
// Flips one id in one prep_state list, persists the FULL next prep_state via
// savePrepState() (current-plan-only; no engine call), and lifts the updated
// SavedPlan so the readiness strip recomputes. A single in-flight guard keeps
// rapid toggles from racing/overwriting each other.

type PrepField = 'tasks_done' | 'risks_handled' | 'resources_sourced'

export function usePrepToggle(plan: SavedPlan, onUpdated: (p: SavedPlan) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  async function toggle(field: PrepField, id: string) {
    if (pendingId) return
    setPendingId(id)
    setFailed(false)
    const next: OpePlanPrepState = { ...plan.prep_state, [field]: toggleId(plan.prep_state?.[field], id) }
    try {
      const res = await savePrepState(plan.id, next)
      if (res.success && res.data) onUpdated(res.data)
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPendingId(null)
    }
  }

  return { pendingId, failed, toggle }
}

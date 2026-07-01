'use client'

// EventPlanV2Handoff — the non-'planned' feasibility view (Stage 6B of the Planning Layer Migration).
//
// Presentation ONLY. When Planning Engine V2's feasibility verdict is not 'planned' (e.g.
// 'needs_human_decision'), the request can't be turned into a prepared event yet. This renders the
// engine's own feasibility statement + the assumptions it surfaced — it does NO planning and reads
// NO legacy OPE output. It replaces the legacy coverage/clarification handoff screens.

import { Compass, Info } from 'lucide-react'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

export default function EventPlanV2Handoff({ plan }: { plan: EventPlanV2 }) {
  const { feasibility, assumptions } = plan

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <Compass className="h-4 w-4" />
          A bit more to decide
        </div>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Let&apos;s shape this together</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200">{feasibility.notes}</p>
      </div>

      {assumptions.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-500" />
            <h3 className="font-bold text-slate-900">What we&apos;d assume to proceed</h3>
          </div>
          <ul className="space-y-2">
            {assumptions.map((a, i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{a.statement}</span>
                <span className="text-slate-500"> — {a.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
